"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Edit, Trash2, Building2, Mail, BadgeCheck } from "lucide-react";
import { useState } from "react";

type Division = {
    id: string;
    name: string;
    code: string | null;
    layer: number;
    parent_id: string | null;
};

type Employee = {
    id: string;
    name: string;
    email: string;
    app_role: string;
    division_id: string | null;
    is_manager: boolean;
};

interface EmployeeListProps {
    employees: Employee[];
    divisions: Division[];
}

const ROLE_LABELS: Record<string, string> = {
    hr_manager: "人事マネージャー",
    hr: "人事",
    manager: "マネージャー",
    employee: "一般",
};

export default function EmployeeList({ employees, divisions }: EmployeeListProps) {
    const [filter, setFilter] = useState<string>("all");

    // 部署でグループ化
    const grouped = employees.reduce((acc, emp) => {
        const key = emp.division_id || "unassigned";
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(emp);
        return acc;
    }, {} as Record<string, Employee[]>);

    const filteredDivisions = filter === "all" 
        ? Object.keys(grouped)
        : [filter];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            登録済み従業員
                        </CardTitle>
                        <CardDescription>
                            {employees.length}名の従業員が登録されています
                        </CardDescription>
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm"
                    >
                        <option value="all">全ての部署</option>
                        <option value="unassigned">未割り当て</option>
                        {divisions.map(div => (
                            <option key={div.id} value={div.id}>
                                {div.code ? `${div.code} - ` : ''}{div.name}
                            </option>
                        ))}
                    </select>
                </div>
            </CardHeader>
            <CardContent>
                {employees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-sm">従業員がまだ登録されていません</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredDivisions.map(divisionId => {
                            const divisionEmployees = grouped[divisionId] || [];
                            const division = divisions.find(d => d.id === divisionId);
                            const divisionName = divisionId === "unassigned"
                                ? "未割り当て"
                                : division?.name || "不明な部署";

                            return (
                                <div key={divisionId} className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
                                        <Building2 className="h-4 w-4" />
                                        <span className="text-gray-500">{division?.code || ''}</span>
                                        <span>{divisionName}</span>
                                        <span className="text-gray-400">({divisionEmployees.length}人)</span>
                                    </div>
                                    <div className="space-y-2">
                                        {divisionEmployees.map(emp => {
                                            const empDivision = divisions.find(d => d.id === emp.division_id);
                                            
                                            return (
                                                <div
                                                    key={emp.id}
                                                    className="flex items-center gap-4 p-3 bg-white border rounded-lg hover:shadow-sm transition-all"
                                                >
                                                    <div className="flex-1 grid grid-cols-[200px,250px,200px,120px] gap-4 items-center">
                                                        <div className="font-medium text-sm truncate">
                                                            {emp.name}
                                                        </div>
                                                        <div className="text-xs text-gray-600 flex items-center gap-1 truncate">
                                                            <Mail className="h-3 w-3 flex-shrink-0" />
                                                            <span className="truncate">{emp.email}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-600 truncate">
                                                            {empDivision ? (
                                                                <>
                                                                    {empDivision.code && (
                                                                        <span className="text-gray-400">{empDivision.code} - </span>
                                                                    )}
                                                                    {empDivision.name}
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-400">未割り当て</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-600 flex items-center gap-1">
                                                            {emp.is_manager && (
                                                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600" title="マネージャー">
                                                                    <BadgeCheck className="h-3.5 w-3.5" />
                                                                </div>
                                                            )}
                                                            <span>{ROLE_LABELS[emp.app_role] || emp.app_role}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0"
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
