-- pulse_sessions テーブルに「対応メモ」列を追加
alter table pulse_sessions 
add column resolution_note text;