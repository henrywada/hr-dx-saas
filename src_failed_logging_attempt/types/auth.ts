cat << 'EOF' > src/types/auth.ts
export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
  tenant_id?: string;
}

export interface AuthSession {
  user: AuthUser;
  expires?: string;
}
EOF