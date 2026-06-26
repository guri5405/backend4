import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export const supabase: SupabaseClient = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
