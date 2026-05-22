ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS hora_inicio_jornada TEXT DEFAULT '';
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS hora_fin_jornada TEXT DEFAULT '';
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS jornada_completa INTEGER DEFAULT 0;
UPDATE daily_records SET jornada_completa = 1 WHERE jornada_completa = 0 AND km_final IS NOT NULL;
