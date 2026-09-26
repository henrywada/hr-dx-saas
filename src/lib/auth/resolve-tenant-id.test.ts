import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTenantId } from './resolve-tenant-id'

type Result = { data: { tenant_id?: string } | null; error: { message: string } | null }

/** employees 問い合わせ用の偽 Supabase クライアント */
function fakeSupabase(result: Result) {
  const single = mock.fn(async () => result)
  const eq = mock.fn(() => ({ single }))
  const select = mock.fn(() => ({ eq }))
  const from = mock.fn(() => ({ select }))
  return { client: { from } as never, from }
}

describe('resolveTenantId', () => {
  it('user_metadata の tenant_id を優先し DB を問い合わせない', async () => {
    const { client, from } = fakeSupabase({ data: null, error: null })
    const r = await resolveTenantId(client, { id: 'u1', user_metadata: { tenant_id: 't-meta' } })
    assert.deepEqual(r, { tenantId: 't-meta', failed: false })
    assert.equal(from.mock.callCount(), 0)
  })

  it('metadata に無ければ employees から補完する', async () => {
    const { client } = fakeSupabase({ data: { tenant_id: 't-emp' }, error: null })
    const r = await resolveTenantId(client, { id: 'u1', user_metadata: {} })
    assert.deepEqual(r, { tenantId: 't-emp', failed: false })
  })

  it('DB エラー時は failed: true を返す', async () => {
    const { client } = fakeSupabase({ data: null, error: { message: 'boom' } })
    const r = await resolveTenantId(client, { id: 'u1' })
    assert.deepEqual(r, { tenantId: null, failed: true })
  })

  it('行が無い場合は tenantId null・failed false', async () => {
    const { client } = fakeSupabase({
      data: null,
      error: { message: 'no rows', code: 'PGRST116' } as never,
    })
    const r = await resolveTenantId(client, { id: 'u1' })
    assert.deepEqual(r, { tenantId: null, failed: false })
  })
})
