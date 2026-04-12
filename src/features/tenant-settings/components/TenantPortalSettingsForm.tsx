'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const emailSchema = z.union([z.literal(''), z.string().trim().email('有効なメールアドレスを入力してください')])

type Props = {
  initialHrInquiryEmail: string | null
}

export function TenantPortalSettingsForm({ initialHrInquiryEmail }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState(() => initialHrInquiryEmail ?? '')
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSave = async () => {
    setFlash(null)
    setFieldError(null)
    const trimmed = email.trim()
    const parsed = emailSchema.safeParse(trimmed)
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? '入力を確認してください'
      setFieldError(msg)
      return
    }

    setSaving(true)
    const { error } = await supabase.rpc('upsert_tenant_portal_settings', {
      p_hr_inquiry_email: trimmed === '' ? null : trimmed,
    })
    setSaving(false)

    if (error) {
      setFlash({ type: 'error', text: error.message || '保存に失敗しました。' })
      return
    }

    setFlash({ type: 'success', text: '保存しました' })
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

  return (
    <div className="space-y-6">
      {flash && (
        <div
          role="status"
          className={
            flash.type === 'success'
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'
              : 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'
          }
        >
          {flash.text}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="hr_inquiry_email" className="text-sm font-medium text-slate-700">
            お問合せ先の人事メールアドレス
          </label>
          <input
            id="hr_inquiry_email"
            type="email"
            autoComplete="email"
            placeholder="hr@example.com"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldError}
            disabled={saving}
          />
          {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            従業員がポータル「人事へのお問合せ」からメール送信するときの宛先です。空欄のまま保存すると、サーバー環境変数（
            <code className="rounded bg-slate-100 px-1">HR_INQUIRY_EMAIL</code> または{' '}
            <code className="rounded bg-slate-100 px-1">HR_ALERT_EMAIL_DEFAULT</code>
            ）の値が使われます。
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="primary" disabled={saving} onClick={() => void handleSave()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                保存中…
              </>
            ) : (
              '保存'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
