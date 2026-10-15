import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iolczictykavzenlgfzd.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iOX4LZ0EurEJoZC0Zu_zOg_um7choMl'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
