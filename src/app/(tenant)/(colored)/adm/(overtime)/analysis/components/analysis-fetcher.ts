export async function analysisJsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json: unknown = await res.json()
  if (!res.ok) {
    const msg =
      typeof json === 'object' &&
      json !== null &&
      'error' in json &&
      typeof (json as { error: unknown }).error === 'string'
        ? (json as { error: string }).error
        : '読み込みに失敗しました'
    throw new Error(msg)
  }
  return json as T
}
