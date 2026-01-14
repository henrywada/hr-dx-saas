export type Division = {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  layer: number;
  created_at: string;
  updated_at: string;
  children?: Division[]; // UI表示用の拡張フィールド
};
