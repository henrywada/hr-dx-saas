/** imsmanifest.xml から SCORM 1.2 起動パスを抽出する */
export function parseScorm12LaunchPath(manifestXml: string): string | null {
  const normalized = manifestXml.replace(/\s+/g, ' ')
  const resourceMatch = normalized.match(
    /<resource[^>]*adlcp:scormtype=["']sco["'][^>]*href=["']([^"']+)["']/i,
  )
  if (resourceMatch?.[1]) return resourceMatch[1]
  const fallback = normalized.match(/<resource[^>]*href=["']([^"']+)["']/i)
  return fallback?.[1] ?? null
}
