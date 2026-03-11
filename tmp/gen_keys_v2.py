import hmac
import hashlib
import base64
import json
import time

secret = 'super-secret-jwt-key-for-local-development-must-be-at-least-thirty-two-characters-long'.encode()
exp = 1983812996

def gen_token(payload):
    header = {"alg": "HS256", "typ": "JWT"}
    
    # Base64 Encode Header
    header_json = json.dumps(header, separators=(',', ':')).encode()
    header_b64 = base64.urlsafe_b64encode(header_json).decode().replace('=', '')
    
    # Base64 Encode Payload
    payload_json = json.dumps(payload, separators=(',', ':')).encode()
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode().replace('=', '')
    
    # Signature
    signature_base = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(secret, signature_base, hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode().replace('=', '')
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

# Anon
anon_payload = {
    "iss": "supabase-demo",
    "role": "anon",
    "aud": "authenticated",
    "exp": exp
}
anon_key = gen_token(anon_payload)

# Service Role
service_payload = {
    "iss": "supabase-demo",
    "role": "service_role",
    "aud": "authenticated",
    "exp": exp
}
service_key = gen_token(service_payload)

print(f"NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}")
print(f"SUPABASE_SERVICE_ROLE_KEY={service_key}")
print(f"Length: {len(service_key)}")
