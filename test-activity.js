const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:55321';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
});

async function run() {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 14);
    const startDateString = pastDate.toISOString().split('T')[0];

    console.log('startDateString:', startDateString);

    const { data, error } = await supabase
      .from('access_logs')
      .select('created_at')
      .gte('created_at', startDateString)
      .limit(10); 
    
    console.log('Error:', error);
    console.log('Data:', data);
}
run();
