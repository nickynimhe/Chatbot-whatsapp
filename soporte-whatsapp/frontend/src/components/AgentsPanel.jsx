import { useState, useEffect, useRef } from "react"
import { apiFetch, API_BASE } from "../api"
import socket from "../sockets/socket"
import { 
    UserIcon, 
    EditIcon, 
    XIcon, 
    UsersIcon,
    EyeIcon,
    CameraIcon,
    KeyIcon,
    SettingsIcon,
    LogOutIcon
} from "./icons"

function AgentsPanel({ 
    agentes, 
    agenteActual, 
    setAgenteActual, 
    actualizarEstadoAgente, 
    esAdmin, 
    agenteVisualizado, 
    setAgenteVisualizado,
    fotoPerfil,
    setFotoPerfil
}) {
    const [estadoLocal, setEstadoLocal] = useState(null)
    const [mostrarEditar, setMostrarEditar] = useState(false)
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
    const [nuevoEstado, setNuevoEstado] = useState(null)
    const [editando, setEditando] = useState({ nombre: "" })
    const [cambiandoEstado, setCambiandoEstado] = useState(false)
    const [subiendoFoto, setSubiendoFoto] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (agenteActual) {
            setEstadoLocal(agenteActual.estado || "disponible")
            setEditando({ nombre: agenteActual.nombre || "" })
        }
    }, [agenteActual])

    // Cargar foto de perfil desde localStorage al iniciar
    useEffect(() => {
        if (agenteActual?.id) {
            const fotoGuardada = localStorage.getItem(`foto_perfil_${agenteActual.id}`)
            if (fotoGuardada) {
                setFotoPerfil(fotoGuardada)
            } else if (agenteActual.foto_perfil) {
                const fotoUrl = agenteActual.foto_perfil.startsWith('/uploads/') 
                    ? `${API_BASE}${agenteActual.foto_perfil}` 
                    : agenteActual.foto_perfil
                setFotoPerfil(fotoUrl)
                localStorage.setItem(`foto_perfil_${agenteActual.id}`, fotoUrl)
            }
        }
    }, [agenteActual?.id, agenteActual?.foto_perfil, setFotoPerfil])

    // Escuchar actualizaciones de foto en tiempo real
    useEffect(() => {
        if (!socket) return

        const handleFotoActualizada = (data) => {
            if (data.agente_id === agenteActual?.id) {
                const fotoUrl = data.foto_url.startsWith('/uploads/') 
                    ? `${API_BASE}${data.foto_url}` 
                    : data.foto_url
                setFotoPerfil(fotoUrl)
                localStorage.setItem(`foto_perfil_${agenteActual.id}`, fotoUrl)
            }
        }

        socket.on('foto-perfil-actualizada', handleFotoActualizada)
        return () => socket.off('foto-perfil-actualizada', handleFotoActualizada)
    }, [socket, agenteActual?.id, setFotoPerfil])

    const handleCambiarEstado = (estado) => {
        if (estado === estadoLocal) return
        setNuevoEstado(estado)
        setMostrarConfirmacion(true)
    }

    const confirmarCambioEstado = async () => {
        if (!nuevoEstado) return
        
        setCambiandoEstado(true)
        try {
            await actualizarEstadoAgente(agenteActual.id, nuevoEstado)
            setEstadoLocal(nuevoEstado)
            setMostrarConfirmacion(false)
        } catch (error) {
            console.error("Error cambiando estado:", error)
            alert("Error al cambiar estado")
        } finally {
            setCambiandoEstado(false)
        }
    }

    const guardarCambios = async () => {
        try {
            const response = await apiFetch(`/api/agentes/${agenteActual.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editando)
            })
            if (response.ok) {
                const data = await response.json()
                const agenteActualizado = { ...agenteActual, ...editando, foto_perfil: data.foto_perfil }
                if (setAgenteActual) setAgenteActual(agenteActualizado)
                setMostrarEditar(false)
                alert("✅ Perfil actualizado")
            }
        } catch (error) {
            console.error("Error:", error)
        }
    }

    // Función para subir foto con FormData
    const handleCambiarFoto = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten imágenes (JPG, PNG, WEBP)')
            return
        }
        
        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no puede superar los 5MB')
            return
        }
        
        setSubiendoFoto(true)
        
        // Crear FormData para enviar el archivo
        const formData = new FormData()
        formData.append('foto', file)
        
        try {
            const response = await apiFetch('/api/agentes/foto-perfil', {
                method: 'POST',
                body: formData
            })
            
            if (response.ok) {
                const data = await response.json()
                if (data.success && data.url) {
                    const fotoUrl = data.url.startsWith('/uploads/') 
                        ? `${API_BASE}${data.url}` 
                        : data.url
                    setFotoPerfil(fotoUrl)
                    localStorage.setItem(`foto_perfil_${agenteActual?.id}`, fotoUrl)
                    setMostrarEditar(false)
                    
                    // Actualizar lista de agentes
                    if (setAgenteActual) {
                        setAgenteActual(prev => ({ ...prev, foto_perfil: data.url }))
                    }
                    
                    alert('✅ Foto de perfil actualizada correctamente')
                }
            } else {
                const error = await response.json()
                alert(error.error || 'Error al subir la foto')
            }
        } catch (error) {
            console.error('Error subiendo foto:', error)
            alert('Error al subir la foto')
        } finally {
            setSubiendoFoto(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const seleccionarVisualizar = (agente) => {
        if (agenteVisualizado?.id === agente.id) {
            setAgenteVisualizado(null)
        } else {
            setAgenteVisualizado(agente)
        }
    }

    const getInitials = (nombre) => {
        if (!nombre) return "??"
        return nombre
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    if (!agenteActual) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-warning/10 border border-warning/20 text-warning p-4 rounded-xl text-center">
                    ⚠️ No hay agente seleccionado
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-white to-gray-50">
            {/* Header con dropdown */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold gradient-text font-jacksilver neon-blue">
                        {esAdmin ? "Panel Admin" : "Mi Panel"}
                    </h3>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setMostrarEditar(!mostrarEditar)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover-lift"
                        title="Menú"
                    >
                        <SettingsIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    {mostrarEditar && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-xl shadow-modern-xl z-50 animate-scaleIn">
                            <div className="p-1">
                                <button
                                    onClick={() => {
                                        setMostrarEditar(false)
                                        setTimeout(() => setMostrarEditar(true), 10)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded-md flex items-center gap-2 transition-all duration-200"
                                >
                                    <EditIcon className="w-4 h-4 text-gray-500" />
                                    <span>Editar perfil</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setMostrarEditar(false)
                                        setTimeout(() => setMostrarConfirmacion(true), 10)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded-md flex items-center gap-2 transition-all duration-200"
                                >
                                    <UserIcon className="w-4 h-4 text-gray-500" />
                                    <span>Cambiar estado</span>
                                </button>
                                <div className="border-t border-gray-200/50 my-1"></div>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('token')
                                        localStorage.removeItem('agente')
                                        window.location.href = '/login'
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 rounded-md flex items-center gap-2 text-red-600 transition-all duration-200"
                                >
                                    <LogOutIcon className="w-4 h-4" />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chats activos */}
            <div className="mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Chats Activos</h4>
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-5 border border-gray-200/50 shadow-modern hover-lift transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D355D]/20 to-[#ED3237]/20 flex items-center justify-center shadow-modern glow-blue">
                            <UsersIcon className="w-6 h-6 text-[#2D355D]" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold gradient-text">{agenteActual.chatsAsignados || 0}</div>
                            <div className="text-sm text-gray-500">chats en curso</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de agentes */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {esAdmin ? "Todos los Agentes" : "Mi Equipo"}
                    </h4>
                    <span className="text-xs text-gray-500 font-medium">{agentes.length} miembros</span>
                </div>
                <div className="space-y-1">
                    {agentes.map((agente, index) => {
                        const fotoUrl = agente.foto_perfil 
                            ? (agente.foto_perfil.startsWith('/uploads/') ? `${API_BASE}${agente.foto_perfil}` : agente.foto_perfil)
                            : null
                        return (
                            <div key={agente.id} className={`p-3 hover:bg-gray-50 border-b border-gray-100/50 transition-all duration-200 hover-lift animate-slideInLeft shine-effect card-3d ${
                                agente.id === agenteActual?.id ? "bg-gradient-to-r from-[#2D355D]/10 to-[#ED3237]/10 glow-blue border-pulse" : ""
                            }`} style={{ animationDelay: `${index * 50}ms` }}>
                                <div className="flex items-center gap-3">
                                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-modern transition-all duration-300 overflow-hidden ${
                                        agente.estado === "disponible" 
                                            ? "bg-gradient-to-br from-[#2D355D] to-[#4A5585] text-white glow-blue" 
                                            : agente.estado === "ocupado" 
                                            ? "bg-gradient-to-br from-[#ED3237] to-[#C41E24] text-white glow-red" 
                                            : "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white"
                                    }`}>
                                        {fotoUrl ? (
                                            <img src={fotoUrl} alt={agente.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(agente.nombre)
                                        )}
                                        {agente.estado === "disponible" && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#2D355D] border-2 border-white shadow-sm"></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-semibold ${
                                            agente.id === agenteActual?.id ? "text-[#2D355D]" : "text-gray-900"
                                        }`}>{agente.nombre}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm ${
                                                agente.estado === "disponible" 
                                                    ? "bg-[#2D355D]/10 text-[#2D355D]" 
                                                    : agente.estado === "ocupado" 
                                                    ? "bg-[#ED3237]/10 text-[#ED3237]" 
                                                    : "bg-[#FFD700]/20 text-[#FFA500]"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    agente.estado === "disponible" ? "bg-[#2D355D]" 
                                                    : agente.estado === "ocupado" ? "bg-[#ED3237]" 
                                                    : "bg-[#FFA500]"
                                                }`}></span>
                                                {agente.estado === "disponible" ? "Activo" : agente.estado === "ocupado" ? "Ocupado" : "Descanso"}
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium">{agente.chatsAsignados || 0} chats</span>
                                        </div>
                                    </div>
                                    {esAdmin && agente.id !== agenteActual?.id && (
                                        <button
                                            onClick={() => seleccionarVisualizar(agente)}
                                            className={`p-2 rounded-xl transition-all duration-200 hover-lift ${
                                                agenteVisualizado?.id === agente.id 
                                                    ? "bg-[#2D355D] text-white shadow-modern" 
                                                    : "text-gray-400 hover:text-[#2D355D] hover:bg-gray-100"
                                            }`}
                                            title="Visualizar chats del agente"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Modal de edición de perfil */}
            {mostrarEditar && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-gray-200/50 shadow-modern-xl animate-scaleIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Editar perfil</h3>
                            <button 
                                onClick={() => setMostrarEditar(false)}
                                className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200 hover-lift"
                            >
                                <XIcon className="w-5 h-5 text-gray-500 hover:text-gray-900" />
                            </button>
                        </div>
                        
                        {/* Cambiar foto */}
                        <div className="flex justify-center mb-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#2D355D]/20 to-[#ED3237]/20 flex items-center justify-center text-3xl font-bold text-[#2D355D] overflow-hidden shadow-modern-lg ring-4 ring-[#2D355D]/10">
                                    {fotoPerfil ? (
                                        <img 
                                            src={fotoPerfil} 
                                            alt="Perfil" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        getInitials(agenteActual.nombre)
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2D355D] to-[#ED3237] text-white flex items-center justify-center cursor-pointer hover:from-[#2D355D] hover:to-[#ED3237] transition-all duration-300 shadow-modern hover-lift group-hover:scale-110">
                                    {subiendoFoto ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <CameraIcon className="w-5 h-5" />
                                    )}
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept="image/jpeg,image/png,image/jpg,image/webp" 
                                        className="hidden" 
                                        onChange={handleCambiarFoto}
                                        disabled={subiendoFoto}
                                    />
                                </label>
                            </div>
                        </div>
                        
                        <input 
                            type="text" 
                            value={editando.nombre} 
                            onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} 
                            className="w-full mb-6 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D355D]/50 focus:border-[#2D355D]/50 transition-all duration-200 font-medium" 
                            placeholder="Nombre" 
                        />
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setMostrarEditar(false)} 
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 transition-all duration-200 font-semibold hover-lift"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={guardarCambios} 
                                className="flex-1 py-3 bg-gradient-to-r from-[#2D355D] to-[#ED3237] text-white rounded-2xl hover:from-[#2D355D]/90 hover:to-[#ED3237]/90 transition-all duration-200 font-semibold shadow-modern hover-lift"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de cambio de estado */}
            {mostrarConfirmacion && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm border border-gray-200/50 shadow-modern-xl animate-scaleIn">
                        <h3 className="text-lg font-bold text-gray-900 text-center mb-6">Cambiar estado</h3>
                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => handleCambiarEstado("disponible")}
                                className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-3 hover-lift ${
                                    estadoLocal === "disponible" 
                                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-modern" 
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                }`}
                            >
                                <span className="text-xl">🟢</span>
                                Disponible
                            </button>
                            <button
                                onClick={() => handleCambiarEstado("ocupado")}
                                className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-3 hover-lift ${
                                    estadoLocal === "ocupado" 
                                        ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-modern" 
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                }`}
                            >
                                <span className="text-xl">🔴</span>
                                Ocupado
                            </button>
                            <button
                                onClick={() => handleCambiarEstado("descanso")}
                                className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-3 hover-lift ${
                                    estadoLocal === "descanso" 
                                        ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-modern" 
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                }`}
                            >
                                <span className="text-xl">🟡</span>
                                Descanso
                            </button>
                        </div>
                        <button
                            onClick={() => setMostrarConfirmacion(false)}
                            className="w-full py-3 border-2 border-gray-200 rounded-2xl hover:bg-gray-50 transition-all duration-200 font-semibold hover-lift"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AgentsPanel
