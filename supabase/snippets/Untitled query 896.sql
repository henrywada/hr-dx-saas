-- 作成されたアラートを確認
SELECT 
    pa.id,
    e.name as employee_name,
    pa.calculated_score,
    pa.threshold,
    pa.status,
    pi.label as theme,
    pa.created_at
FROM pulse_alerts pa
JOIN employees e ON pa.employee_id = e.id
LEFT JOIN pulse_intents pi ON pa.intent_id = pi.id
WHERE pa.status = 'pending'
ORDER BY pa.created_at DESC;