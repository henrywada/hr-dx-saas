"use client";

import React from 'react';
import { AlertTriangle, User } from 'lucide-react';
import type { Division, EmployeeSummary } from '../types';
import { EmployeeAssignSelect } from './EmployeeAssignSelect';

interface UnassignedEmployeesProps {
  employees: EmployeeSummary[];
  divisions: Division[];
}

export function UnassignedEmployees({ employees, divisions }: UnassignedEmployeesProps) {
  if (employees.length === 0) return null;

  return (
    <div className="mt-4 border-t-2 border-dashed border-amber-300 pt-4">
      <div className="flex items-center gap-2 mb-3 px-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold text-amber-700">
          未所属の従業員 ({employees.length}名)
        </span>
      </div>
      <div className="space-y-1 px-2">
        {employees.map(emp => (
          <div
            key={emp.id}
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-amber-50 transition-colors group"
          >
            <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-500 font-mono w-16 shrink-0">
              {emp.employee_no || '---'}
            </span>
            <span className="text-sm text-slate-700 flex-1 truncate">
              {emp.name || '名前未設定'}
            </span>
            {emp.job_title && (
              <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
                {emp.job_title}
              </span>
            )}
            <EmployeeAssignSelect
              employeeId={emp.id}
              currentDivisionId={null}
              divisions={divisions}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
