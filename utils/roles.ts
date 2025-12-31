export const ROLES = {
    MEMBER: "member",
    HR: "hr",
    HR_MANAGER: "hr_manager",
    DOCTOR: "doctor",
    COMPANY_NURSE: "company_nurse",
    BOSS: "boss",
    DEVELOPER: "developer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
    [ROLES.MEMBER]: "従業員",
    [ROLES.HR]: "人事",
    [ROLES.HR_MANAGER]: "人事マネージャー",
    [ROLES.DOCTOR]: "産業医",
    [ROLES.COMPANY_NURSE]: "保健師",
    [ROLES.BOSS]: "上司",
    [ROLES.DEVELOPER]: "開発者",
};

export const getRoleLabel = (role: string | null | undefined): string => {
    if (!role) return "";
    // Check if role is a valid Role, otherwise return the original string or empty
    const label = ROLE_LABELS[role as Role];
    return label || role;
};
