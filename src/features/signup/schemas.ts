import { z } from 'zod'

export const step1Schema = z.object({
  applicantName: z.string().min(1, '申込者氏名は必須です'),
  companyName: z.string().min(1, '会社名は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().optional(),
})

export const signupSchema = step1Schema.extend({
  plan: z.enum(['free', 'pro', 'enterprise']),
  paymentIntentId: z.string().optional(),
})

export type Step1Input = z.infer<typeof step1Schema>
export type SignupInput = z.infer<typeof signupSchema>
