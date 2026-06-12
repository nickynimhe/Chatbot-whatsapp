import { useState, useEffect } from "react"
import { useNotifications } from "../contexts/NotificationContext"
import socket from "../sockets/socket"
import { API_BASE } from "../api"
import { 
    BarChartIcon, 
    MessageCircleIcon, 
    UsersIcon, 
    SettingsIcon, 
    LogOutIcon,
    ClockIcon,
    AlertCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PowerIcon
} from "./icons"

function Sidebar({ activeTab, onTabChange, onLogout, agenteLogueado, agentes, chats, esAdmin, collapsed, onToggle }) {
    const [active, setActive] = useState(activeTab || (esAdmin ? "dashboard" : "chats"))
    const [agentesActualizados, setAgentesActualizados] = useState(agentes || [])
    const [fotoPerfilLocal, setFotoPerfilLocal] = useState(null)
    const { noLeidosGlobal, noLeidosInternos, contadoresActivos } = useNotifications()

    // Actualizar agentes cuando cambien desde el padre
    useEffect(() => {
        setAgentesActualizados(agentes || [])
    }, [agentes])

    // Cargar foto de perfil del agente logueado desde localStorage
    useEffect(() => {
        if (agenteLogueado?.id) {
            const fotoGuardada = localStorage.getItem(`foto_perfil_${agenteLogueado.id}`)
            if (fotoGuardada) {
                setFotoPerfilLocal(fotoGuardada)
            } else if (agenteLogueado.foto_perfil) {
                const fotoUrl = agenteLogueado.foto_perfil.startsWith('/uploads/') 
                    ? `${API_BASE}${agenteLogueado.foto_perfil}` 
                    : agenteLogueado.foto_perfil
                setFotoPerfilLocal(fotoUrl)
                localStorage.setItem(`foto_perfil_${agenteLogueado.id}`, fotoUrl)
            }
        }
    }, [agenteLogueado?.id, agenteLogueado?.foto_perfil])

    // Escuchar actualizaciones de fotos en tiempo real
    useEffect(() => {
        if (!socket) return

        const handleFotoActualizada = (data) => {
            if (data.agente_id === agenteLogueado?.id) {
                const fotoUrl = data.foto_url.startsWith('/uploads/') 
                    ? `${API_BASE}${data.foto_url}` 
                    : data.foto_url
                setFotoPerfilLocal(fotoUrl)
                localStorage.setItem(`foto_perfil_${agenteLogueado.id}`, fotoUrl)
            }
            // Actualizar también en la lista de agentes
            setAgentesActualizados(prev => prev.map(a => 
                a.id === data.agente_id ? { ...a, foto_perfil: data.foto_url } : a
            ))
        }

        const handleAgenteEstadoCambio = (data) => {
            console.log("📡 Estado actualizado:", data)
            setAgentesActualizados(prev => prev.map(a => 
                a.id === data.agenteId ? { ...a, estado: data.estado } : a
            ))
        }

        socket.on("foto-perfil-actualizada", handleFotoActualizada)
        socket.on("agente-estado-cambio", handleAgenteEstadoCambio)

        return () => {
            socket.off("foto-perfil-actualizada", handleFotoActualizada)
            socket.off("agente-estado-cambio", handleAgenteEstadoCambio)
        }
    }, [socket, agenteLogueado?.id])

    // Calcular estadísticas en tiempo real
    const misChatsActivos = chats?.filter(c => c.agente_id === agenteLogueado?.id && c.estado === "abierto").length || 0
    const agentesDisponibles = agentesActualizados?.filter(a => a.estado === "disponible" && a.id !== agenteLogueado?.id && a.rol !== "admin").length || 0
    const chatsSinAsignar = chats?.filter(c => c.agente_id === null && c.estado === "abierto" && c.en_espera === true).length || 0
    const chatsNoLeidos = chats?.filter(c => c.no_leidos > 0 && c.agente_id === agenteLogueado?.id).length || 0

    // Menús según rol
    const menuItemsAdmin = [
        { id: "dashboard", icon: BarChartIcon, label: "Dashboard", badge: null, badgeColor: null },
        { id: "sin-asignar", icon: ClockIcon, label: "Sin Asignar", badge: chatsSinAsignar, badgeColor: "orange" },
        { id: "asignacion-masiva", icon: UsersIcon, label: "Asignación Masiva", badge: chatsSinAsignar, badgeColor: "green" },
        { id: "agentes", icon: UsersIcon, label: "Agentes", badge: null, badgeColor: null },
        { id: "modo-falla", icon: PowerIcon, label: "Modo Falla", badge: null, badgeColor: null },
        { id: "config", icon: SettingsIcon, label: "Configuración", badge: null, badgeColor: null },
    ]

    const menuItemsAgente = [
        { id: "chats", icon: MessageCircleIcon, label: "Mis Chats", badge: misChatsActivos, badgeColor: "blue" },
        { id: "agentes", icon: UsersIcon, label: "Compañeros", badge: noLeidosInternos, badgeColor: "red" },
        { id: "no-leidos", icon: AlertCircleIcon, label: "No Leídos", badge: chatsNoLeidos, badgeColor: "red" },
    ]

    const finalMenuItems = esAdmin ? menuItemsAdmin : menuItemsAgente

    const handleTabChange = (id) => {
        setActive(id)
        if (onTabChange) {
            if (id === "chats") onTabChange("clientes")
            else if (id === "agentes") onTabChange("interno")
            else if (id === "dashboard") onTabChange("admin")
            else if (id === "config") onTabChange("config")
            else if (id === "modo-falla") onTabChange("modo-falla")
            else if (id === "sin-asignar") onTabChange("sin-asignar")
            else if (id === "asignacion-masiva") onTabChange("asignacion-masiva")
            else if (id === "no-leidos") onTabChange("no-leidos")
            else onTabChange(id)
        }
    }

    const iniciales = agenteLogueado?.nombre
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "SP"

    const getEstadoInfo = () => {
        if (esAdmin) return { texto: "Administrador", color: "#a78bfa", dot: "#8b5cf6" }
        switch(agenteLogueado?.estado) {
            case "disponible": return { texto: "Disponible", color: "#4ade80", dot: "#22c55e" }
            case "ocupado": return { texto: "Ocupado", color: "#f87171", dot: "#ef4444" }
            default: return { texto: "Descanso", color: "#fbbf24", dot: "#f59e0b" }
        }
    }
    const estadoInfo = getEstadoInfo()

    const badgeColors = {
        orange: { bg: "#fff3e0", text: "#e65100" },
        green:  { bg: "#e8f5e9", text: "#2e7d32" },
        blue:   { bg: "#e3f2fd", text: "#1565c0" },
        red:    { bg: "#ffebee", text: "#c62828" },
    }

    const otrosAgentes = agentesActualizados?.filter(a => a.id !== agenteLogueado?.id && a.rol !== "admin") || []

    const getEstadoColor = (estado) => {
        switch(estado) {
            case "disponible": return "#22c55e"
            case "ocupado": return "#ef4444"
            default: return "#f59e0b"
        }
    }

    const getFotoUrl = (fotoPerfil) => {
        if (!fotoPerfil) return null
        if (fotoPerfil.startsWith('/uploads/')) {
            return `${API_BASE}${fotoPerfil}`
        }
        return fotoPerfil
    }

    const fotoUrlAgente = fotoPerfilLocal || (agenteLogueado?.foto_perfil ? 
        (agenteLogueado.foto_perfil.startsWith('/uploads/') ? `${API_BASE}${agenteLogueado.foto_perfil}` : agenteLogueado.foto_perfil) 
        : null)

    return (
        <>
            <style>{`
                .sb-root {
                    height: 100%;
                    width: ${collapsed ? "72px" : "260px"};
                    background: linear-gradient(180deg, #1a1f36 0%, #0f1320 100%);
                    display: flex;
                    flex-direction: column;
                    transition: width 0.25s ease;
                    flex-shrink: 0;
                    font-family: 'DM Sans', system-ui, sans-serif;
                    position: relative;
                    overflow: hidden;
                }
                .sb-root::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: radial-gradient(circle at 20% 30%, rgba(237, 50, 55, 0.08), transparent 70%);
                    pointer-events: none;
                }
                .sb-header {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding: 16px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    position: relative;
                    z-index: 1;
                }
                .sb-toggle {
                    background: rgba(255,255,255,0.05);
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 8px;
                    color: rgba(255,255,255,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .sb-toggle:hover { 
                    background: rgba(237,50,55,0.2); 
                    color: #ED3237; 
                }
                .sb-toggle svg { width: 16px; height: 16px; }
                .sb-nav {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    position: relative;
                    z-index: 1;
                }
                .sb-nav::-webkit-scrollbar { width: 4px; }
                .sb-nav::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
                .sb-nav::-webkit-scrollbar-thumb { background: rgba(237,50,55,0.3); border-radius: 4px; }
                .sb-section-label {
                    font-size: 0.6rem;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.25);
                    padding: 10px 10px 6px;
                }
                .sb-nav-item {
                    display: flex;
                    align-items: center;
                    justify-content: ${collapsed ? "center" : "space-between"};
                    padding: 8px ${collapsed ? "0" : "10px"};
                    border-radius: 10px;
                    cursor: pointer;
                    border: none;
                    background: none;
                    width: 100%;
                    transition: all 0.2s ease;
                    color: rgba(255,255,255,0.5);
                    font-family: inherit;
                    text-align: left;
                    position: relative;
                }
                .sb-nav-item:hover { 
                    background: rgba(255,255,255,0.06); 
                    color: rgba(255,255,255,0.85);
                }
                .sb-nav-item.active {
                    background: linear-gradient(90deg, rgba(237,50,55,0.15), rgba(45,53,93,0.05));
                    color: #fff;
                }
                .sb-nav-item.active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 3px;
                    height: 20px;
                    background: #ED3237;
                    border-radius: 0 3px 3px 0;
                }
                .sb-nav-item-left { 
                    display: flex; 
                    align-items: center; 
                    gap: 10px;
                    justify-content: ${collapsed ? "center" : "flex-start"};
                    width: ${collapsed ? "100%" : "auto"};
                }
                .sb-nav-icon { 
                    width: 18px; 
                    height: 18px; 
                    flex-shrink: 0;
                }
                .sb-nav-item.active .sb-nav-icon {
                    color: #ED3237;
                }
                .sb-nav-label { 
                    font-size: 0.82rem; 
                    font-weight: 500; 
                    white-space: nowrap;
                }
                .sb-badge {
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 2px 7px;
                    border-radius: 100px;
                    flex-shrink: 0;
                }
                .sb-agentes-list {
                    margin-top: 8px;
                    padding: 0 4px;
                }
                .sb-agente-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 8px;
                    border-radius: 10px;
                    transition: all 0.2s ease;
                }
                .sb-agente-item:hover {
                    background: rgba(255,255,255,0.05);
                }
                .sb-agente-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2D355D, #ED3237);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #fff;
                    flex-shrink: 0;
                    position: relative;
                    overflow: hidden;
                }
                .sb-agente-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .sb-agente-estado-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid #1a1f36;
                }
                .sb-agente-info {
                    flex: 1;
                    min-width: 0;
                }
                .sb-agente-nombre {
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: rgba(255,255,255,0.7);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .sb-agente-estado-texto {
                    font-size: 0.6rem;
                    color: rgba(255,255,255,0.35);
                }
                .sb-agente-badge {
                    font-size: 0.6rem;
                    font-weight: 700;
                    padding: 1px 5px;
                    border-radius: 20px;
                    background: rgba(237,50,55,0.2);
                    color: #ED3237;
                }
                .sb-agentes-list-collapsed {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    margin-top: 12px;
                }
                .sb-agente-item-collapsed {
                    position: relative;
                    display: flex;
                    justify-content: center;
                }
                .sb-agente-avatar-collapsed {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2D355D, #ED3237);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #fff;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    overflow: hidden;
                }
                .sb-agente-avatar-collapsed img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .sb-agente-avatar-collapsed:hover {
                    transform: scale(1.05);
                }
                .sb-agente-estado-dot-collapsed {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid #1a1f36;
                }
                .sb-agente-tooltip {
                    visibility: hidden;
                    position: absolute;
                    left: 48px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: #1a1f36;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    white-space: nowrap;
                    z-index: 100;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                .sb-agente-item-collapsed:hover .sb-agente-tooltip {
                    visibility: visible;
                }
                .sb-footer { 
                    border-top: 1px solid rgba(255,255,255,0.06); 
                    padding: 12px 10px;
                    position: relative;
                    z-index: 1;
                }
                .sb-user-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: ${collapsed ? "8px 0" : "10px 12px"};
                    border-radius: 12px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
                    margin-bottom: 8px;
                    justify-content: ${collapsed ? "center" : "flex-start"};
                }
                .sb-avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #2D355D, #ED3237);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #fff;
                    flex-shrink: 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    position: relative;
                    overflow: hidden;
                }
                .sb-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .sb-user-status-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid #1a1f36;
                }
                .sb-user-name { 
                    font-size: 0.8rem; 
                    font-weight: 600; 
                    color: #fff; 
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                }
                .sb-user-role { 
                    font-size: 0.68rem; 
                    color: rgba(255,255,255,0.5); 
                    margin-top: 2px; 
                    display: flex; 
                    align-items: center; 
                    gap: 4px; 
                }
                .sb-status-dot { 
                    width: 6px; 
                    height: 6px; 
                    border-radius: 50%; 
                }
                .sb-stat-row { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 6px; 
                    margin-bottom: 8px; 
                }
                .sb-stat-card {
                    background: rgba(255,255,255,0.04);
                    border-radius: 8px;
                    padding: 8px;
                    text-align: center;
                }
                .sb-stat-num { 
                    font-size: 1rem; 
                    font-weight: 700; 
                    color: #fff; 
                    display: block; 
                }
                .sb-stat-lbl { 
                    font-size: 0.55rem; 
                    font-weight: 600; 
                    text-transform: uppercase; 
                    letter-spacing: 0.07em; 
                    color: rgba(255,255,255,0.4); 
                    display: block; 
                    margin-top: 2px; 
                }
                .sb-logout {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: ${collapsed ? "center" : "flex-start"};
                    gap: 8px;
                    padding: 8px ${collapsed ? "0" : "12px"};
                    border-radius: 10px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    color: rgba(255,255,255,0.5);
                    font-family: inherit;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                    margin-top: 4px;
                }
                .sb-logout:hover { 
                    background: rgba(237,50,55,0.15); 
                    color: #ED3237;
                }
                .sb-logout svg { 
                    width: 16px; 
                    height: 16px; 
                    flex-shrink: 0;
                }
            `}</style>

            <div className="sb-root">
                <div className="sb-header">
                    <button className="sb-toggle" onClick={onToggle} title={collapsed ? "Expandir" : "Colapsar"}>
                        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                    </button>
                </div>

                <nav className="sb-nav">
                    {!collapsed && <div className="sb-section-label">MENÚ</div>}
                    {finalMenuItems.map(item => {
                        const Icon = item.icon
                        const isActive = active === item.id
                        const bc = item.badge > 0 && item.badgeColor ? badgeColors[item.badgeColor] : null
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabChange(item.id)}
                                className={`sb-nav-item ${isActive ? "active" : ""}`}
                                title={collapsed ? item.label : ""}
                            >
                                <div className="sb-nav-item-left">
                                    <Icon className={`sb-nav-icon ${isActive ? "active" : ""}`} />
                                    {!collapsed && <span className="sb-nav-label">{item.label}</span>}
                                </div>
                                {!collapsed && contadoresActivos && bc && item.badge > 0 && (
                                    <span className="sb-badge" style={{ background: bc.bg, color: bc.text }}>
                                        {item.badge > 99 ? "99+" : item.badge}
                                    </span>
                                )}
                            </button>
                        )
                    })}

                    {/* Compañeros - Modo expandido con FOTO */}
                    {!esAdmin && !collapsed && otrosAgentes.length > 0 && (
                        <>
                            <div className="sb-section-label" style={{ marginTop: 12 }}>EQUIPO</div>
                            <div className="sb-agentes-list">
                                {otrosAgentes.map(agente => {
                                    const fotoUrl = getFotoUrl(agente.foto_perfil)
                                    return (
                                        <div key={agente.id} className="sb-agente-item">
                                            <div className="sb-agente-avatar">
                                                {fotoUrl ? (
                                                    <img src={fotoUrl} alt={agente.nombre} />
                                                ) : (
                                                    agente.nombre?.charAt(0).toUpperCase() || "A"
                                                )}
                                                <div 
                                                    className="sb-agente-estado-dot"
                                                    style={{ background: getEstadoColor(agente.estado) }}
                                                />
                                            </div>
                                            <div className="sb-agente-info">
                                                <div className="sb-agente-nombre">{agente.nombre}</div>
                                                <div className="sb-agente-estado-texto">
                                                    {agente.estado === "disponible" ? "Disponible" : agente.estado === "ocupado" ? "Ocupado" : "Descanso"}
                                                </div>
                                            </div>
                                            {agente.chatsAsignados > 0 && (
                                                <span className="sb-agente-badge">{agente.chatsAsignados}</span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {/* Compañeros - Modo colapsado con FOTO */}
                    {!esAdmin && collapsed && otrosAgentes.length > 0 && (
                        <div className="sb-agentes-list-collapsed">
                            {otrosAgentes.map(agente => {
                                const fotoUrl = getFotoUrl(agente.foto_perfil)
                                return (
                                    <div key={agente.id} className="sb-agente-item-collapsed">
                                        <div className="sb-agente-avatar-collapsed">
                                            {fotoUrl ? (
                                                <img src={fotoUrl} alt={agente.nombre} />
                                            ) : (
                                                agente.nombre?.charAt(0).toUpperCase() || "A"
                                            )}
                                            <div 
                                                className="sb-agente-estado-dot-collapsed"
                                                style={{ background: getEstadoColor(agente.estado) }}
                                            />
                                        </div>
                                        <span className="sb-agente-tooltip">{agente.nombre}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </nav>

                <div className="sb-footer">
                    {!collapsed && (
                        <>
                            <div className="sb-user-card">
                                <div className="sb-avatar">
                                    {fotoUrlAgente ? (
                                        <img src={fotoUrlAgente} alt={agenteLogueado?.nombre} />
                                    ) : (
                                        iniciales
                                    )}
                                    <div 
                                        className="sb-user-status-dot"
                                        style={{ background: estadoInfo.dot }}
                                    />
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div className="sb-user-name">
                                        {agenteLogueado?.nombre || "Agente"}
                                        {esAdmin && <span style={{ color: "#a78bfa", marginLeft: 4, fontSize: "0.65rem" }}>Admin</span>}
                                    </div>
                                    <div className="sb-user-role">
                                        <span className="sb-status-dot" style={{ background: estadoInfo.dot }} />
                                        {estadoInfo.texto}
                                    </div>
                                </div>
                            </div>
                            {!esAdmin && (
                                <div className="sb-stat-row">
                                    <div className="sb-stat-card">
                                        <span className="sb-stat-num">{misChatsActivos}</span>
                                        <span className="sb-stat-lbl">Chats</span>
                                    </div>
                                    <div className="sb-stat-card">
                                        <span className="sb-stat-num">{agentesDisponibles}</span>
                                        <span className="sb-stat-lbl">Online</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {collapsed && (
                        <div className="sb-user-card" style={{ justifyContent: "center", padding: "8px 0" }}>
                            <div className="sb-avatar">
                                {fotoUrlAgente ? (
                                    <img src={fotoUrlAgente} alt={agenteLogueado?.nombre} />
                                ) : (
                                    iniciales
                                )}
                                <div 
                                    className="sb-user-status-dot"
                                    style={{ background: estadoInfo.dot }}
                                />
                            </div>
                        </div>
                    )}
                    <button className="sb-logout" onClick={onLogout} title="Cerrar sesión">
                        <LogOutIcon />
                        {!collapsed && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </div>
        </>
    )
}

export default Sidebar

