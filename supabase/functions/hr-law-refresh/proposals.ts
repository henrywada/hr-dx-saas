import { searchTopicUrls } from './openrouter.ts'
import { normalizeTopicKey } from './topic-key.ts'

const DISCOVER_QUERY = '労働 改正 通達 ガイドライン'
const MAX_PROPOSALS = 3

export type ProposalUpsertResult = {
  created: number
  errors: string[]
}

/** 厚労省系新着探索から監視トピック候補を pending upsert */
export async function discoverMhlwTopicProposals(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  apiKey: string
): Promise<ProposalUpsertResult> {
  const errors: string[] = []
  let created = 0

  const { data: enabledSources } = await supabase
    .from('hr_law_sources')
    .select('topic')
    .eq('enabled', true)

  const enabledKeys = new Set(
    (enabledSources ?? []).map((s: { topic: string }) => normalizeTopicKey(s.topic))
  )

  let hits: { title: string; url: string; snippet: string }[] = []
  try {
    hits = await searchTopicUrls(apiKey, '労働法令の改正・通達', DISCOVER_QUERY, 5)
  } catch (e) {
    errors.push(`新着探索失敗: ${e instanceof Error ? e.message : String(e)}`)
    return { created, errors }
  }

  // ヒットからトピック候補を簡易生成（タイトル先頭をトピック名に）
  const candidates: { topic: string; search_query: string; evidence: Record<string, unknown> }[] =
    []
  for (const hit of hits) {
    const topic = (hit.title || '').replace(/\s*[-|｜].*$/, '').trim().slice(0, 40)
    if (!topic) continue
    const key = normalizeTopicKey(topic)
    if (!key || enabledKeys.has(key)) continue
    if (candidates.some(c => normalizeTopicKey(c.topic) === key)) continue
    candidates.push({
      topic,
      search_query: `${topic} 改正 通達`,
      evidence: { urls: [hit.url], titles: [hit.title], snippets: [hit.snippet] },
    })
    if (candidates.length >= MAX_PROPOSALS) break
  }

  for (const c of candidates) {
    const topic_key = normalizeTopicKey(c.topic)
    const { data: existing } = await supabase
      .from('hr_law_topic_proposals')
      .select('id, score')
      .eq('topic_key', topic_key)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('hr_law_topic_proposals')
        .update({
          evidence: c.evidence,
          score: Math.max(existing.score ?? 0, 1),
          updated_at: new Date().toISOString(),
          search_query: c.search_query,
          topic: c.topic,
        })
        .eq('id', existing.id)
      if (error) errors.push(`提案更新失敗 ${c.topic}: ${error.message}`)
      else created++
    } else {
      const { error } = await supabase.from('hr_law_topic_proposals').insert({
        topic: c.topic,
        topic_key,
        search_query: c.search_query,
        source: 'mhlw_discover',
        evidence: c.evidence,
        score: 1,
        status: 'pending',
      })
      if (error) errors.push(`提案登録失敗 ${c.topic}: ${error.message}`)
      else created++
    }
  }

  return { created, errors }
}

/** チャット themes を pending 提案へ upsert（template-mining からも利用可） */
export async function upsertChatThemeProposals(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  themes: { topic: string; count: number; sampleQuestions?: string[] }[]
): Promise<ProposalUpsertResult> {
  const errors: string[] = []
  let created = 0

  const { data: enabledSources } = await supabase
    .from('hr_law_sources')
    .select('topic')
    .eq('enabled', true)
  const enabledKeys = new Set(
    (enabledSources ?? []).map((s: { topic: string }) => normalizeTopicKey(s.topic))
  )

  for (const t of themes) {
    const topic_key = normalizeTopicKey(t.topic)
    if (!topic_key || enabledKeys.has(topic_key)) continue

    const { data: existing } = await supabase
      .from('hr_law_topic_proposals')
      .select('id')
      .eq('topic_key', topic_key)
      .eq('status', 'pending')
      .maybeSingle()

    const row = {
      topic: t.topic.slice(0, 80),
      topic_key,
      search_query: `${t.topic} 改正 通達 ガイドライン`,
      source: 'chat' as const,
      evidence: { sampleQuestions: (t.sampleQuestions ?? []).slice(0, 5), count: t.count },
      score: t.count,
      status: 'pending' as const,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error } = await supabase
        .from('hr_law_topic_proposals')
        .update(row)
        .eq('id', existing.id)
      if (error) errors.push(`chat提案更新失敗 ${t.topic}: ${error.message}`)
      else created++
    } else {
      const { error } = await supabase.from('hr_law_topic_proposals').insert(row)
      if (error) errors.push(`chat提案登録失敗 ${t.topic}: ${error.message}`)
      else created++
    }
  }

  return { created, errors }
}
