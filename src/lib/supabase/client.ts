import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'
import { getSupabasePublicConfig, warnIfSupabasePlaceholder } from './public-config'

export const createClient = () => {
  const { url, anonKey, usesPlaceholder } = getSupabasePublicConfig()
  if (usesPlaceholder) {
    warnIfSupabasePlaceholder('browser')
  }
  return createBrowserClient<Database>(url, anonKey)
}
