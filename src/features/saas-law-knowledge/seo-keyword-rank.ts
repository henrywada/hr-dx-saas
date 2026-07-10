/** トピック正規化（監視トピック突合用） */
export function normalizeSeoTopicKey(topic: string): string {
  return topic
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000_\-・/／|｜,，.。:：;；()（）\[\]【】「」『』"'`]+/g, '')
    .trim()
}

export type RankedSeoKeyword = {
  topic: string
  topicKey: string
  hitCount: number
  rank: number
}

/** 関連語を集計し TOP N を返す（シード語は除外） */
export function rankSeoKeywords(
  rawTerms: string[],
  options: { seedKeys: Set<string>; limit?: number }
): RankedSeoKeyword[] {
  const limit = options.limit ?? 10
  const counts = new Map<string, { topic: string; hitCount: number }>()

  for (const raw of rawTerms) {
    const topic = (raw ?? '').trim()
    if (!topic) continue
    const topicKey = normalizeSeoTopicKey(topic)
    if (!topicKey || options.seedKeys.has(topicKey)) continue
    const prev = counts.get(topicKey)
    if (prev) prev.hitCount += 1
    else counts.set(topicKey, { topic, hitCount: 1 })
  }

  return [...counts.entries()]
    .map(([topicKey, v]) => ({ topicKey, topic: v.topic, hitCount: v.hitCount }))
    .sort((a, b) => b.hitCount - a.hitCount || a.topic.localeCompare(b.topic, 'ja'))
    .slice(0, limit)
    .map((item, i) => ({ ...item, rank: i + 1 }))
}
