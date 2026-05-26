export type PlanType = 'free' | 'pro' | 'enterprise'

export interface SignupStep1Data {
  applicantName: string
  companyName: string
  email: string
  phone?: string
}

export interface SignupFormData extends SignupStep1Data {
  plan: PlanType
  /** pro/enterprise のみ: Stripe PaymentIntent の client_secret */
  paymentIntentClientSecret?: string
  /** pro/enterprise のみ: PaymentIntent ID（Webhook 冪等性確保用） */
  paymentIntentId?: string
  /** enterprise のみ: 銀行振込指示情報 */
  bankTransferInstructions?: BankTransferInstructions
}

export interface BankTransferInstructions {
  bankName: string
  branchName?: string
  accountType: string
  accountNumber: string
  accountHolderName: string
  dueDate: string
  amount: number
}

export interface SignupActionResult {
  success: boolean
  error?: string
  /** 完了後のリダイレクト先 */
  redirectTo?: string
}

/** プランごとの設定値 */
export const PLAN_CONFIG: Record<
  PlanType,
  {
    label: string
    maxEmployees: number
    /** テナント登録直後の status */
    initialStatus: 'active' | 'pending'
    paymentMethod: 'free' | 'card' | 'bank_transfer'
    paymentStatus: 'paid' | 'pending_transfer' | 'unpaid'
    /** contract_end_at を登録日から何ヶ月後にするか（null = 無制限） */
    contractMonths: number | null
  }
> = {
  free: {
    label: '無料プラン',
    maxEmployees: 30,
    initialStatus: 'active',
    paymentMethod: 'free',
    paymentStatus: 'unpaid',
    contractMonths: 3,
  },
  pro: {
    label: 'プロプラン',
    maxEmployees: 100,
    initialStatus: 'active',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    contractMonths: 12,
  },
  enterprise: {
    label: 'エンタープライズプラン',
    maxEmployees: 9999,
    initialStatus: 'pending',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'pending_transfer',
    contractMonths: null,
  },
}
