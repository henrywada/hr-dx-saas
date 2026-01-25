export type Division = {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  layer: number;
  created_at: string;
  updated_at: string;
  children?: Division[];
};

export type Employee = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  app_role: string;
  division_id: string | null;
  created_at: string;
  updated_at: string;
};
