/** トピック名を重複判定用キーに正規化 */
export function normalizeTopicKey(topic: string): string {
  return topic
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000_\-・/／|｜,，.。:：;；()（）\[\]【】「」『』"'`]+/g, '')
    .trim()
}
