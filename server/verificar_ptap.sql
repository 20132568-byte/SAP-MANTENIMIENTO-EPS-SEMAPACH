-- Verificar cuántos registros hay por mes en ptap_readings
SELECT 
    EXTRACT(MONTH FROM fecha) as mes,
    COUNT(*) as total_registros,
    COUNT(DISTINCT fecha) as dias_con_registros
FROM ptap_readings 
WHERE fecha >= '2026-01-01' AND fecha <= '2026-04-30'
GROUP BY EXTRACT(MONTH FROM fecha)
ORDER BY mes;

-- Ver registros de febrero
SELECT fecha, hora, caudal 
FROM ptap_readings 
WHERE fecha >= '2026-02-01' AND fecha <= '2026-02-28'
ORDER BY fecha, hora
LIMIT 20;

-- Ver registros de marzo
SELECT fecha, hora, caudal 
FROM ptap_readings 
WHERE fecha >= '2026-03-01' AND fecha <= '2026-03-31'
ORDER BY fecha, hora
LIMIT 20;

-- Ver registros de abril
SELECT fecha, hora, caudal 
FROM ptap_readings 
WHERE fecha >= '2026-04-01' AND fecha <= '2026-04-30'
ORDER BY fecha, hora
LIMIT 20;
