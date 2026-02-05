-- テスト用アラート作成
INSERT INTO pulse_alerts (
    tenant_id,
    employee_id,
    session_id,
    intent_id,
    calculated_score,
    threshold,
    status
)
SELECT 
    ps.tenant_id,
    ps.employee_id,
    ps.id,
    ps.intent_id,
    ps.overall_score,
    pi.alarm_threshold,
    'pending'
FROM pulse_sessions ps
JOIN pulse_intents pi ON ps.intent_id = pi.id
WHERE ps.overall_score < pi.alarm_threshold
  AND ps.employee_id != auth.uid()  -- 自分以外
LIMIT 1;
