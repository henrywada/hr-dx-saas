const jwt = require('jsonwebtoken');

const secret = 'super-secret-jwt-key-for-local-development-must-be-at-least-thirty-two-characters-long';
const exp = 1983812996; // 以前のEXPを維持

// Anon Key
const anonPayload = {
  iss: 'supabase-demo',
  role: 'anon',
  aud: 'authenticated',
  exp: exp
};
const anonKey = jwt.sign(anonPayload, secret);

// Service Role Key
const servicePayload = {
  iss: 'supabase-demo',
  role: 'service_role',
  aud: 'authenticated',
  exp: exp
};
const serviceKey = jwt.sign(servicePayload, secret);

console.log('--- NEW KEYS (WITH AUD: authenticated) ---');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=' + anonKey);
console.log('SUPABASE_SERVICE_ROLE_KEY=' + serviceKey);
console.log('Length:', serviceKey.length);
