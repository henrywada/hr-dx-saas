-- el_slides.content 内に混在していた「【字幕】要点」を transcript 列へ分離する。
-- content は本文のみに整える。冪等: 既に transcript がある行・マーカー無し行は対象外。
-- ローカルで実行・検証済み（content_still_has_marker=0 / transcript_filled=33）。
update public.el_slides
set
  transcript = ltrim(replace(substring(content from position('【字幕】' in content)), '【字幕】', '')),
  content    = rtrim(regexp_replace(left(content, position('【字幕】' in content) - 1), '[\s-]+$', ''))
where content like '%【字幕】%'
  and transcript is null;
