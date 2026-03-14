#!/bin/bash

# Configuration
COOKIES_TXT="$HOME/.nlm/cookies.txt"
COOKIES_JSON="$HOME/.nlm/cookies.json"
NLM="$HOME/.local/bin/nlm"
CONVERT_SCRIPT_DIR="$(dirname "$0")" # Assumes convert_cookies.py is in the same directory

if [ ! -f "$COOKIES_TXT" ] && [ ! -f "$COOKIES_JSON" ]; then
    echo "Error: Neither $COOKIES_TXT nor $COOKIES_JSON found."
    echo "Please export your cookies from notebooklm.google.com using 'Get cookies.txt LOCALLY' extension and save them to one of these locations."
    exit 1
fi

if [ -f "$COOKIES_TXT" ]; then
    echo "Step 1: Converting cookies..."
    python3 "$CONVERT_SCRIPT_DIR/convert_cookies.py" "$COOKIES_TXT" "$COOKIES_JSON"
    if [ $? -ne 0 ]; then
        echo "Failed to convert cookies."
        exit 1
    fi
    echo "Converted successfully to $COOKIES_JSON"
else
    echo "Step 1: Using existing $COOKIES_JSON (Skipping conversion)"
fi

echo "Step 2: Cleaning up existing profile..."
# Pipe 'y' to confirm deletion if prompted, ignore errors if profile doesn't exist
echo "y" | $NLM login profile delete default > /dev/null 2>&1 || true

echo "Step 3: Authenticating with nlm..."
$NLM login --manual --file "$COOKIES_JSON"

echo "Step 4: Verifying authentication..."
$NLM notebook list

if [ $? -eq 0 ]; then
    echo "Success! You are now authenticated with NotebookLM."
else
    echo "Authentication failed. Please try re-exporting your cookies."
    echo "Make sure to:"
    echo "1. Log out and log back in to notebooklm.google.com"
    echo "2. Use 'Get cookies.txt LOCALLY' extension"
    echo "3. Export 'All' cookies or specifically for .google.com and notebooklm.google.com"
fi
