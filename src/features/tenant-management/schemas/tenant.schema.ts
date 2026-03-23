import { z } from 'zod';

/** 契約終了日（任意・空文字は null） */
const contractEndDayField = z
  .union([
    z.literal(''),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '契約終了日の形式が正しくありません'),
  ])
  .transform((v) => (v === '' ? null : v));

/** 新規登録バリデーション */
export const tenantCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'テナント名は必須です')
    .max(100, 'テナント名は100文字以内で入力してください'),
  paid_amount: z
    .number()
    .int('金額は整数で入力してください')
    .min(0, '金額は0以上で入力してください'),
  max_employees: z
    .number()
    .int('最高ユーザ数は整数で入力してください')
    .min(1, '最高ユーザ数は1以上で入力してください'),
  plan_type: z.enum(['free', 'pro', 'enterprise']),
  contract_end_day: contractEndDayField,
  manager_email: z
    .string()
    .min(1, '責任者メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
  manager_name: z
    .string()
    .min(1, '責任者名は必須です')
    .max(100, '責任者名は100文字以内で入力してください'),
});

/** 更新バリデーション */
export const tenantUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'テナント名は必須です')
    .max(100, 'テナント名は100文字以内で入力してください'),
  paid_amount: z
    .number()
    .int('金額は整数で入力してください')
    .min(0, '金額は0以上で入力してください'),
  max_employees: z
    .number()
    .int('最高ユーザ数は整数で入力してください')
    .min(1, '最高ユーザ数は1以上で入力してください'),
  plan_type: z.enum(['free', 'pro', 'enterprise']),
  contract_end_day: contractEndDayField,
});

export type TenantCreateValues = z.output<typeof tenantCreateSchema>;
export type TenantUpdateValues = z.output<typeof tenantUpdateSchema>;
