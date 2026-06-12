import Sidebar from "../components/Sidebar"
import ChatList from "../components/ChatList"
import ChatWindow from "../components/ChatWindow"
import Topbar from "../components/Topbar"
import InternoChatPanel from "../components/InternoChatPanel"
import WelcomeScreen from "../components/WelcomeScreen"
import AdminDashboard from "../components/AdminDashboard"
import AdminConfig from "../components/AdminConfig"
import AdminModoFalla from "../components/AdminModoFalla"
import AdminAsignacionMasiva from "../components/AdminAsignacionMasiva"
import NewChatModal from "../components/NewChatModal"
import socket, { connectSocket } from "../sockets/socket"
import { NotificationProvider } from "../contexts/NotificationContext"
import { useEffect, useState, useRef, useCallback } from "react"
import { apiFetch, API_BASE } from "../api"
import { XIcon } from "../components/icons"

function Dashboard({ agenteLogueado, cerrarSesion }) {
    const [areaTrabajo, setAreaTrabajo] = useState(() => {
        return agenteLogueado?.rol === "admin" ? "admin" : "clientes"
    })
    const [selectedChat, setSelectedChat] = useState(null)
    const [chats, setChats] = useState([])
    const [inputMessage, setInputMessage] = useState("")
    const [agentes, setAgentes] = useState([])
    const [agenteActual, setAgenteActual] = useState(agenteLogueado)
    const [agenteVisualizado, setAgenteVisualizado] = useState(null)
    const [filtro, setFiltro] = useState("mis-chats")
    const [busqueda, setBusqueda] = useState("")
    const [cargando, setCargando] = useState(true)
    const [showPerfil, setShowPerfil] = useState(false)
    const [showHistorial, setShowHistorial] = useState(false)
    const [perfilAgente, setPerfilAgente] = useState(null)
    const [historialChats, setHistorialChats] = useState([])
    const [paginaHistorial, setPaginaHistorial] = useState(1)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return window.innerWidth < 768
    })
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [showNewChatModal, setShowNewChatModal] = useState(false)
    const [fotoPerfil, setFotoPerfil] = useState(() => {
        return localStorage.getItem(`foto_perfil_${agenteLogueado?.id}`) || null
    })

    const selectedChatRef = useRef(selectedChat)
    const inputMessageRef = useRef(inputMessage)

    useEffect(() => {
        if (agenteLogueado?.rol === "admin" && areaTrabajo !== "admin" && areaTrabajo !== "asignacion-masiva" && areaTrabajo !== "config" && areaTrabajo !== "modo-falla" && areaTrabajo !== "interno") {
            setAreaTrabajo("admin")
        }
    }, [agenteLogueado?.rol, areaTrabajo])

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileMenuOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])
    useEffect(() => { inputMessageRef.current = inputMessage }, [inputMessage])

    const esAdmin = agenteActual?.rol === "admin"

    useEffect(() => {
        if (agenteActual?.id) {
            console.log("🔌 Conectando socket para agente:", agenteActual.id)
            connectSocket()
        }
    }, [agenteActual])

    const cargarChats = useCallback(async () => {
        try {
            const res = await apiFetch("/api/chats")
            const data = await res.json()
            setChats(data)
        } catch (error) {
            console.error("Error cargando chats:", error)
        }
    }, [])

    const cargarAgentes = async () => {
        try {
            const res = await apiFetch("/api/agentes")
            const data = await res.json()
            const formateados = data.map(a => ({
                ...a,
                chatsAsignados: 0,
                avatar: a.avatar || a.nombre?.charAt(0) || "👤",
                foto_perfil: a.foto_perfil || null
            }))
            setAgentes(formateados)
            
            const miPerfil = formateados.find(a => a.id === agenteActual?.id)
            if (miPerfil?.foto_perfil) {
                const fotoUrl = miPerfil.foto_perfil.startsWith('/uploads/') 
                    ? `${API_BASE}${miPerfil.foto_perfil}` 
                    : miPerfil.foto_perfil
                setFotoPerfil(fotoUrl)
                localStorage.setItem(`foto_perfil_${agenteActual.id}`, fotoUrl)
            }
            
            setCargando(false)
        } catch (error) {
            console.error("Error cargando agentes:", error)
            setCargando(false)
        }
    }

    const cargarMensajes = async (chatId) => {
        try {
            const res = await apiFetch(`/api/mensajes/${chatId}?limit=1000`)
            const data = await res.json()
            const messages = data.messages || data
            return messages.map(msg => ({
                ...msg,
                horaISO: msg.hora,
                hora: new Date(msg.hora).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
            }))
        } catch (error) {
            console.error("Error cargando mensajes:", error)
            return []
        }
    }

    const seleccionarChat = async (chat) => {
        if (chat.estado === 'cerrado') {
            try {
                await apiFetch(`/api/chats/${chat.id}/reabrir`, { method: 'PUT' })
                await cargarChats()
                chat.estado = 'abierto'
            } catch (error) {
                console.error('Error reabriendo chat:', error)
            }
        }

        const mensajes = await cargarMensajes(chat.id)
        const chatConMensajes = { ...chat, mensajes }
        setSelectedChat(chatConMensajes)
        selectedChatRef.current = chatConMensajes

        if (esAdmin && chat.agente_id && chat.agente_id !== agenteActual.id) {
            socket.emit("admin-viendo-chat", {
                chat_id: chat.id,
                agente_id: chat.agente_id,
                admin_nombre: agenteActual.nombre
            })
        }

        if (chat.no_leidos > 0) {
            await apiFetch(`/api/mensajes/${chat.id}/leer`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            })
            cargarChats()
        }
        
        if (window.innerWidth < 768) {
            setMobileMenuOpen(false)
        }
    }

    const enviarMensaje = useCallback(async (opts) => {
        const adjunto = opts?.adjunto
        const mensaje = opts?.texto || inputMessageRef.current
        const chat = selectedChatRef.current
        const mensajeRespondidoId = opts?.mensaje_respondido_id || null

        if (!chat) return
        if (!adjunto && !mensaje?.trim()) return

        const nuevoMensaje = {
            chat_id: chat.id,
            texto: mensaje || "",
            tipo: adjunto?.tipo || "texto",
            url_adjunto: adjunto?.url || null,
            metadata_archivo: adjunto?.metadata ? JSON.stringify(adjunto.metadata) : null,
            mensaje_respondido_id: mensajeRespondidoId
        }

        try {
            if (!adjunto && mensaje.trim().toLowerCase() === "end") {
                const res = await apiFetch("/api/mensajes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(nuevoMensaje)
                })
                const data = await res.json()
                if (!res.ok) {
                    alert(data.error || "No se pudo cerrar el chat")
                    return
                }
                if (data.comando_end) {
                    setInputMessage("")
                    inputMessageRef.current = ""
                    await cargarChats()
                    setSelectedChat(null)
                    return
                }
                alert("No se pudo procesar el comando end")
                return
            }

            const res = await apiFetch("/api/mensajes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevoMensaje)
            })
            if (!res.ok) {
                const err = await res.json()
                alert(err.error || "Error al enviar")
                return
            }

            const mensajeGuardado = await res.json()
            const mensajeConHora = {
                ...mensajeGuardado,
                horaISO: mensajeGuardado.hora,
                hora: new Date(mensajeGuardado.hora).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
            }

            const preview = (mensaje || "").trim() || (adjunto?.tipo === "imagen" ? "📷 Imagen" : adjunto?.tipo === "video" ? "🎥 Video" : "📎 Archivo")

            setSelectedChat(prev => ({
                ...prev,
                mensajes: [...(prev?.mensajes || []), mensajeConHora],
                ultimo_mensaje: preview
            }))

            setInputMessage("")
            inputMessageRef.current = ""
            cargarChats()
        } catch (error) {
            console.error("❌ Error enviando mensaje:", error)
        }
    }, [cargarChats])

    const actualizarEstadoAgente = async (id, estado) => {
        if (agenteActual?.rol === "admin") {
            console.log("⛔ Los administradores no pueden cambiar su estado")
            return
        }
        
        try {
            const response = await apiFetch(`/api/agentes/${id}/estado`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado })
            })
            if (!response.ok) {
                const error = await response.json()
                alert(error.error || "Error al actualizar estado")
                return
            }
            setAgentes(agentes.map(a => a.id === id ? { ...a, estado } : a))
            if (agenteActual?.id === id) setAgenteActual({ ...agenteActual, estado })
            
            if (estado === "disponible" && id === agenteActual?.id) {
                socket.emit("agente-cambio-estado", { agenteId: id, estado })
            }
        } catch (error) {
            console.error("Error actualizando estado:", error)
            alert("Error al actualizar estado")
        }
    }

    const cerrarChat = async () => {
        if (!selectedChatRef.current) return
        if (!confirm("¿Cerrar este chat?")) return

        try {
            await apiFetch(`/api/chats/${selectedChatRef.current.id}/cerrar`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            })
            await cargarChats()
            setSelectedChat(null)
        } catch (error) {
            console.error("Error:", error)
        }
    }

    const transferirChat = async (nuevoAgenteId) => {
        if (!selectedChatRef.current) return

        try {
            const res = await apiFetch(`/api/chats/${selectedChatRef.current.id}/transferir`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nuevo_agente_id: Number(nuevoAgenteId) })
            })
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                alert(errorData.error || "Error al transferir chat")
                return
            }
            
            await cargarChats()
            setSelectedChat(null)
            alert("✅ Chat transferido correctamente")
        } catch (error) {
            console.error("Error en transferirChat:", error)
            alert("Error al transferir chat")
        }
    }

    const tomarChat = async () => {
        if (!selectedChatRef.current) return
        try {
            const res = await apiFetch(`/api/chats/${selectedChatRef.current.id}/tomar`, { method: "PUT" })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                alert(data.error || "No se pudo tomar el chat")
                return
            }
            await cargarChats()
            await seleccionarChat(selectedChatRef.current)
        } catch (error) {
            console.error("Error:", error)
        }
    }

    const reabrirChat = async () => {
        if (!selectedChatRef.current) return

        try {
            await apiFetch(`/api/chats/${selectedChatRef.current.id}/reabrir`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            })
            await cargarChats()
            await seleccionarChat(selectedChatRef.current)
        } catch (error) {
            console.error("Error:", error)
        }
    }

    const cargarPerfilAgente = async (agenteId) => {
        try {
            const res = await apiFetch(`/api/agentes/${agenteId}/perfil?dias=30`)
            const data = await res.json()
            setPerfilAgente(data)
            setShowPerfil(true)
            
            if (agenteId === agenteActual.id) {
                socket.emit("agente-abrio-perfil")
            }
        } catch (error) {
            console.error("Error cargando perfil:", error)
            alert("Error al cargar perfil del asesor")
        }
    }

    const cargarHistorialChats = async (pagina = 1) => {
        try {
            const res = await apiFetch(`/api/historial-chats?page=${pagina}&limit=20`)
            const data = await res.json()
            setHistorialChats(data.chats || [])
            setPaginaHistorial(pagina)
            setShowHistorial(true)
        } catch (error) {
            console.error("Error cargando historial:", error)
            alert("Error al cargar historial de chats")
        }
    }

    useEffect(() => {
        cargarChats()
        cargarAgentes()
    }, [])

    useEffect(() => {
        if (!socket) return;

        const handleRecargarChats = () => cargarChats();
        const handleNuevoMensajeCliente = async (data) => {
            await cargarChats();
            const chat = selectedChatRef.current;
            if (chat && chat.id === data.chat_id) {
                const nuevosMensajes = await cargarMensajes(data.chat_id);
                setSelectedChat(prev => prev ? { ...prev, mensajes: nuevosMensajes } : prev);
            }
        };
        const handleChatAsignado = async (data) => {
            await cargarChats();
            if (data.agente_id === agenteActual?.id) await cargarChats();
        };
        const handleMensajeRecibido = async (data) => {
            await cargarChats();
            const chat = selectedChatRef.current;
            if (chat && chat.id === data.chat_id) {
                const nuevosMensajes = await cargarMensajes(data.chat_id);
                setSelectedChat(prev => prev ? { ...prev, mensajes: nuevosMensajes } : prev);
            }
        };
        const handleChatEnEspera = () => cargarChats();

        socket.on("recargar-chats", handleRecargarChats);
        socket.on("nuevo-mensaje-cliente", handleNuevoMensajeCliente);
        socket.on("chat-asignado", handleChatAsignado);
        socket.on("mensaje-recibido", handleMensajeRecibido);
        socket.on("chat-en-espera", handleChatEnEspera);

        return () => {
            socket.off("recargar-chats", handleRecargarChats);
            socket.off("nuevo-mensaje-cliente", handleNuevoMensajeCliente);
            socket.off("chat-asignado", handleChatAsignado);
            socket.off("mensaje-recibido", handleMensajeRecibido);
            socket.off("chat-en-espera", handleChatEnEspera);
        };
    }, [agenteActual?.id, cargarChats]);

    useEffect(() => {
        if (chats.length && agentes.length) {
            const actualizados = agentes.map(a => ({
                ...a,
                chatsAsignados: chats.filter(c => c.agente_id === a.id && c.estado === "abierto").length
            }))
            setAgentes(actualizados)
            if (agenteActual) {
                const actual = actualizados.find(a => a.id === agenteActual.id)
                if (actual) setAgenteActual(actual)
            }
        }
    }, [chats])

    useEffect(() => {
        const handleFotoActualizada = (data) => {
            setAgentes(prev => prev.map(a => 
                a.id === data.agente_id ? { ...a, foto_perfil: data.foto_url } : a
            ))
            if (agenteActual?.id === data.agente_id) {
                const fotoUrl = data.foto_url.startsWith('/uploads/') 
                    ? `${API_BASE}${data.foto_url}` 
                    : data.foto_url
                setFotoPerfil(fotoUrl)
                localStorage.setItem(`foto_perfil_${data.agente_id}`, fotoUrl)
            }
        }
        socket.on('foto-perfil-actualizada', handleFotoActualizada)
        return () => socket.off('foto-perfil-actualizada', handleFotoActualizada)
    }, [agenteActual?.id])

    const getInitials = (nombre) => {
        if (!nombre) return "??"
        return nombre.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    }

    const chatsFiltrados = chats
        .filter(c => {
            const mismoAsesor = (a, b) => a != null && b != null && Number(a) === Number(b)
            const sinAsignarAbierto = c.agente_id == null && c.estado !== "cerrado" && c.en_espera

            if (busqueda) return true

            if (esAdmin) {
                if (agenteVisualizado) return mismoAsesor(c.agente_id, agenteVisualizado.id)
                if (filtro === "mis-chats") return (mismoAsesor(c.agente_id, agenteActual.id) || sinAsignarAbierto) && c.estado !== "cerrado"
                if (filtro === "no-leidos") return c.no_leidos > 0
                return true
            }
            if (filtro === "mis-chats") return (mismoAsesor(c.agente_id, agenteActual?.id) || sinAsignarAbierto) && c.estado !== "cerrado"
            if (filtro === "no-leidos") return (mismoAsesor(c.agente_id, agenteActual?.id) || sinAsignarAbierto) && c.no_leidos > 0
            return true
        })
        .filter(c => {
            const match = !busqueda ||
                c.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
                c.cliente_numero?.includes(busqueda)
            return match
        })
        .map(c => ({
            ...c,
            nombre: c.cliente_nombre,
            numero: c.cliente_numero,
            ultimoMensaje: c.ultimo_mensaje,
            hora: c.ultimo_mensaje_hora
                ? new Date(c.ultimo_mensaje_hora).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : ""
        }))

    if (cargando) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-white to-[#FBF8F3]">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-[#E5DDD0]/50"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-[#ED3237] border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-[#7A7567] font-medium">Cargando panel de control...</p>
                    <p className="text-[#9A937F] text-sm mt-2">M@STV Producciones</p>
                </div>
            </div>
        )
    }

    return (
        <NotificationProvider agenteActual={agenteActual}>
            <div className="flex h-screen bg-gradient-to-br from-white to-[#FBF8F3] overflow-hidden">
                {/* Sidebar */}
                <div className={`
                    fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-out
                    md:relative md:translate-x-0
                    ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    h-full shadow-glow
                `}>
                    <Sidebar 
                        activeTab={areaTrabajo === "clientes" ? "chats" : areaTrabajo === "interno" ? "agentes" : areaTrabajo === "config" ? "config" : areaTrabajo === "modo-falla" ? "modo-falla" : areaTrabajo === "asignacion-masiva" ? "asignacion-masiva" : "dashboard"}
                        onTabChange={(tab) => {
                            if (tab === "chats") setAreaTrabajo("clientes")
                            else if (tab === "agentes") setAreaTrabajo("interno")
                            else if (tab === "dashboard") setAreaTrabajo("admin")
                            else if (tab === "config") setAreaTrabajo("config")
                            else if (tab === "modo-falla") setAreaTrabajo("modo-falla")
                            else if (tab === "asignacion-masiva") setAreaTrabajo("asignacion-masiva")
                            else if (tab === "sin-asignar") setFiltro("sin-asignar")
                            else if (tab === "no-leidos") setFiltro("no-leidos")
                            else setAreaTrabajo(tab)
                            if (window.innerWidth < 768) setMobileMenuOpen(false)
                        }}
                        onLogout={cerrarSesion}
                        agenteLogueado={agenteActual}
                        agentes={agentes}
                        chats={chats}
                        esAdmin={esAdmin}
                        collapsed={sidebarCollapsed}
                        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                        mobileMenuOpen={mobileMenuOpen}
                        setMobileMenuOpen={setMobileMenuOpen}
                    />
                </div>

                {/* Mobile Overlay */}
                {mobileMenuOpen && (
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )}
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Topbar 
                        agenteLogueado={agenteLogueado}
                        cerrarSesion={cerrarSesion}
                        areaTrabajo={areaTrabajo}
                        onAreaClientes={() => !esAdmin && setAreaTrabajo("clientes")}
                        onAreaInterno={() => setAreaTrabajo("interno")}
                        onAreaAdmin={() => esAdmin && setAreaTrabajo("admin")}
                        onToggleSidebar={() => {
                            if (window.innerWidth < 768) {
                                setMobileMenuOpen(!mobileMenuOpen)
                            } else {
                                setSidebarCollapsed(!sidebarCollapsed)
                            }
                        }}
                        esAdmin={esAdmin}
                        onRefresh={() => {
                            cargarChats()
                            cargarAgentes()
                        }}
                        actualizarEstadoAgente={actualizarEstadoAgente}
                        fotoPerfil={fotoPerfil}
                        setFotoPerfil={setFotoPerfil}
                    />

                    <div className="flex-1 overflow-auto p-4">
                        {/* ========== ADMIN: Solo paneles de administración ========== */}
                        {esAdmin && (
                            <>
                                {areaTrabajo === "admin" && (
                                    <AdminDashboard 
                                        agenteActual={agenteActual}
                                        cargarAgentes={cargarAgentes}
                                    />
                                )}
                                {areaTrabajo === "asignacion-masiva" && (
                                    <AdminAsignacionMasiva 
                                        agenteActual={agenteActual}
                                    />
                                )}
                                {areaTrabajo === "config" && (
                                    <AdminConfig 
                                        agenteActual={agenteActual}
                                    />
                                )}
                                {areaTrabajo === "modo-falla" && (
                                    <AdminModoFalla 
                                        agenteActual={agenteActual}
                                    />
                                )}
                                {areaTrabajo === "interno" && (
                                    <InternoChatPanel 
                                        agenteActual={agenteActual} 
                                        agentes={agentes}
                                    />
                                )}
                            </>
                        )}

                        {/* ========== AGENTE NORMAL: Vista de chats ========== */}
                        {!esAdmin && areaTrabajo === "clientes" && (
                            <div className="flex flex-col md:flex-row h-full gap-4">
                                {/* Chat List - Izquierda */}
                                <div className="w-full md:w-96 lg:w-[380px] bg-white/80 backdrop-blur-md rounded-2xl shadow-glow border border-[#E5DDD0]/50 overflow-hidden">
                                    <ChatList 
                                        chats={chatsFiltrados} 
                                        selectedChat={selectedChat} 
                                        seleccionarChat={seleccionarChat}
                                        onNuevaConversacion={() => setShowNewChatModal(true)}
                                        busqueda={busqueda}
                                        onBusquedaChange={setBusqueda}
                                    />
                                </div>

                                {/* Chat Window - Centro */}
                                <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl shadow-glow border border-[#E5DDD0]/50 overflow-hidden">
                                    {selectedChat ? (
                                        <ChatWindow
                                            selectedChat={selectedChat}
                                            inputMessage={inputMessage}
                                            setInputMessage={setInputMessage}
                                            enviarMensaje={enviarMensaje}
                                            agenteActual={agenteActual}
                                            cargarChats={cargarChats}
                                            setSelectedChat={setSelectedChat}
                                            cerrarChat={cerrarChat}
                                            transferirChat={transferirChat}
                                            tomarChat={tomarChat}
                                            reabrirChat={reabrirChat}
                                            agentes={agentes}
                                            esAdmin={esAdmin}
                                            modoVisualizacion={esAdmin && agenteVisualizado ? `Visualizando como: ${agenteVisualizado.nombre}` : null}
                                            cargarMensajes={cargarMensajes}
                                            onBack={() => setSelectedChat(null)}
                                        />
                                    ) : (
                                        <WelcomeScreen
                                            agenteActual={agenteActual}
                                            onVerHistorial={() => cargarHistorialChats(1)}
                                            onVerPerfil={() => cargarPerfilAgente(agenteActual.id)}
                                            chats={chats}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ========== AGENTE NORMAL: Chat Interno ========== */}
                        {!esAdmin && areaTrabajo === "interno" && (
                            <InternoChatPanel 
                                agenteActual={agenteActual} 
                                agentes={agentes}
                            />
                        )}
                    </div>

                    {/* Modales (Perfil, Historial, NewChat) */}
                    {showPerfil && perfilAgente && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-glow border border-[#E5DDD0]/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-[#E5DDD0]/50 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-sm">
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-[#1F2A4D] to-[#ED3237] bg-clip-text text-transparent">
                                        📊 Perfil de Asesor
                                    </h2>
                                    <button onClick={() => setShowPerfil(false)} className="text-[#9A937F] hover:text-[#1F2A4D] transition-colors">
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1F2A4D] to-[#ED3237] flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-glow">
                                            {perfilAgente.agente?.foto_perfil ? (
                                                <img 
                                                    src={perfilAgente.agente.foto_perfil} 
                                                    alt={perfilAgente.agente?.nombre}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                getInitials(perfilAgente.agente?.nombre)
                                            )}
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <h3 className="text-xl font-semibold text-[#1F2A4D]">{perfilAgente.agente?.nombre}</h3>
                                            <p className="text-[#7A7567]">
                                                {perfilAgente.agente?.rol === "admin" ? "Administrador" : "Agente de Soporte"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-br from-[#ED3237]/10 to-[#ED3237]/5 p-4 rounded-xl text-center border border-[#ED3237]/20">
                                            <div className="text-3xl font-bold text-[#ED3237]">{perfilAgente.chats_activos || 0}</div>
                                            <div className="text-sm text-[#7A7567] mt-1">Chats activos</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-[#1F2A4D]/10 to-[#1F2A4D]/5 p-4 rounded-xl text-center border border-[#1F2A4D]/20">
                                            <div className="text-3xl font-bold text-[#1F2A4D]">{perfilAgente.estadisticas?.total_chats || 0}</div>
                                            <div className="text-sm text-[#7A7567] mt-1">Chats atendidos</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showHistorial && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-glow border border-[#E5DDD0]/50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-[#E5DDD0]/50 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-sm">
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-[#1F2A4D] to-[#ED3237] bg-clip-text text-transparent">
                                        📜 Historial de Chats
                                    </h2>
                                    <button onClick={() => setShowHistorial(false)} className="text-[#9A937F] hover:text-[#1F2A4D] transition-colors">
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    {historialChats.length > 0 ? (
                                        <div className="space-y-4">
                                            {historialChats.map((h) => (
                                                <div key={h.id} className="bg-[#FBF8F3] p-4 rounded-xl border border-[#E5DDD0]/50 hover:shadow-glow transition-all duration-300">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                                                        <div>
                                                            <div className="font-semibold text-[#1F2A4D]">{h.cliente_nombre || "Cliente"}</div>
                                                            <div className="text-sm text-[#7A7567]">{h.cliente_numero}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs text-[#9A937F]">{new Date(h.fecha_cierre).toLocaleDateString("es-CO")}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-sm text-[#7A7567]">
                                                        <span>📊 {h.total_mensajes} mensajes</span>
                                                        <span>👤 {h.agente_nombre || "Sin asignar"}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-[#9A937F]">No hay historial de chats disponible</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <NewChatModal
                        isOpen={showNewChatModal}
                        onClose={() => setShowNewChatModal(false)}
                        onCrearChat={async (numero) => {
                            try {
                                const response = await apiFetch('/api/chats', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ cliente_numero: numero })
                                })
                                if (!response.ok) {
                                    const error = await response.json()
                                    throw new Error(error.error || 'Error al crear chat')
                                }
                                const nuevoChat = await response.json()
                                await cargarChats()
                                setSelectedChat(nuevoChat)
                            } catch (error) {
                                console.error('Error creando chat:', error)
                                throw error
                            }
                        }}
                    />
                </div>
            </div>
        </NotificationProvider>
    )
}

export default Dashboard
