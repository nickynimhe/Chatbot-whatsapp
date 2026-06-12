/**
 * Crea tablas nuevas si no existen (sin migraciones manuales obligatorias).
 */
async function ensureSchema(pool) {
    // Tablas de chats internos
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chats_internos (
            id SERIAL PRIMARY KEY,
            agente_menor_id INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
            agente_mayor_id INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
            ultimo_mensaje TEXT,
            ultimo_mensaje_hora TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_interno_orden CHECK (agente_menor_id < agente_mayor_id),
            CONSTRAINT uq_par_interno UNIQUE (agente_menor_id, agente_mayor_id)
        );
        CREATE TABLE IF NOT EXISTS mensajes_internos (
            id SERIAL PRIMARY KEY,
            chat_interno_id INT NOT NULL REFERENCES chats_internos(id) ON DELETE CASCADE,
            emisor_id INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
            texto TEXT DEFAULT '',
            tipo VARCHAR(32) DEFAULT 'texto',
            url_adjunto TEXT,
            metadata_archivo TEXT,
            hora TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_mensajes_internos_chat ON mensajes_internos(chat_interno_id);
    `)

    // Tabla de estadísticas de asesores
    await pool.query(`
        CREATE TABLE IF NOT EXISTS estadisticas_agentes (
            id SERIAL PRIMARY KEY,
            agente_id INT NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
            fecha DATE NOT NULL DEFAULT CURRENT_DATE,
            chats_atendidos INT DEFAULT 0,
            mensajes_enviados INT DEFAULT 0,
            mensajes_recibidos INT DEFAULT 0,
            tiempo_promedio_respuesta INT DEFAULT 0, -- en segundos
            chats_cerrados INT DEFAULT 0,
            valoracion_promedio DECIMAL(3,2) DEFAULT 0,
            CONSTRAINT uq_estadisticas_agente_fecha UNIQUE (agente_id, fecha)
        );
        CREATE INDEX IF NOT EXISTS idx_estadisticas_agente_fecha ON estadisticas_agentes(agente_id, fecha);
    `)

    // Tabla de historial de chats cerrados
    await pool.query(`
        CREATE TABLE IF NOT EXISTS historial_chats (
            id SERIAL PRIMARY KEY,
            chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
            cliente_nombre TEXT,
            cliente_numero TEXT,
            agente_id INT REFERENCES agentes(id) ON DELETE SET NULL,
            estado_inicial VARCHAR(32),
            estado_final VARCHAR(32),
            fecha_inicio TIMESTAMPTZ,
            fecha_cierre TIMESTAMPTZ,
            duracion_segundos INT,
            total_mensajes INT DEFAULT 0,
            motivo_cierre TEXT,
            calificacion INT CHECK (calificacion >= 1 AND calificacion <= 5)
        );
        CREATE INDEX IF NOT EXISTS idx_historial_agente ON historial_chats(agente_id);
        CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_chats(fecha_cierre);
    `)

    // Tabla de plantillas de respuesta
    await pool.query(`
        CREATE TABLE IF NOT EXISTS plantillas (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            texto TEXT NOT NULL,
            categoria VARCHAR(50) DEFAULT 'general',
            creada_por INT REFERENCES agentes(id) ON DELETE SET NULL,
            activa BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_plantillas_categoria ON plantillas(categoria);
    `)

    // Actualizaciones a tablas existentes
    try {
        await pool.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS url_adjunto TEXT`)
    } catch (_) { /* columna ya existe o permisos */ }
    try {
        await pool.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS tipo VARCHAR(32) DEFAULT 'texto'`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS metadata_archivo TEXT`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS leido BOOLEAN DEFAULT false`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS leido_en TIMESTAMPTZ`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE agentes ADD COLUMN IF NOT EXISTS ultima_actividad TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE agentes ADD COLUMN IF NOT EXISTS total_chats_atendidos INT DEFAULT 0`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE agentes ADD COLUMN IF NOT EXISTS tiempo_promedio_respuesta INT DEFAULT 0`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS fecha_inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS prioridad INT DEFAULT 0`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS categoria VARCHAR(50)`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS en_espera BOOLEAN DEFAULT false`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS mensaje_respondido_id INT REFERENCES mensajes(id) ON DELETE SET NULL`)
    } catch (_) { }
    try {
        await pool.query(`ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT`)
    } catch (_) { }

    // Índices para búsqueda de mensajes
    try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_mensajes_texto ON mensajes USING gin(to_tsvector('spanish', texto))`)
    } catch (_) { }
    try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_mensajes_chat_hora ON mensajes(chat_id, hora DESC)`)
    } catch (_) { }

    console.log('📐 Esquema verificado y actualizado (chats_internos, mensajes_internos, estadisticas_agentes, historial_chats)')
}

module.exports = { ensureSchema }
