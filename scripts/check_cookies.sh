#!/bin/bash
COOKIES_TXT="$HOME/.nlm/cookies.txt"

echo "Checking $COOKIES_TXT..."

if [ ! -f "$COOKIES_TXT" ]; then
    echo "Error: File not found."
    exit 1
fi

echo "--- Header (First 5 lines) ---"
head -n 5 "$COOKIES_TXT"

echo ""
echo "--- Content Analysis ---"
echo "Total lines: $(wc -l < "$COOKIES_TXT")"
echo "Entries for .google.com: $(grep -c "\.google\.com" "$COOKIES_TXT")"
echo "Entries for notebooklm.google.com: $(grep -c "notebooklm\.google\.com" "$COOKIES_TXT")"
echo "Entries with 7 fields (valid Netscape): $(awk -F'\t' 'NF>=7' "$COOKIES_TXT" | wc -l)"

echo ""
echo "--- Sample entries (Anonymized) ---"
grep "\.google\.com" "$COOKIES_TXT" | head -n 3 | awk '{print $1, $6, "(value hidden)"}'
