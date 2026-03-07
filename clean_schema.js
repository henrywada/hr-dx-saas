const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'supabase', 'migrations', '20260307000000_init_schema.sql');
let content = fs.readFileSync(schemaPath, 'utf8');

// OWNER TO 関連のステートメントを除去
const lines = content.split('\n');
const cleanedLines = lines.filter(line => !line.includes('OWNER TO "supabase_admin"') && !line.includes('OWNER TO "postgres"'));

fs.writeFileSync(schemaPath, cleanedLines.join('\n'));
console.log('Skipped OWNER TO lines successfully.');
