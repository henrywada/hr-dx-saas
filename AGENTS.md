# AGENTS.md — hr-dx-saas

> プロジェクトの設計方針・アーキテクチャ・コーディング規約は **[CLAUDE.md](./CLAUDE.md)** を参照してください。
> このファイルは Codex / Cursor 向けの差分情報のみ記載します。

---

## Codex / Cursor 固有の注意

- `supabase` は `npx supabase` ではなくグローバルインストール版を使用する（WSL 環境）
- 型チェックは `npm run type-check` で確認してから実装を進める
- 回答・コードコメントは**日本語**で記述する

## 参照先

| 内容 | ファイル |
|------|---------|
| アーキテクチャ・禁止事項・環境変数 | `CLAUDE.md` |
| 常時適用ルール（Cursor） | `.agent/rules/basic.md` |
| UI モーダルデザインルール | `.cursor/rules/help-modal-style.mdc` |
