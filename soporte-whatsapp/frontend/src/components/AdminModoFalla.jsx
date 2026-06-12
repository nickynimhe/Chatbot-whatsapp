import { useState, useEffect } from "react"
import { apiFetch } from "../api"
import { 
    SaveIcon, 
    AlertCircleIcon, 
    CheckCircleIcon, 
    PowerIcon, 
    MapPinIcon, 
    MessageIcon,
    XIcon,
    RefreshIcon,
    InfoIcon,
    UsersIcon,
    ClockIcon,
    WarningIcon
} from "./icons"

function AdminModoFalla({ agenteActual }) {
    const [activo, setActivo] = useState(false)
    const [mensaje, setMensaje] = useState("")
    const [zona, setZona] = useState("")
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [mensajeAlerta, setMensajeAlerta] = useState(null)
    const [tipoAlerta, setTipoAlerta] = useState("")

    useEffect(() => { cargarConfiguracion() }, [])

    const mostrarAlerta = (mensaje, tipo = "success") => {
        setMensajeAlerta(mensaje)
        setTipoAlerta(tipo)
        setTimeout(() => {
            setMensajeAlerta(null)
            setTipoAlerta("")
        }, 3000)
    }

    const cargarConfiguracion = async () => {
        setCargando(true)
        try {
            const res = await apiFetch("/api/admin/modo-falla")
            const data = await res.json()
            setActivo(data.activo)
            setMensaje(data.mensaje)
            setZona(data.zona)
        } catch (error) {
            mostrarAlerta("Error al cargar configuración", "error")
        } finally { setCargando(false) }
    }

    const guardarConfiguracion = async () => {
        setGuardando(true)
        try {
            const res = await apiFetch("/api/admin/modo-falla", {
                method: "POST",
                body: JSON.stringify({ activo, mensaje, zona })
            })
            if (res.ok) {
                mostrarAlerta(activo ? "✅ Modo falla ACTIVADO" : "✅ Modo falla DESACTIVADO", "success")
            } else {
                const error = await res.json()
                mostrarAlerta(error.error || "Error al guardar", "error")
            }
        } catch { 
            mostrarAlerta("Error de conexión", "error")
        } finally { setGuardando(false) }
    }

    const mensajesEjemplo = [
        "⚠️ ESTIMADO CLIENTE: Presentamos una falla técnica en el municipio de FACATATIVÁ. Nuestro equipo está trabajando para solucionarlo. Disculpe las molestias.",
        "🔴 AVISO: Por mantenimiento de emergencia en la zona de MADRID, el servicio estará restablecido en 2 horas. Gracias por su comprensión.",
        "📢 COMUNICADO: Estamos presentando intermitencias en BOJACÁ y EL ROSAL. En breve normalizaremos el servicio."
    ]

    if (cargando) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-500">Cargando configuración...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
            {/* Alerta flotante */}
            {mensajeAlerta && (
                <div className={`fixed top-20 right-4 z-50 animate-fadeIn ${
                    tipoAlerta === "success" ? "bg-green-500" : "bg-red-500"
                } text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3`}>
                    {tipoAlerta === "success" ? (
                        <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                        <AlertCircleIcon className="w-5 h-5" />
                    )}
                    <span className="text-sm">{mensajeAlerta}</span>
                    <button onClick={() => setMensajeAlerta(null)} className="ml-2 hover:bg-white/20 rounded-lg p-1">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                ⚠️ Modo Falla por Zona
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Activa este modo cuando haya una falla en una zona específica del servicio
                            </p>
                        </div>
                        <button 
                            onClick={cargarConfiguracion} 
                            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 hover:rotate-180"
                            title="Recargar"
                        >
                            <RefreshIcon className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Tarjeta de Estado */}
                    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
                        activo ? 'border-red-200 dark:border-red-800 shadow-red-100' : 'border-gray-100 dark:border-gray-700'
                    }`}>
                        <div className="p-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                        activo ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'
                                    }`}>
                                        <PowerIcon className={`w-7 h-7 ${activo ? 'text-red-600' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Estado del Modo Falla</h3>
                                        <p className={`text-sm mt-1 ${activo ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {activo ? '🔴 ACTIVADO — Los clientes de la zona afectada verán el mensaje' : '🟢 DESACTIVADO — Operación normal'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActivo(!activo)}
                                    className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                                        activo 
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' 
                                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                    }`}
                                >
                                    <PowerIcon className="w-4 h-4" />
                                    {activo ? "Desactivar" : "Activar"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta de Zona */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <MapPinIcon className="w-5 h-5 text-orange-600" />
                                </div>
                                <h3 className="font-semibold text-gray-800 dark:text-white">Zona Afectada</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <input
                                type="text"
                                value={zona}
                                onChange={e => setZona(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Ej: FACATATIVÁ, MADRID, BOJACÁ"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                📍 Los clientes de esta zona recibirán automáticamente el mensaje de falla.
                            </p>
                        </div>
                    </div>

                    {/* Tarjeta de Mensaje */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <MessageIcon className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="font-semibold text-gray-800 dark:text-white">Mensaje de Falla</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <textarea
                                value={mensaje}
                                onChange={e => setMensaje(e.target.value)}
                                rows={5}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                placeholder="Escribe el mensaje que verán los clientes de la zona afectada..."
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                💡 Este mensaje se envía SOLO a clientes que confirmen ser de la zona afectada.
                            </p>
                        </div>
                    </div>

                    {/* Ejemplos de mensajes */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30 overflow-hidden">
                        <div className="px-6 py-4 border-b border-blue-100 dark:border-blue-900/30 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <InfoIcon className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-gray-800 dark:text-white">📋 Mensajes de ejemplo</h3>
                            </div>
                        </div>
                        <div className="p-4 space-y-2">
                            {mensajesEjemplo.map((ej, i) => (
                                <button
                                    key={i}
                                    onClick={() => setMensaje(ej)}
                                    className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                                >
                                    {ej}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Flujo del cliente */}
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <UsersIcon className="w-5 h-5 text-amber-600" />
                                </div>
                                <h3 className="font-semibold text-amber-800 dark:text-amber-400">🔍 Flujo para el cliente</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                                    <div className="text-sm text-amber-800 dark:text-amber-300">Cliente escribe <strong>"hola"</strong></div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-7 h-7 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                                    <div className="text-sm text-amber-800 dark:text-amber-300">Bot pregunta: <em>"¿Eres de {zona || '[ZONA]'}? Responde SÍ o NO"</em></div>
                                </div>
                                <div className="ml-8 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">→ SÍ</span>
                                        <span className="text-sm text-amber-800 dark:text-amber-300">Bot envía mensaje de falla y cierra el chat</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">→ NO</span>
                                        <span className="text-sm text-amber-800 dark:text-amber-300">Bot muestra menú principal y continúa normal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botón guardar */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={guardarConfiguracion}
                            disabled={guardando}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                            <SaveIcon className="w-5 h-5" />
                            {guardando ? "Guardando..." : "Guardar configuración"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminModoFalla
