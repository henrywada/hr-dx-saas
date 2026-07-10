-- hr_law_topic_proposals.source に seo を追加
ALTER TABLE public.hr_law_topic_proposals
  DROP CONSTRAINT IF EXISTS hr_law_topic_proposals_source_check;

ALTER TABLE public.hr_law_topic_proposals
  ADD CONSTRAINT hr_law_topic_proposals_source_check
  CHECK (source IN ('chat', 'mhlw_discover', 'seo'));

COMMENT ON TABLE public.hr_law_topic_proposals IS
  '監視トピック候補。チャット需要・厚労省新着・SEOキー分析から提案し、SaaS管理者が承認して hr_law_sources へ反映する';
