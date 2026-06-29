'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, Folder, User, Users } from 'lucide-react'
import type { Division, DivisionTreeNode, EmployeeSummary } from '../types'
import { buildDivisionTree, groupEmployeesByDivision } from '../tree-utils'

function TreeNodeRow({ node, depth = 0 }: { node: DivisionTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const hasEmployees = node.employees.length > 0

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <button className="p-0.5 rounded shrink-0">
          {hasChildren || hasEmployees ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )
          ) : (
            <span className="w-4 h-4 inline-block" />
          )}
        </button>

        {expanded && (hasChildren || hasEmployees) ? (
          <FolderOpen className="w-4 h-4 text-[#FD7601] shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-[#FD7601] shrink-0" />
        )}

        <span className="text-sm font-medium text-slate-900 truncate flex-1">
          {node.name || '名前未設定'}
        </span>

        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
          <Users className="w-3 h-3" />
          {node.totalEmployeeCount}
        </span>
      </div>

      {expanded && (
        <div>
          {hasEmployees && (
            <div className="space-y-0.5" style={{ paddingLeft: `${(depth + 1) * 20 + 24}px` }}>
              {node.employees.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 py-1 px-2 rounded">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-mono w-14 shrink-0">
                    {emp.employee_no || '---'}
                  </span>
                  <span className="text-sm text-slate-700 flex-1 truncate">
                    {emp.name || '名前未設定'}
                  </span>
                  {emp.job_title && (
                    <span className="text-xs text-slate-500 shrink-0 hidden md:inline">
                      {emp.job_title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {node.children.map(child => (
            <TreeNodeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface DivisionTreeViewProps {
  divisions: Division[]
  employees: EmployeeSummary[]
  unassignedEmployees: EmployeeSummary[]
}

export function DivisionTreeView({
  divisions,
  employees,
  unassignedEmployees,
}: DivisionTreeViewProps) {
  const employeesByDivision = groupEmployeesByDivision(employees)
  const tree = buildDivisionTree(divisions, employeesByDivision)

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <FolderOpen className="w-4 h-4 text-[#FD7601]" />
          {divisions.length}部署 ・ {employees.length + unassignedEmployees.length}名
        </div>
      </div>

      <div className="p-3 min-h-[120px]">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Folder className="w-10 h-10 mb-3" />
            <p className="text-sm">部署が登録されていません</p>
          </div>
        ) : (
          tree.map(node => <TreeNodeRow key={node.id} node={node} />)
        )}

        {unassignedEmployees.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 py-1.5 px-2 text-xs font-medium text-slate-500">
              <Folder className="w-4 h-4 shrink-0" />
              未所属（{unassignedEmployees.length}名）
            </div>
            <div className="space-y-0.5 pl-9">
              {unassignedEmployees.map(emp => (
                <div key={emp.id} className="flex items-center gap-2 py-1 px-2 rounded">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-mono w-14 shrink-0">
                    {emp.employee_no || '---'}
                  </span>
                  <span className="text-sm text-slate-700 flex-1 truncate">
                    {emp.name || '名前未設定'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
