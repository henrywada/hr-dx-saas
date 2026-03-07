import json
import sys

def netscape_to_json(input_file, output_file):
    cookies = {}
    with open(input_file, 'r') as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            parts = line.strip().split('\t')
            if len(parts) >= 7:
                # domain, flag, path, secure, expiration, name, value
                name = parts[5]
                value = parts[6]
                cookies[name] = value
            elif len(parts) >= 6: 
                 # Handle cases where expiration might be missing or different
                 # But standard Netscape has 7 cols.
                 # Let's try 0-5 key, 6 value
                 name = parts[5]
                 value = parts[6] if len(parts) > 6 else ""
                 cookies[name] = value

    with open(output_file, 'w') as f:
        json.dump(cookies, f, indent=2)

if __name__ == "__main__":
    netscape_to_json(sys.argv[1], sys.argv[2])
