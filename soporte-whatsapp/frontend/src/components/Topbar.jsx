import { useState, useEffect, useRef } from "react"
import { MenuIcon, RefreshCwIcon, UserIcon, PowerIcon, BellIcon, XIcon, CheckIcon, TrashIcon, CameraIcon } from "./icons"
import { apiFetch, API_BASE } from "../api"
import socket from "../sockets/socket"

function Topbar({ 
    agenteLogueado, 
    cerrarSesion, 
    areaTrabajo, 
    onAreaClientes, 
    onAreaInterno, 
    onAreaAdmin, 
    onToggleSidebar, 
    esAdmin, 
    onRefresh,
    actualizarEstadoAgente,
    fotoPerfil,
    setFotoPerfil
}) {
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editandoNombre, setEditandoNombre] = useState("")
    const [subiendoFoto, setSubiendoFoto] = useState(false)
    const [estadoLocal, setEstadoLocal] = useState(agenteLogueado?.estado || "disponible")
    const [cambiandoEstado, setCambiandoEstado] = useState(false)
    const [fotoPerfilLocal, setFotoPerfilLocal] = useState(fotoPerfil)
    const fileInputRef = useRef(null)
    const menuRef = useRef(null)
    const notifRef = useRef(null)
    const modalRef = useRef(null)

    const [notificaciones, setNotificaciones] = useState([
        { id: 1, mensaje: "Bienvenido al sistema de soporte", leida: false, tipo: "info", timestamp: new Date() },
        { id: 2, mensaje: "Nuevo chat pendiente de asignación", leida: false, tipo: "warning", timestamp: new Date() }
    ])

    useEffect(() => {
        setEstadoLocal(agenteLogueado?.estado || "disponible")
        setEditandoNombre(agenteLogueado?.nombre || "")
    }, [agenteLogueado])

    // Cargar foto de perfil desde localStorage
    useEffect(() => {
        if (agenteLogueado?.id) {
            const fotoGuardada = localStorage.getItem(`foto_perfil_${agenteLogueado.id}`)
            if (fotoGuardada) {
                setFotoPerfilLocal(fotoGuardada)
                setFotoPerfil(fotoGuardada)
            } else if (agenteLogueado.foto_perfil) {
                const fotoUrl = agenteLogueado.foto_perfil.startsWith('/uploads/') 
                    ? `${API_BASE}${agenteLogueado.foto_perfil}` 
                    : agenteLogueado.foto_perfil
                setFotoPerfilLocal(fotoUrl)
                setFotoPerfil(fotoUrl)
                localStorage.setItem(`foto_perfil_${agenteLogueado.id}`, fotoUrl)
            }
        }
    }, [agenteLogueado?.id, agenteLogueado?.foto_perfil, setFotoPerfil])

    // Escuchar actualizaciones de foto en tiempo real
    useEffect(() => {
        if (!socket) return

        const handleFotoActualizada = (data) => {
            if (data.agente_id === agenteLogueado?.id) {
                const fotoUrl = data.foto_url ? (data.foto_url.startsWith('/uploads/') 
                    ? `${API_BASE}${data.foto_url}` 
                    : data.foto_url) : null
                setFotoPerfilLocal(fotoUrl)
                setFotoPerfil(fotoUrl)
                if (fotoUrl) {
                    localStorage.setItem(`foto_perfil_${agenteLogueado.id}`, fotoUrl)
                } else {
                    localStorage.removeItem(`foto_perfil_${agenteLogueado.id}`)
                }
            }
        }

        socket.on('foto-perfil-actualizada', handleFotoActualizada)
        return () => socket.off('foto-perfil-actualizada', handleFotoActualizada)
    }, [socket, agenteLogueado?.id, setFotoPerfil])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false)
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false)
            }
            if (modalRef.current && !modalRef.current.contains(event.target) && showEditModal) {
                setShowEditModal(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showEditModal])

    const cambiarEstado = async (nuevoEstado) => {
        if (nuevoEstado === estadoLocal) return
        
        setCambiandoEstado(true)
        try {
            await actualizarEstadoAgente(agenteLogueado.id, nuevoEstado)
            setEstadoLocal(nuevoEstado)
            setShowUserMenu(false)
        } catch (error) {
            console.error("Error cambiando estado:", error)
            alert("Error al cambiar estado")
        } finally {
            setCambiandoEstado(false)
        }
    }

    // Subir foto de perfil
    const handleCambiarFoto = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten imágenes (JPG, PNG, WEBP)')
            return
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no puede superar los 5MB')
            return
        }
        
        setSubiendoFoto(true)
        
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
                    setFotoPerfilLocal(fotoUrl)
                    setFotoPerfil(fotoUrl)
                    localStorage.setItem(`foto_perfil_${agenteLogueado.id}`, fotoUrl)
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

    // Eliminar foto de perfil
    const handleEliminarFoto = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) return
        
        try {
            const response = await apiFetch('/api/agentes/foto-perfil', {
                method: 'DELETE'
            })
            
            if (response.ok) {
                setFotoPerfilLocal(null)
                setFotoPerfil(null)
                localStorage.removeItem(`foto_perfil_${agenteLogueado.id}`)
                alert('✅ Foto de perfil eliminada correctamente')
            } else {
                const error = await response.json()
                alert(error.error || 'Error al eliminar la foto')
            }
        } catch (error) {
            console.error('Error eliminando foto:', error)
            alert('Error al eliminar la foto')
        }
    }

    // Guardar cambios de nombre
    const guardarCambiosPerfil = async () => {
        if (!editandoNombre.trim()) {
            alert('El nombre no puede estar vacío')
            return
        }
        
        try {
            const response = await apiFetch(`/api/agentes/${agenteLogueado.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre: editandoNombre })
            })
            if (response.ok) {
                const data = await response.json()
                // Actualizar localStorage
                const agenteGuardado = JSON.parse(localStorage.getItem('agente') || '{}')
                agenteGuardado.nombre = editandoNombre
                localStorage.setItem('agente', JSON.stringify(agenteGuardado))
                setShowEditModal(false)
                alert('✅ Nombre actualizado correctamente')
                window.location.reload()
            }
        } catch (error) {
            console.error("Error:", error)
            alert("Error al guardar cambios")
        }
    }

    const marcarNotificacionLeida = (id) => {
        setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    }

    const marcarTodasLeidas = () => {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
    }

    const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length

    const getEstadoInfo = () => {
        switch(estadoLocal) {
            case "disponible": return { texto: "Disponible", bg: "bg-green-500", color: "text-green-600", dot: "bg-green-500" }
            case "ocupado": return { texto: "Ocupado", bg: "bg-red-500", color: "text-red-600", dot: "bg-red-500" }
            default: return { texto: "Descanso", bg: "bg-yellow-500", color: "text-yellow-600", dot: "bg-yellow-500" }
        }
    }
    const estadoInfo = getEstadoInfo()

    const getInitials = (nombre) => {
        if (!nombre) return "??"
        return nombre.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }

    const fotoUrl = fotoPerfilLocal || fotoPerfil || (agenteLogueado?.foto_perfil ? 
        (agenteLogueado.foto_perfil.startsWith('/uploads/') ? `${API_BASE}${agenteLogueado.foto_perfil}` : agenteLogueado.foto_perfil) 
        : null)

    return (
        <>
            <style>{`
                .topbar-modern {
                    background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                    padding: 0 24px;
                    height: 64px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: sticky;
                    top: 0;
                    z-index: 30;
                }
                .topbar-left { display: flex; align-items: center; gap: 16px; }
                .menu-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #6B7280;
                    transition: all 0.2s ease;
                }
                .menu-btn:hover { background: #F3F4F6; color: #ED3237; }
                .area-buttons { display: flex; gap: 8px; background: #F3F4F6; padding: 4px; border-radius: 40px; }
                .area-btn {
                    padding: 6px 16px;
                    border-radius: 32px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #6B7280;
                    transition: all 0.2s ease;
                }
                .area-btn.active {
                    background: #ED3237;
                    color: white;
                    box-shadow: 0 2px 8px rgba(237,50,55,0.3);
                }
                .area-btn:hover:not(.active) { background: #E5E7EB; color: #374151; }
                .topbar-right { display: flex; align-items: center; gap: 12px; }
                .icon-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #6B7280;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .icon-btn:hover { background: #F3F4F6; color: #ED3237; }
                .notification-badge {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: #ED3237;
                    color: white;
                    font-size: 0.6rem;
                    font-weight: 700;
                    padding: 2px 5px;
                    border-radius: 20px;
                    min-width: 18px;
                    text-align: center;
                }
                .user-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    padding: 6px 12px 6px 8px;
                    border-radius: 40px;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .user-section:hover { background: #F3F4F6; }
                .user-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2D355D, #ED3237);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 0.8rem;
                    overflow: hidden;
                }
                .user-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .user-info { text-align: right; }
                .user-name { font-size: 0.85rem; font-weight: 700; color: #1F2937; }
                .user-status { font-size: 0.65rem; display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
                .status-dot { width: 6px; height: 6px; border-radius: 50%; }
                
                /* Dropdown menus */
                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 8px;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    min-width: 220px;
                    overflow: hidden;
                    z-index: 100;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    font-size: 0.8rem;
                    color: #374151;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    width: 100%;
                    background: none;
                    border: none;
                }
                .dropdown-item:hover { background: #F9FAFB; color: #ED3237; }
                .dropdown-divider { height: 1px; background: #F3F4F6; margin: 4px 0; }
                .status-option { display: flex; align-items: center; gap: 10px; }
                .status-option-dot { width: 8px; height: 8px; border-radius: 50%; }
                .text-red { color: #dc2626; }
                .text-red:hover { background: #fef2f2; color: #dc2626; }

                /* Modal de edición */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 200;
                }
                .edit-modal {
                    background: white;
                    border-radius: 24px;
                    width: 90%;
                    max-width: 420px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                    animation: modalSlideIn 0.2s ease;
                }
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0;
                }
                .modal-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    color: #9ca3af;
                }
                .modal-body {
                    padding: 24px;
                }
                .avatar-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .avatar-preview {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2D355D, #ED3237);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    margin-bottom: 16px;
                    position: relative;
                }
                .avatar-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .avatar-preview span {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: white;
                }
                .avatar-actions {
                    display: flex;
                    gap: 12px;
                }
                .avatar-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 16px;
                    border-radius: 40px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    border: none;
                    transition: all 0.2s ease;
                }
                .avatar-btn.upload {
                    background: #ED3237;
                    color: white;
                }
                .avatar-btn.upload:hover {
                    background: #c4282c;
                }
                .avatar-btn.delete {
                    background: #fef2f2;
                    color: #dc2626;
                }
                .avatar-btn.delete:hover {
                    background: #fee2e2;
                }
                .input-field {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    margin-bottom: 20px;
                }
                .input-field:focus {
                    outline: none;
                    border-color: #ED3237;
                    ring: 2px solid rgba(237,50,55,0.1);
                }
                .modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #f0f0f0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .btn-cancel {
                    padding: 10px 20px;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                    background: white;
                    cursor: pointer;
                    font-weight: 500;
                }
                .btn-save {
                    padding: 10px 20px;
                    border-radius: 12px;
                    border: none;
                    background: #ED3237;
                    color: white;
                    cursor: pointer;
                    font-weight: 600;
                }
                .btn-save:hover { background: #c4282c; }
            `}</style>

            <div className="topbar-modern">
                <div className="topbar-left">
                    <button className="menu-btn" onClick={onToggleSidebar}>
                        <MenuIcon className="w-5 h-5" />
                    </button>
                    
                    {/* SOLO PARA AGENTES NORMALES - Los admins NO ven estos botones */}
                    {!esAdmin && (
                        <div className="area-buttons">
                            <button 
                                className={`area-btn ${areaTrabajo === "clientes" ? "active" : ""}`}
                                onClick={onAreaClientes}
                            >
                                Clientes
                            </button>
                            <button 
                                className={`area-btn ${areaTrabajo === "interno" ? "active" : ""}`}
                                onClick={onAreaInterno}
                            >
                                Interno
                            </button>
                        </div>
                    )}
                </div>

                <div className="topbar-right">
                    <button className="icon-btn" onClick={onRefresh}>
                        <RefreshCwIcon className="w-5 h-5" />
                    </button>

                    <div className="relative" ref={notifRef}>
                        <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
                            <BellIcon className="w-5 h-5" />
                            {notificacionesNoLeidas > 0 && (
                                <span className="notification-badge">{notificacionesNoLeidas > 9 ? "9+" : notificacionesNoLeidas}</span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className="dropdown-menu" style={{ width: "320px", right: 0, left: "auto" }}>
                                <div className="flex justify-between items-center p-3 border-b border-gray-100">
                                    <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
                                    <button onClick={marcarTodasLeidas} className="text-xs text-[#ED3237] hover:underline">Marcar todas</button>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notificaciones.length === 0 ? (
                                        <div className="p-6 text-center text-gray-400 text-sm">No hay notificaciones</div>
                                    ) : (
                                        notificaciones.map(notif => (
                                            <div key={notif.id} className={`dropdown-item ${notif.leida ? "opacity-60" : ""}`} onClick={() => marcarNotificacionLeida(notif.id)} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                                                <div className="flex justify-between w-full">
                                                    <span className="text-sm font-medium">{notif.mensaje}</span>
                                                    {!notif.leida && <span className="w-2 h-2 bg-[#ED3237] rounded-full"></span>}
                                                </div>
                                                <span className="text-xs text-gray-400">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={menuRef}>
                        <div className="user-section" onClick={() => setShowUserMenu(!showUserMenu)}>
                            <div className="user-avatar">
                                {fotoUrl ? (
                                    <img src={fotoUrl} alt={agenteLogueado?.nombre} />
                                ) : (
                                    getInitials(agenteLogueado?.nombre)
                                )}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{agenteLogueado?.nombre || "Agente"}</div>
                                <div className="user-status">
                                    <span className={`status-dot ${estadoInfo.dot.replace("bg-", "")}`} style={{ backgroundColor: estadoInfo.dot === "bg-green-500" ? "#22c55e" : estadoInfo.dot === "bg-red-500" ? "#ef4444" : "#eab308" }}></span>
                                    <span className={estadoInfo.color}>{estadoInfo.texto}</span>
                                </div>
                            </div>
                        </div>

                        {showUserMenu && (
                            <div className="dropdown-menu">
                                <div className="p-3 border-b border-gray-100">
                                    <div className="font-semibold text-gray-900 text-sm">{agenteLogueado?.nombre}</div>
                                    <div className="text-xs text-gray-500">{esAdmin ? "Administrador" : "Agente de soporte"}</div>
                                </div>
                                
                                {/* BOTÓN EDITAR PERFIL */}
                                <button className="dropdown-item" onClick={() => {
                                    setShowUserMenu(false)
                                    setShowEditModal(true)
                                    setEditandoNombre(agenteLogueado?.nombre || "")
                                }}>
                                    <UserIcon className="w-4 h-4" />
                                    <span>Editar perfil</span>
                                </button>
                                
                                {/* SOLO PARA AGENTES NORMALES - Los admins NO ven opciones de estado */}
                                {!esAdmin && (
                                    <div className="p-2">
                                        <div className="text-xs text-gray-400 px-3 py-1">Cambiar estado</div>
                                        <button className="dropdown-item" onClick={() => cambiarEstado("disponible")}>
                                            <div className="status-option">
                                                <span className="status-option-dot" style={{ backgroundColor: "#22c55e" }}></span>
                                                <span>Disponible</span>
                                                {estadoLocal === "disponible" && <CheckIcon className="w-4 h-4 text-green-500 ml-auto" />}
                                            </div>
                                        </button>
                                        <button className="dropdown-item" onClick={() => cambiarEstado("ocupado")}>
                                            <div className="status-option">
                                                <span className="status-option-dot" style={{ backgroundColor: "#ef4444" }}></span>
                                                <span>Ocupado</span>
                                                {estadoLocal === "ocupado" && <CheckIcon className="w-4 h-4 text-red-500 ml-auto" />}
                                            </div>
                                        </button>
                                        <button className="dropdown-item" onClick={() => cambiarEstado("descanso")}>
                                            <div className="status-option">
                                                <span className="status-option-dot" style={{ backgroundColor: "#eab308" }}></span>
                                                <span>Descanso</span>
                                                {estadoLocal === "descanso" && <CheckIcon className="w-4 h-4 text-yellow-500 ml-auto" />}
                                            </div>
                                        </button>
                                    </div>
                                )}
                                
                                <div className="dropdown-divider"></div>
                                
                                <button className="dropdown-item text-red" onClick={cerrarSesion}>
                                    <PowerIcon className="w-4 h-4" />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Editar Perfil */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="edit-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Editar perfil</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="avatar-section">
                                <div className="avatar-preview">
                                    {fotoUrl ? (
                                        <img src={fotoUrl} alt="Perfil" />
                                    ) : (
                                        <span>{getInitials(agenteLogueado?.nombre)}</span>
                                    )}
                                </div>
                                <div className="avatar-actions">
                                    <label className="avatar-btn upload">
                                        <CameraIcon className="w-4 h-4" />
                                        Subir foto
                                        <input 
                                            type="file" 
                                            accept="image/jpeg,image/png,image/jpg,image/webp" 
                                            className="hidden" 
                                            onChange={handleCambiarFoto}
                                            disabled={subiendoFoto}
                                            style={{ display: 'none' }}
                                            ref={fileInputRef}
                                        />
                                    </label>
                                    {fotoUrl && (
                                        <button className="avatar-btn delete" onClick={handleEliminarFoto}>
                                            <TrashIcon className="w-4 h-4" />
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                                {subiendoFoto && <p className="text-xs text-gray-400 mt-2">Subiendo...</p>}
                            </div>
                            
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Nombre</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={editandoNombre} 
                                onChange={(e) => setEditandoNombre(e.target.value)} 
                                placeholder="Tu nombre"
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancelar</button>
                            <button className="btn-save" onClick={guardarCambiosPerfil}>Guardar cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Topbar
