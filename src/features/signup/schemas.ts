import { z } from 'zod'
import { isFreeEmailDomain } from './constants/free-email-domains'

export const step1Schema = z.object({
  applicantName: z
    .string()
    .min(1, '申込者氏名は必須です')
    .max(100, '申込者氏名は100文字以内で入力してください'),
  companyName: z
    .string()
    .min(1, '会社名は必須です')
    .max(100, '会社名は100文字以内で入力してください'),
  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .refine(
      v => !isFreeEmailDomain(v),
      '会社のメールアドレスを入力してください（フリーメールアドレスは登録できません）'
    ),
  phone: z.string().optional(),
  industry: z.string().max(100, '業種は100文字以内で入力してください').optional(),
})

export const signupSchema = step1Schema.extend({
  plan: z.enum(['free', 'plan100', 'plan300', 'plan500', 'plan1000']),
  paymentIntentId: z.string().optional(),
})

export type Step1Input = z.infer<typeof step1Schema>
export type SignupInput = z.infer<typeof signupSchema>
