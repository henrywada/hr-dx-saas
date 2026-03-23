'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import type { DepartmentStat } from '../types';

interface DepartmentProgressTreeProps {
  departments: DepartmentStat[];
}

type TreeNode = DepartmentStat & { depth: number; children: TreeNode[] };

/** フラットな部署リストからツリーを構築 */
function buildTree(depts: DepartmentStat[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  depts.forEach(d => {
    map.set(d.id, { ...d, depth: 0, children: [] });
  });

  const roots: TreeNode[] = [];
  depts.forEach(d => {
    const node = map.get(d.id)!;
    if (d.parent_id && map.has(d.parent_id)) {
      map.get(d.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 深さを設定
  function setDepth(nodes: TreeNode[], depth: number) {
    nodes.forEach(n => {
      n.depth = depth;
      setDepth(n.children, depth + 1);
    });
  }
  setDepth(roots, 0);

  // 子を layer, name でソート（未配属は常に最後）
  function sortChildren(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.id === 'unassigned') return 1;
      if (b.id === 'unassigned') return -1;
      const layerA = a.layer ?? 0;
      const layerB = b.layer ?? 0;
      if (layerA !== layerB) return layerA - layerB;
      return (a.name || '').localeCompare(b.name || '', 'ja');
    });
    nodes.forEach(n => sortChildren(n.children));
  }
  sortChildren(roots);

  return roots;
}

/** ツリーノード行コンポーネント */
function TreeNodeRow({
  dept,
  depth,
  expandedIds,
  onToggle,
}: {
  dept: TreeNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = dept.children.length > 0;
  const isExpanded = expandedIds.has(dept.id);
  const isUnassigned = dept.id === 'unassigned';

  return (
    <>
      <tr className="hover:bg-gray-50/50 transition-colors">
        <td className="px-6 py-3">
          <div
            className="flex items-center gap-1.5 text-sm font-medium text-gray-800"
            style={{ paddingLeft: `${depth * 20 + (hasChildren ? 0 : 24)}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => onToggle(dept.id)}
                className="p-0.5 rounded hover:bg-gray-200 transition-colors shrink-0"
                aria-label={isExpanded ? '折りたたむ' : '展開する'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            ) : (
              <span className="w-4 h-4 inline-block shrink-0" />
            )}
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-blue-400 shrink-0" />
              )
            ) : (
              <Folder className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{dept.name}</span>
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-center text-emerald-600 font-semibold">{dept.submitted}</td>
        <td className="px-6 py-3 text-sm text-center text-orange-500 font-semibold">{dept.notSubmitted}</td>
        <td className="px-6 py-3 text-sm text-center text-amber-600 font-semibold">{dept.inProgress ?? 0}</td>
        <td className="px-6 py-3 text-sm text-center font-bold text-gray-800">{dept.rate}%</td>
        <td className="px-6 py-3">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                dept.rate >= 80
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : dept.rate >= 50
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400'
                    : 'bg-gradient-to-r from-red-400 to-orange-400'
              }`}
              style={{ width: `${dept.rate}%` }}
            />
          </div>
        </td>
      </tr>
      {isExpanded &&
        dept.children.map((child: TreeNode) => (
          <TreeNodeRow
            key={child.id}
            dept={child}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

export default function DepartmentProgressTree({ departments }: DepartmentProgressTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    departments.forEach(d => s.add(d.id));
    return s;
  });

  const tree = useMemo(() => buildTree(departments), [departments]);

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (departments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        部署データがありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50/50">
          <tr>
            <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              部署名
            </th>
            <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              受検済み
            </th>
            <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              未受検
            </th>
            <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              否提出
            </th>
            <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              受検率
            </th>
            <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider w-48">
              進捗
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {tree.map(node => (
            <TreeNodeRow
              key={node.id}
              dept={node}
              depth={0}
              expandedIds={expandedIds}
              onToggle={handleToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
