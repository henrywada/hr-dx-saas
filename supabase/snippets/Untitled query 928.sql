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
  AND ps.employee_id IN (
    '9c679328-ce0f-4725-ad7e-9d0093428459',
    'a41accf4-320b-407d-8c53-2d34b071b0ab',
    '7ba9e5df-315b-45f4-8189-8260b910e95f'
  )
LIMIT 3;