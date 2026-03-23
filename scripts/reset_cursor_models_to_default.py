#!/usr/bin/env python3
"""
Cursor Models のトグル設定を初期値にリセットするスクリプト

使用方法:
1. Cursor を完全に終了してください
2. このスクリプトを実行: python3 scripts/reset_cursor_models_to_default.py
3. Cursor を再起動してください

初期値: Auto, Premium, Composer 1.5 のみ ON
"""

import json
import os
import sqlite3
import sys

# 初期値で ON にするモデル（serverModelName）
DEFAULT_ON_MODELS = {"default", "premium", "composer-1.5"}

# Cursor の state.vscdb のパス（OS 別）
def get_db_path():
    if sys.platform == "win32":
        return os.path.expandvars(
            r"%APPDATA%\Cursor\User\globalStorage\state.vscdb"
        )
    if sys.platform == "darwin":
        return os.path.expanduser(
            "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
        )
    # Linux / WSL
    xdg = os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))
    linux_path = os.path.join(xdg, "Cursor", "User", "globalStorage", "state.vscdb")
    if os.path.exists(linux_path):
        return linux_path
    # WSL から Windows の Cursor にアクセスする場合
    wsl_path = "/mnt/c/Users/user/AppData/Roaming/Cursor/User/globalStorage/state.vscdb"
    if os.path.exists(wsl_path):
        return wsl_path
    return linux_path


def main():
    db_path = get_db_path()
    if not os.path.exists(db_path):
        print(f"エラー: ファイルが見つかりません: {db_path}")
        print("Cursor がインストールされているか確認してください。")
        sys.exit(1)

    print(f"データベース: {db_path}")
    print("Cursor を終了してから実行してください。")
    print()

    try:
        conn = sqlite3.connect(db_path, timeout=10)
        cur = conn.cursor()
        storage_key = "src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.applicationUser"
        cur.execute("SELECT value FROM ItemTable WHERE key = ?", (storage_key,))
        row = cur.fetchone()
        if not row:
            print("エラー: 設定キーが見つかりません。")
            conn.close()
            sys.exit(1)

        data = json.loads(row[0])
        models = data.get("availableDefaultModels2", [])

        # defaultOn をリセット
        for m in models:
            server_name = m.get("serverModelName", m.get("name", ""))
            m["defaultOn"] = server_name in DEFAULT_ON_MODELS

        new_value = json.dumps(data)
        cur.execute("UPDATE ItemTable SET value = ? WHERE key = ?", (new_value, storage_key))
        conn.commit()
        conn.close()

        on_models = [m.get("clientDisplayName") for m in models if m.get("defaultOn")]
        print("✓ リセット完了")
        print(f"  ON のモデル: {', '.join(on_models)}")
        print()
        print("Cursor を再起動して変更を反映してください。")

    except sqlite3.OperationalError as e:
        err_msg = str(e).lower()
        if "locked" in err_msg or "database" in err_msg or "disk i/o" in err_msg:
            print("エラー: データベースがロックされています。")
            print("Cursor を完全に終了してから再度実行してください。")
        else:
            print(f"エラー: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"エラー: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
