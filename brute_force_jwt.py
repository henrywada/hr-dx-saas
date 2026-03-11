import jwt

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

secrets = [
    "super-secret-jwt-token-with-at-least-32-characters-long",
    "super-secret-jwt-token",
    "your-secret-key",
    "supabase-demo-secret",
    "secret",
    "postgres",
    "hr-dx-saas",
    "default-secret"
]

for s in secrets:
    try:
        jwt.decode(token, s, algorithms=["HS256"])
        print(f"FOUND SECRET: {s}")
        break
    except jwt.InvalidSignatureError:
        continue
    except Exception as e:
        # print(f"Error for {s}: {e}")
        pass
else:
    print("NO SECRET FOUND IN LIST")
