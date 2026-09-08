-- 最終レビュー Finding I3（Important）の修正
-- task_comments.parent_comment_id が ON DELETE CASCADE のため、コメント投稿者が
-- 自分の親コメントを削除すると、他人が投稿した返信まで巻き添えで削除されてしまっていた
-- （spec 13.2 の削除権限モデル「投稿者本人、または責任者・マネージャーのみ削除可」に違反）。
-- ON DELETE SET NULL に変更し、親が削除された返信は孤児コメント（ルート扱い）として
-- 残すようにする。comment-tree.ts の buildCommentTree は親が見つからないコメントを
-- 既にルートとして扱う実装になっている（Task 3 でテスト済み: 「存在しないparentCommentIdを
-- 持つコメントはルートとして扱う」）ため、アプリ側の変更は不要。

ALTER TABLE public.task_comments DROP CONSTRAINT task_comments_parent_comment_id_fkey;

ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_parent_comment_id_fkey
  FOREIGN KEY (parent_comment_id) REFERENCES public.task_comments(id) ON DELETE SET NULL;

COMMENT ON CONSTRAINT task_comments_parent_comment_id_fkey ON public.task_comments IS
  '最終レビュー Finding I3 の修正: 以前は ON DELETE CASCADE だったため、
   コメント削除が他人が投稿した返信まで巻き添えで消してしまっていた。
   ON DELETE SET NULL にすることで、親削除時に返信はルートコメントとして残る。';
