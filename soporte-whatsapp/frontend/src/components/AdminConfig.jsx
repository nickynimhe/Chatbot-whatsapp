// src/components/AdminConfig.jsx
import { useState, useEffect } from "react"
import { apiFetch } from "../api"
import { SaveIcon, RefreshIcon, CheckCircleIcon, AlertCircleIcon } from "./icons"

export default function AdminConfig({ agenteActual }) {
    const [config, setConfig] = useState({
        mensaje_bienvenida_general: "",
        mensaje_validacion_datos: "",
        mensaje_cierre: "",
        mensaje_soporte_tecnico: ""
    })
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [mensajeExito, setMensajeExito] = useState(null)
    const [mensajeError, setMensajeError] = useState(null)

    useEffect(() => { cargarConfiguracion() }, [])

    const cargarConfiguracion = async () => {
        setCargando(true)
        try {
            const res = await apiFetch("/api/admin/configuracion")
            if (res.ok) {
                const data = await res.json()
                setConfig({
                    mensaje_bienvenida_general: data.mensaje_bienvenida_general || "",
                    mensaje_validacion_datos: data.mensaje_validacion_datos || "",
                    mensaje_cierre: data.mensaje_cierre || "",
                    mensaje_soporte_tecnico: data.mensaje_soporte_tecnico || "🖥️ En unos momentos usted será atendido por un asesor de soporte técnico, por favor espere en la línea."
                })
            }
        } catch (error) {
            setMensajeError("Error al cargar la configuración")
        } finally { setCargando(false) }
    }

    const guardarConfiguracion = async () => {
        setGuardando(true)
        setMensajeExito(null)
        setMensajeError(null)
        try {
            const res = await apiFetch("/api/admin/configuracion", { method: "PUT", body: JSON.stringify(config) })
            if (res.ok) {
                setMensajeExito("Configuración guardada correctamente")
                setTimeout(() => setMensajeExito(null), 3000)
            } else {
                const error = await res.json()
                setMensajeError(error.error || "Error al guardar")
            }
        } catch (error) {
            setMensajeError("Error de conexión al guardar")
        } finally { setGuardando(false) }
    }

    const handleReset = () => {
        if (confirm("¿Restaurar valores por defecto?")) {
            setConfig({
                mensaje_bienvenida_general: "Hola, gracias por comunicarte. Mi nombre es [NOMBRE_AGENTE]. ¿En qué puedo ayudarte?",
                mensaje_validacion_datos: "Con el fin de garantizar la protección de datos personales, realizaremos una validación de seguridad.\n\nIndíqueme por favor la siguiente información:\n• Nombre completo y cédula del titular de la cuenta\n• Correo electrónico\n• Dirección del servicio\n• Valor de su facturación mensual",
                mensaje_cierre: "✅ Atención finalizada. Gracias por contactarnos.",
                mensaje_soporte_tecnico: "🖥️ En unos momentos usted será atendido por un asesor de soporte técnico, por favor espere en la línea."
            })
        }
    }

    if (cargando) return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ width: 36, height: 36, border: "3px solid #eef0f5", borderTopColor: "#ED3237", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Cargando configuración...</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )

    const fields = [
        {
            key: "mensaje_bienvenida_general",
            title: "Mensaje de Bienvenida",
            icon: "👋",
            hint: <>Usa <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: 4, fontSize: "0.78rem" }}>[NOMBRE_AGENTE]</code> para insertar el nombre del agente.</>,
            rows: 4,
        },
        {
            key: "mensaje_validacion_datos",
            title: "Validación de Datos",
            icon: "🔐",
            hint: "Mensaje enviado durante el proceso de validación de seguridad del cliente.",
            rows: 7,
        },
        {
            key: "mensaje_soporte_tecnico",
            title: "Soporte Técnico",
            icon: "🖥️",
            hint: "Se envía cuando el cliente selecciona la opción 9 (Soporte técnico).",
            rows: 4,
        },
        {
            key: "mensaje_cierre",
            title: "Cierre de Chat",
            icon: "✅",
            hint: "Mensaje final enviado al cerrar una conversación.",
            rows: 3,
        },
    ]

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
                .ac-root { flex: 1; overflow-y: auto; background: #f8f9fc; font-family: 'DM Sans', system-ui, sans-serif; }
                .ac-inner { max-width: 720px; margin: 0 auto; padding: 28px 24px; }
                .ac-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
                .ac-page-title { font-size: 1.2rem; font-weight: 700; color: #111827; margin-bottom: 3px; }
                .ac-page-sub { font-size: 0.8rem; color: #9ca3af; }
                .ac-btn-row { display: flex; gap: 8px; }
                .ac-btn {
                    display: flex; align-items: center; gap: 7px;
                    padding: 8px 16px; border-radius: 8px; border: none;
                    font-family: inherit; font-size: 0.82rem; font-weight: 600;
                    cursor: pointer; transition: all 0.15s;
                }
                .ac-btn-ghost { background: #f3f4f6; color: #374151; }
                .ac-btn-ghost:hover { background: #e5e7eb; }
                .ac-btn-primary { background: #2D355D; color: #fff; }
                .ac-btn-primary:hover { background: #1e2548; }
                .ac-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
                .ac-btn svg { width: 15px; height: 15px; }
                .ac-toast {
                    display: flex; align-items: center; gap: 10px;
                    padding: 11px 14px; border-radius: 10px;
                    font-size: 0.82rem; margin-bottom: 16px;
                    animation: slideDown 0.2s ease;
                }
                .ac-toast svg { width: 16px; height: 16px; flex-shrink: 0; }
                .ac-card {
                    background: #fff; border-radius: 14px; padding: 22px;
                    border: 1.5px solid #eef0f5; margin-bottom: 14px;
                    transition: border-color 0.15s;
                }
                .ac-card:hover { border-color: #e5e7eb; }
                .ac-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
                .ac-card-icon { width: 36px; height: 36px; border-radius: 9px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
                .ac-card-title { font-size: 0.9rem; font-weight: 700; color: #111827; }
                .ac-card-hint { font-size: 0.75rem; color: #9ca3af; margin-top: 2px; line-height: 1.4; }
                .ac-textarea {
                    width: 100%; padding: 12px 14px;
                    background: #f9fafb; border: 1.5px solid #eef0f5;
                    border-radius: 10px; font-family: inherit; font-size: 0.84rem;
                    color: #111827; resize: vertical; outline: none;
                    transition: border-color 0.15s, background 0.15s;
                    box-sizing: border-box; line-height: 1.55;
                }
                .ac-textarea:focus { border-color: #2D355D; background: #fff; }
                .ac-preview {
                    margin-top: 14px; background: #f8f9fc;
                    border: 1.5px solid #eef0f5; border-radius: 10px; padding: 14px;
                }
                .ac-preview-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
                .ac-preview-bubble {
                    background: #fff; border: 1px solid #eef0f5; border-radius: 10px;
                    padding: 10px 12px; font-size: 0.82rem; color: #374151;
                    line-height: 1.5; white-space: pre-wrap; max-width: 360px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                }
            `}</style>

            <div className="ac-root">
                <div className="ac-inner">
                    <div className="ac-page-header">
                        <div>
                            <div className="ac-page-title">Configuración del Sistema</div>
                            <div className="ac-page-sub">Administra los mensajes automáticos del bot</div>
                        </div>
                        <div className="ac-btn-row">
                            <button className="ac-btn ac-btn-ghost" onClick={handleReset}>
                                <RefreshIcon /> Restaurar
                            </button>
                            <button className="ac-btn ac-btn-primary" onClick={guardarConfiguracion} disabled={guardando}>
                                <SaveIcon /> {guardando ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>

                    {mensajeExito && (
                        <div className="ac-toast" style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", color: "#15803d" }}>
                            <CheckCircleIcon /> {mensajeExito}
                        </div>
                    )}
                    {mensajeError && (
                        <div className="ac-toast" style={{ background: "#fef2f2", border: "1.5px solid #fecaca", color: "#dc2626" }}>
                            <AlertCircleIcon /> {mensajeError}
                        </div>
                    )}

                    {fields.map(field => (
                        <div key={field.key} className="ac-card">
                            <div className="ac-card-header">
                                <div className="ac-card-icon">{field.icon}</div>
                                <div>
                                    <div className="ac-card-title">{field.title}</div>
                                    <div className="ac-card-hint">{field.hint}</div>
                                </div>
                            </div>
                            <textarea
                                className="ac-textarea"
                                value={config[field.key]}
                                onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                                rows={field.rows}
                            />
                        </div>
                    ))}

                    {/* Preview */}
                    <div className="ac-preview">
                        <div className="ac-preview-label">Vista previa — Bienvenida</div>
                        <div className="ac-preview-bubble">
                            {config.mensaje_bienvenida_general.replace(/\[NOMBRE_AGENTE\]/g, agenteActual?.nombre || "Agente") || "—"}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
