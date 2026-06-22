"use client";

import React, { useTransition, useMemo } from 'react';
import type { Division } from '../types';
import { buildDivisionPathMap } from '../types';
import { assignEmployeeToDivision } from '../actions';

interface EmployeeAssignSelectProps {
  employeeId: string;
  currentDivisionId: string | null;
  divisions: Division[];
}

export function EmployeeAssignSelect({
  employeeId,
  currentDivisionId,
  divisions,
}: EmployeeAssignSelectProps) {
  const [isPending, startTransition] = useTransition();
  const pathMap = useMemo(() => buildDivisionPathMap(divisions), [divisions]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDivisionId = e.target.value || null;
    if (newDivisionId === currentDivisionId) return;

    startTransition(async () => {
      await assignEmployeeToDivision(employeeId, newDivisionId);
    });
  };

  return (
    <select
      value={currentDivisionId || ''}
      onChange={handleChange}
      disabled={isPending}
      className={`
        text-xs px-2 py-1 border rounded-md bg-white
        focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none
        transition-all cursor-pointer
        ${isPending ? 'opacity-50 cursor-wait' : 'border-[#e2e6ec] hover:border-[#FD7601]'}
      `}
    >
      <option value="">未所属</option>
      {divisions.map(d => (
        <option key={d.id} value={d.id}>
          {pathMap.get(d.id) || d.name}
        </option>
      ))}
    </select>
  );
}
