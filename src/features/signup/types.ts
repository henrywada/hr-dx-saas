export type PlanType = 'free' | 'plan100' | 'plan300' | 'plan500' | 'plan1000'

export interface SignupStep1Data {
  applicantName: string
  companyName: string
  email: string
  phone?: string
  /** 業種（任意入力） */
  industry?: string
}

export interface SignupFormData extends SignupStep1Data {
  plan: PlanType
  /** 有料プランのみ: Stripe PaymentIntent の client_secret */
  paymentIntentClientSecret?: string
  /** 有料プランのみ: PaymentIntent ID（Webhook 冪等性確保用） */
  paymentIntentId?: string
  /** 銀行振込プランのみ: 銀行振込指示情報 */
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
    /** 現在申込可能か（false は LP・サインアップ双方で「準備中」扱い） */
    available: boolean
    /** tenant_service のコピー元テンプレートテナント名（tenants.name） */
    templateTenantName: string
    /**
     * Stripe Price ID を保持する環境変数名（有料プランのみ）。
     * 有料プラン開通時は available: true に切り替え、対応する環境変数を設定する
     */
    stripePriceIdEnv?: string
  }
> = {
  free: {
    label: '無料プラン',
    maxEmployees: 30,
    initialStatus: 'active',
    paymentMethod: 'free',
    paymentStatus: 'unpaid',
    contractMonths: 3,
    available: true,
    templateTenantName: 'PlanFree',
  },
  plan100: {
    label: 'プラン100',
    maxEmployees: 100,
    initialStatus: 'active',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    contractMonths: 12,
    available: false,
    templateTenantName: 'Plan100',
    stripePriceIdEnv: 'STRIPE_PLAN100_PRICE_ID',
  },
  plan300: {
    label: 'プラン300',
    maxEmployees: 300,
    initialStatus: 'active',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    contractMonths: 12,
    available: false,
    templateTenantName: 'Plan300',
    stripePriceIdEnv: 'STRIPE_PLAN300_PRICE_ID',
  },
  plan500: {
    label: 'プラン500',
    maxEmployees: 500,
    initialStatus: 'active',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    contractMonths: 12,
    available: false,
    templateTenantName: 'Plan500',
    stripePriceIdEnv: 'STRIPE_PLAN500_PRICE_ID',
  },
  plan1000: {
    label: 'プラン1000',
    maxEmployees: 1000,
    initialStatus: 'active',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    contractMonths: 12,
    available: false,
    templateTenantName: 'Plan1000',
    stripePriceIdEnv: 'STRIPE_PLAN1000_PRICE_ID',
  },
}
