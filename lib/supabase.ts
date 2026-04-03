import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL または NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY が未設定です')
  return createClient(url, key)
}
