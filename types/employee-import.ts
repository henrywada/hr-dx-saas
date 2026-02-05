export interface ImportEmployeeRow {
    name: string;
    email: string;
    division_code: string;
    role: string; // 'employee' | 'boss' | 'hr_manager' etc.
}

export interface ImportResult {
    success: boolean;
    total: number;
    successCount: number;
    failureCount: number;
    errors: Array<{
        row: number;
        email: string;
        reason: string;
    }>;
}
