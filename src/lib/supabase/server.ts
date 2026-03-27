import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './types'
import { getSupabasePublicConfig, warnIfSupabasePlaceholder } from './public-config'

export const createClient = async () => {
  const cookieStore = await cookies()
  const { url, anonKey, usesPlaceholder } = getSupabasePublicConfig()
  if (usesPlaceholder) {
    warnIfSupabasePlaceholder('server')
  }

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
