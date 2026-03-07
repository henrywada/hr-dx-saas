import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('access_logs')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(10);
  console.log("FIRST 10 LOGS:", data);

  const { data: d2 } = await supabase
    .from('access_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log("LAST 10 LOGS:", d2);
}
check();
