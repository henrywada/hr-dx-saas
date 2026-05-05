"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, Plus, Pencil, Trash2, User, Users } from 'lucide-react';
import type { Division, DivisionTreeNode, EmployeeSummary } from '../types';
import { EmployeeAssignSelect } from './EmployeeAssignSelect';
import { UnassignedEmployees } from './UnassignedEmployees';
import { DivisionFormDialog } from './DivisionFormDialog';

// ============================================================
// ツリー構築ヘルパー
// ============================================================

function buildTree(
  divisions: Division[],
  employeesByDivision: Map<string, EmployeeSummary[]>
): DivisionTreeNode[] {
  const map = new Map<string, DivisionTreeNode>();
  const roots: DivisionTreeNode[] = [];

  // 各ノードを初期化
  divisions.forEach(d => {
    const emps = employeesByDivision.get(d.id) || [];
    map.set(d.id, {
      ...d,
      children: [],
      employeeCount: emps.length,
      totalEmployeeCount: emps.length,
      employees: emps,
    });
  });

  // 親子関係を構築
  divisions.forEach(d => {
    const node = map.get(d.id)!;
    if (d.parent_id && map.has(d.parent_id)) {
      map.get(d.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 子孫合計を計算（再帰）
  function calcTotal(node: DivisionTreeNode): number {
    let total = node.employeeCount;
    for (const child of node.children) {
      total += calcTotal(child);
    }
    node.totalEmployeeCount = total;
    return total;
  }
  roots.forEach(calcTotal);

  /** 兄弟ノードの並び: divisions.code 昇順（numeric）、未入力コードは後方、同順位は layer → 部署名 */
  function compareDivisionTreeSiblings(a: DivisionTreeNode, b: DivisionTreeNode): number {
    const codeA = a.code?.trim() ?? '';
    const codeB = b.code?.trim() ?? '';
    if (codeA && codeB) {
      const cmp = codeA.localeCompare(codeB, 'ja', { numeric: true });
      if (cmp !== 0) return cmp;
    } else if (codeA !== codeB) {
      if (!codeA) return 1;
      if (!codeB) return -1;
    }
    const layerCmp = (a.layer || 0) - (b.layer || 0);
    if (layerCmp !== 0) return layerCmp;
    return (a.name || '').localeCompare(b.name || '', 'ja');
  }

  function sortChildren(node: DivisionTreeNode) {
    node.children.sort(compareDivisionTreeSiblings);
    node.children.forEach(sortChildren);
  }
  roots.sort(compareDivisionTreeSiblings);
  roots.forEach(sortChildren);

  return roots;
}

// ============================================================
// TreeNode コンポーネント（再帰）
// ============================================================

function TreeNodeComponent({
  node,
  allDivisions,
  tenantId,
  depth = 0,
  onOpenDialog,
}: {
  node: DivisionTreeNode;
  allDivisions: Division[];
  tenantId: string;
  depth?: number;
  onOpenDialog: (mode: 'create' | 'edit' | 'delete', division?: Division, parent?: Division) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const hasEmployees = node.employees.length > 0;

  return (
    <div className="select-none">
      {/* Division Row */}
      <div
        className="group flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-blue-50/60 transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 rounded hover:bg-blue-100 transition-colors shrink-0"
        >
          {(hasChildren || hasEmployees) ? (
            expanded
              ? <ChevronDown className="w-4 h-4 text-slate-500" />
              : <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <span className="w-4 h-4 inline-block" />
          )}
        </button>

        {/* Folder Icon */}
        {expanded && (hasChildren || hasEmployees)
          ? <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
          : <Folder className="w-4 h-4 text-blue-400 shrink-0" />
        }

        {/* 部署名（レイヤー番号） */}
        <span
          className="text-sm font-medium text-slate-800 truncate flex-1"
          onClick={() => setExpanded(!expanded)}
        >
          {node.name || '名前未設定'}
          ({node.layer != null ? node.layer : '—'}){' '}[{node.code?.trim() || '—'}]
        </span>

        {/* Employee Count Badge */}
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
          <Users className="w-3 h-3" />
          {node.totalEmployeeCount}
        </span>

        {/* Action Buttons (visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDialog('edit', node); }}
            title="編集"
            className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDialog('create', undefined, node); }}
            title="子部署を追加"
            className="p-1 rounded hover:bg-green-100 text-slate-400 hover:text-green-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDialog('delete', node); }}
            title="削除"
            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div>
          {/* Employees of this node */}
          {hasEmployees && (
            <div className="space-y-0.5" style={{ paddingLeft: `${(depth + 1) * 20 + 24}px` }}>
              {node.employees.map(emp => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="text-xs text-slate-400 font-mono w-14 shrink-0">
                    {emp.employee_no || '---'}
                  </span>
                  <span className="text-sm text-slate-600 flex-1 truncate">
                    {emp.name || '名前未設定'}
                  </span>
                  {emp.job_title && (
                    <span className="text-xs text-slate-400 shrink-0 hidden md:inline">
                      {emp.job_title}
                    </span>
                  )}
                  <EmployeeAssignSelect
                    employeeId={emp.id}
                    currentDivisionId={node.id}
                    divisions={allDivisions}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Child Divisions */}
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              allDivisions={allDivisions}
              tenantId={tenantId}
              depth={depth + 1}
              onOpenDialog={onOpenDialog}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================

interface DivisionTreeProps {
  divisions: Division[];
  employees: EmployeeSummary[];
  unassignedEmployees: EmployeeSummary[];
  tenantId: string;
}

export function DivisionTree({
  divisions,
  employees,
  unassignedEmployees,
  tenantId,
}: DivisionTreeProps) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: 'create' | 'edit' | 'delete';
    division?: Division;
    parent?: Division;
  }>({ open: false, mode: 'create' });

  // 部署ごとの従業員マップを構築
  const employeesByDivision = new Map<string, EmployeeSummary[]>();
  employees.forEach(emp => {
    if (emp.division_id) {
      const list = employeesByDivision.get(emp.division_id) || [];
      list.push(emp);
      employeesByDivision.set(emp.division_id, list);
    }
  });

  const tree = buildTree(divisions, employeesByDivision);

  const openDialog = (mode: 'create' | 'edit' | 'delete', division?: Division, parent?: Division) => {
    setDialogState({ open: true, mode, division, parent });
  };

  const closeDialog = () => {
    setDialogState({ open: false, mode: 'create' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">部署管理</h1>
          <p className="text-sm text-slate-500 mt-1">組織構造をツリー形式で管理できます</p>
        </div>
        <button
          onClick={() => openDialog('create')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          部署を追加
        </button>
      </div>

      {/* Tree Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <FolderOpen className="w-4 h-4 text-blue-500" />
            組織構造
            <span className="text-xs text-slate-400 ml-1">
              ({divisions.length}部署 · {employees.length + unassignedEmployees.length}名)
            </span>
          </div>
        </div>

        <div className="p-3 min-h-[200px]">
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Folder className="w-10 h-10 mb-3" />
              <p className="text-sm">部署が登録されていません</p>
              <button
                onClick={() => openDialog('create')}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                最初の部署を追加する
              </button>
            </div>
          ) : (
            tree.map(node => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                allDivisions={divisions}
                tenantId={tenantId}
                onOpenDialog={openDialog}
              />
            ))
          )}

          {/* Unassigned Employees */}
          <UnassignedEmployees employees={unassignedEmployees} divisions={divisions} />
        </div>
      </div>

      {/* Dialog */}
      <DivisionFormDialog
        open={dialogState.open}
        onClose={closeDialog}
        mode={dialogState.mode}
        division={dialogState.division}
        parentDivision={dialogState.parent}
        allDivisions={divisions}
        tenantId={tenantId}
      />
    </div>
  );
}
