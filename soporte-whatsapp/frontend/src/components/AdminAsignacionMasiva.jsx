// src/components/AdminAsignacionMasiva.jsx
import { useState, useEffect } from "react"
import { apiFetch } from "../api"
import { 
    UsersIcon, 
    CheckCircleIcon, 
    AlertCircleIcon,
    RefreshIcon,
    XIcon,
    UserCheckIcon,
    ClockIcon
} from "./icons"

function AdminAsignacionMasiva({ agenteActual }) {
    const [chatsEnEspera, setChatsEnEspera] = useState([])
    const [agentesDisponibles, setAgentesDisponibles] = useState([])
    const [seleccionados, setSeleccionados] = useState(new Set())
    const [seleccionarTodos, setSeleccionarTodos] = useState(false)
    const [cargando, setCargando] = useState(true)
    const [procesando, setProcesando] = useState(false)
    const [mensajeExito, setMensajeExito] = useState(null)
    const [mensajeError, setMensajeError] = useState(null)
    const [modoSeleccion, setModoSeleccion] = useState(false)

    const cargarDatos = async () => {
        setCargando(true)
        try {
            const resChats = await apiFetch("/api/admin/chats-sin-asignar")
            const dataChats = await resChats.json()
            setChatsEnEspera(dataChats || [])
            
            const resAgentes = await apiFetch("/api/agentes")
            const dataAgentes = await resAgentes.json()
            const disponibles = dataAgentes.filter(a => 
                a.estado === "disponible" && a.rol !== "admin"
            )
            setAgentesDisponibles(disponibles)
        } catch (error) {
            console.error("Error cargando datos:", error)
            setMensajeError("Error al cargar los datos")
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    const toggleSeleccion = (chatId) => {
        const nuevos = new Set(seleccionados)
        if (nuevos.has(chatId)) {
            nuevos.delete(chatId)
        } else {
            nuevos.add(chatId)
        }
        setSeleccionados(nuevos)
        setSeleccionarTodos(nuevos.size === chatsEnEspera.length && chatsEnEspera.length > 0)
    }

    const toggleSeleccionarTodos = () => {
        if (seleccionarTodos) {
            setSeleccionados(new Set())
            setSeleccionarTodos(false)
        } else {
            const todosIds = new Set(chatsEnEspera.map(c => c.id))
            setSeleccionados(todosIds)
            setSeleccionarTodos(true)
        }
    }

    const transferirEquitativo = async () => {
        if (seleccionados.size === 0) {
            setMensajeError("No hay chats seleccionados")
            return
        }
        
        if (agentesDisponibles.length === 0) {
            setMensajeError("No hay agentes disponibles para asignar")
            return
        }
        
        if (!confirm(`¿Transferir ${seleccionados.size} chat(s) entre ${agentesDisponibles.length} agente(s)?`)) return
        
        setProcesando(true)
        setMensajeExito(null)
        setMensajeError(null)
        
        const chatsArray = Array.from(seleccionados)
        let asignados = 0
        let errores = 0
        
        for (let i = 0; i < chatsArray.length; i++) {
            const agente = agentesDisponibles[i % agentesDisponibles.length]
            try {
                const res = await apiFetch(`/api/admin/chats/${chatsArray[i]}/asignar`, {
                    method: "POST",
                    body: JSON.stringify({ agente_id: agente.id })
                })
                if (res.ok) {
                    asignados++
                } else {
                    errores++
                }
            } catch (error) {
                errores++
            }
        }
        
        setMensajeExito(`✅ ${asignados} chats asignados, ${errores} errores`)
        await cargarDatos()
        setSeleccionados(new Set())
        setSeleccionarTodos(false)
        setProcesando(false)
    }

    const transferirAAgente = async (agenteId, agenteNombre) => {
        if (seleccionados.size === 0) {
            setMensajeError("No hay chats seleccionados")
            return
        }
        
        if (!confirm(`¿Transferir ${seleccionados.size} chat(s) a ${agenteNombre}?`)) return
        
        setProcesando(true)
        setMensajeExito(null)
        setMensajeError(null)
        
        const chatsArray = Array.from(seleccionados)
        let asignados = 0
        let errores = 0
        
        for (const chatId of chatsArray) {
            try {
                const res = await apiFetch(`/api/admin/chats/${chatId}/asignar`, {
                    method: "POST",
                    body: JSON.stringify({ agente_id: agenteId })
                })
                if (res.ok) {
                    asignados++
                } else {
                    errores++
                }
            } catch (error) {
                errores++
            }
        }
        
        setMensajeExito(`✅ ${asignados} chats asignados a ${agenteNombre}, ${errores} errores`)
        await cargarDatos()
        setSeleccionados(new Set())
        setSeleccionarTodos(false)
        setProcesando(false)
    }

    const finalizarChats = async () => {
        if (seleccionados.size === 0) {
            setMensajeError("No hay chats seleccionados")
            return
        }
        
        if (!confirm(`¿Finalizar ${seleccionados.size} chat(s)? Esta acción no se puede deshacer.`)) return
        
        setProcesando(true)
        setMensajeExito(null)
        setMensajeError(null)
        
        const chatsArray = Array.from(seleccionados)
        let cerrados = 0
        let errores = 0
        
        for (const chatId of chatsArray) {
            try {
                const res = await apiFetch(`/api/chats/${chatId}/cerrar`, {
                    method: "PUT",
                    body: JSON.stringify({})
                })
                if (res.ok) {
                    cerrados++
                } else {
                    errores++
                }
            } catch (error) {
                errores++
            }
        }
        
        setMensajeExito(`✅ ${cerrados} chats finalizados, ${errores} errores`)
        await cargarDatos()
        setSeleccionados(new Set())
        setSeleccionarTodos(false)
        setProcesando(false)
    }

    if (cargando) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Cargando chats en espera...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">📋 Asignación Masiva</h1>
                            <p className="text-gray-500 mt-1">Gestiona múltiples chats en espera de manera simultánea</p>
                        </div>
                        <button onClick={cargarDatos} className="p-2 rounded-lg bg-white border hover:bg-gray-50">
                            <RefreshIcon className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Chats en Espera</p>
                                <p className="text-2xl font-bold text-orange-600">{chatsEnEspera.length}</p>
                            </div>
                            <ClockIcon className="w-8 h-8 text-orange-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Agentes Disponibles</p>
                                <p className="text-2xl font-bold text-green-600">{agentesDisponibles.length}</p>
                            </div>
                            <UserCheckIcon className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Seleccionados</p>
                                <p className="text-2xl font-bold text-blue-600">{seleccionados.size}</p>
                            </div>
                            <UsersIcon className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                </div>

                {/* Botones de acción masiva */}
                {chatsEnEspera.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setModoSeleccion(!modoSeleccion)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        modoSeleccion 
                                            ? "bg-red-500 text-white hover:bg-red-600"
                                            : "bg-blue-500 text-white hover:bg-blue-600"
                                    }`}
                                >
                                    {modoSeleccion ? "❌ Salir del modo selección" : "✏️ Modo selección"}
                                </button>
                                
                                {modoSeleccion && (
                                    <>
                                        <button
                                            onClick={toggleSeleccionarTodos}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600"
                                        >
                                            {seleccionarTodos ? "Deseleccionar todos" : "Seleccionar todos"}
                                        </button>
                                        <button
                                            onClick={transferirEquitativo}
                                            disabled={procesando || seleccionados.size === 0}
                                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
                                        >
                                            🔄 Transferir equitativamente
                                        </button>
                                        <button
                                            onClick={finalizarChats}
                                            disabled={procesando || seleccionados.size === 0}
                                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                                        >
                                            ❌ Finalizar seleccionados
                                        </button>
                                    </>
                                )}
                            </div>
                            
                            {modoSeleccion && agentesDisponibles.length > 0 && (
                                <div className="flex gap-2">
                                    <span className="text-sm text-gray-500 self-center">Asignar a:</span>
                                    {agentesDisponibles.map(agente => (
                                        <button
                                            key={agente.id}
                                            onClick={() => transferirAAgente(agente.id, agente.nombre)}
                                            disabled={procesando || seleccionados.size === 0}
                                            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 disabled:opacity-50"
                                        >
                                            👤 {agente.nombre}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mensajes de éxito/error */}
                {mensajeExito && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        {mensajeExito}
                    </div>
                )}
                {mensajeError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                        <AlertCircleIcon className="w-5 h-5" />
                        {mensajeError}
                    </div>
                )}

                {/* Lista de chats en espera */}
                {chatsEnEspera.length === 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                        <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-green-600 font-medium">✅ No hay chats pendientes por asignar</p>
                        <p className="text-green-500 text-sm mt-1">Todos los chats tienen un asesor asignado</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {modoSeleccion && (
                                            <th className="px-4 py-3 text-left text-sm font-medium">
                                                <input
                                                    type="checkbox"
                                                    checked={seleccionarTodos}
                                                    onChange={toggleSeleccionarTodos}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                            </th>
                                        )}
                                        <th className="px-4 py-3 text-left text-sm font-medium">Cliente</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Número</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Espera</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Mensajes</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Último mensaje</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {chatsEnEspera.map(chat => (
                                        <tr key={chat.id} className="hover:bg-gray-50">
                                            {modoSeleccion && (
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={seleccionados.has(chat.id)}
                                                        onChange={() => toggleSeleccion(chat.id)}
                                                        className="w-4 h-4 rounded border-gray-300"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-3 font-medium text-gray-800">
                                                {chat.cliente_nombre || "Cliente"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{chat.cliente_numero}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                    {Math.round(chat.minutos_espera || 0)} min
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{chat.total_mensajes || 0}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">
                                                {chat.ultimo_mensaje?.substring(0, 50) || "Sin mensajes"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <select
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                transferirAAgente(parseInt(e.target.value), "agente")
                                                                e.target.value = ""
                                                            }
                                                        }}
                                                        className="text-sm border rounded-lg px-2 py-1 bg-white"
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>Asignar a...</option>
                                                        {agentesDisponibles.map(a => (
                                                            <option key={a.id} value={a.id}>{a.nombre}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`¿Finalizar chat de ${chat.cliente_nombre || "cliente"}?`)) {
                                                                apiFetch(`/api/chats/${chat.id}/cerrar`, { method: "PUT" })
                                                                    .then(() => cargarDatos())
                                                                    .catch(console.error)
                                                            }
                                                        }}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                        title="Finalizar chat"
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminAsignacionMasiva
