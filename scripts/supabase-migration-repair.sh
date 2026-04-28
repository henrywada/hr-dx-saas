#!/usr/bin/env bash
# ============================================================
# リンク済みリモート DB のマイグレーション履歴を修復する（db push の事前処理）。
#
# supabase db push が「Remote migration versions not found in local」で失敗する場合など、
# CLI の supabase migration repair と同等。リモートには supabase link が必要。
#
# 例: リモートにだけある版を「未適用」に戻す（ゴースト版の除去）
#   npm run supabase:migration-repair -- reverted 20260418000001 20260418000002 20260418000003
#
# 例: 既に手で適用済みの版を履歴にだけ載せる（SQL は再実行されない）
#   npm run supabase:migration-repair -- applied 20260418000000
# ============================================================

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <applied|reverted> <version> [version ...]" >&2
  echo "  See: supabase migration repair --help" >&2
  exit 1
fi

exec supabase migration repair --status "$@"
