-- ============================================
-- RESOURCE LIBRARY - SQL SEGURO
-- Solo crea tablas nuevas, no modifica nada existente
-- ============================================

-- Verificar si tablas ya existen
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Contar tablas de Resource Library
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('resource_categories', 'resources', 'resource_progress', 'resource_likes');
    
    IF v_count = 4 THEN
        RAISE NOTICE '✅ Las 4 tablas de Resource Library ya existen. No es necesario crear nada.';
    ELSE
        RAISE NOTICE '⚠️ Faltan % tablas. Creando...', (4 - v_count);
    END IF;
END $$;
