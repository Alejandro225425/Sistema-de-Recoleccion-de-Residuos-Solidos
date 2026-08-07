-- Migración idempotente: agregar user_id a trucks para vincular conductor/usuario
-- Se puede ejecutar repetidamente sin error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'trucks'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE trucks
      ADD COLUMN user_id bigint REFERENCES users(id);
    CREATE INDEX IF NOT EXISTS idx_trucks_user_id ON trucks(user_id);
  END IF;
END $$;

-- Sembrar relación para datos existentes cuando exista coincidencia por nombre exacto.
UPDATE trucks t
SET user_id = u.id
FROM users u
WHERE u.role = 'conductor'
  AND u.name = t.driver;

-- Persistir seed idempotente.
INSERT INTO trucks (id, code, driver, status, zone_id, user_id, latitude, longitude) VALUES
  (1, 'C-01', 'Luis Huaman', 'En ruta', 1, NULL, -13.5166000, -71.9789000),
  (2, 'C-02', 'Rosa Ccahuana', 'En ruta', 2, NULL, -13.5256000, -71.9558000),
  (3, 'C-03', 'Mario Quispe', 'Mantenimiento', 3, NULL, -13.5309000, -71.9386000),
  (4, 'C-04', 'Elena Condori', 'En ruta', 5, 4, -13.5350000, -71.9847000)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  driver = EXCLUDED.driver,
  status = EXCLUDED.status,
  zone_id = EXCLUDED.zone_id,
  user_id = EXCLUDED.user_id,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;
