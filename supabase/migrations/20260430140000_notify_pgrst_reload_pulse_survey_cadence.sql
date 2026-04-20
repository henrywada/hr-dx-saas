-- tenant_portal_settings.pulse_survey_cadence 追加後、PostgREST の schema cache を更新する
-- （未更新だと API 経由で「Could not find the 'pulse_survey_cadence' column ... in the schema cache」となる）
NOTIFY pgrst, 'reload schema';
