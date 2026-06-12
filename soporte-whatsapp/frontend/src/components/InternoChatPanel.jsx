import { useState, useEffect, useRef, useCallback } from "react"
import socket from "../sockets/socket"
import { apiFetch, API_BASE } from "../api"
import { useNotifications } from "../contexts/NotificationContext"
import { playNotificationSound } from "../utils/sounds"
import { 
    SearchIcon, FileIcon, SendIcon, PaperclipIcon, 
    CheckCheckIcon, PhoneIcon, VideoIcon, InfoIcon, 
    ReplyIcon, CopyIcon, TrashIcon, PinIcon,
    UsersIcon, MoonIcon, SunIcon, XIcon, SendHorizontalIcon,
    AttachmentIcon, DownloadIcon,
    MessageCircleIcon, ChevronLeftIcon, ChevronRightIcon,
    UserIcon, SmileIcon, MicIcon, MoreVerticalIcon,
    Volume2Icon, VolumeOffIcon
} from "./icons"

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function getFullUrl(url) {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return url
    }
    if (url.startsWith('/')) {
        return `${API_BASE}${url}`
    }
    return `${API_BASE}/${url}`
}

function getFullImageUrl(url) {
    if (!url) return null
    if (url.startsWith('data:') || url.startsWith('http')) {
        return url
    }
    if (url.startsWith('/uploads/')) {
        return `${API_BASE}${url}`
    }
    return `${API_BASE}/uploads/${url}`
}

function etiquetaDia(fechaIso) {
    if (!fechaIso) return ""
    const d = new Date(fechaIso)
    if (isNaN(d.getTime())) return ""
    const hoy = new Date()
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)
    if (d.toDateString() === hoy.toDateString()) return "Hoy"
    if (d.toDateString() === ayer.toDateString()) return "Ayer"
    return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
}

function horaWhatsApp(fechaIso) {
    if (!fechaIso) return ""
    const d = new Date(fechaIso)
    if (isNaN(d.getTime())) return ""
    return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
}

// ============================================
// COMPONENTES
// ============================================

const Avatar = ({ nombre, fotoPerfil, estado, size = 'md' }) => {
    const getInitials = (nombre) => {
        return nombre?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"
    }

    const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
    const statusSizes = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' }
    
    let fotoUrl = fotoPerfil
    if (fotoUrl && !fotoUrl.startsWith('data:') && !fotoUrl.startsWith('http')) {
        fotoUrl = getFullImageUrl(fotoPerfil)
    }

    return (
        <div className="relative">
            <div className={`${sizes[size]} rounded-full overflow-hidden bg-gradient-to-br from-[#ED3237]/20 to-[#2D355D]/10 flex items-center justify-center flex-shrink-0`}>
                {fotoUrl && fotoUrl !== 'null' ? (
                    <img 
                        src={fotoUrl} 
                        alt={nombre} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = `<span className="text-sm font-medium text-[#2D355D]">${getInitials(nombre)}</span>`
                        }} 
                    />
                ) : (
                    <span className="text-sm font-medium text-[#2D355D]">{getInitials(nombre)}</span>
                )}
            </div>
            {estado === "disponible" && (
                <div className={`absolute bottom-0 right-0 ${statusSizes[size]} bg-green-500 border-2 border-white rounded-full`} />
            )}
        </div>
    )
}

const UnreadBadge = ({ count }) => {
    if (!count || count === 0) return null
    return (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-[#ED3237] rounded-full shadow-sm">
            {count > 99 ? '99+' : count}
        </span>
    )
}

// ============================================
// ESTILOS INTEGRADOS
// ============================================

const styles = `
    @keyframes typingPulse {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
        30% { transform: translateY(-6px); opacity: 1; }
    }
    
    .typing-dot {
        animation: typingPulse 1.2s ease-in-out infinite;
    }
    
    /* Scrollbar personalizada */
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(237, 50, 55, 0.3);
        border-radius: 4px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(237, 50, 55, 0.5);
    }
    
    /* Animación de entrada de mensajes */
    @keyframes messageSlideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .message-animate {
        animation: messageSlideIn 0.2s ease forwards;
    }
    
    /* Efecto de hover en mensajes */
    .message-bubble {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .message-bubble:hover {
        transform: scale(1.01);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
`

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function InternoChatPanel({ agenteActual, agentes }) {
    const [lista, setLista] = useState([])
    const [otroId, setOtroId] = useState(null)
    const [chatRow, setChatRow] = useState(null)
    const [mensajes, setMensajes] = useState([])
    const [texto, setTexto] = useState("")
    const [subiendo, setSubiendo] = useState(false)
    const [progresoSubida, setProgresoSubida] = useState(0)
    const [dragOver, setDragOver] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [indicadorEscritura, setIndicadorEscritura] = useState(false)
    const [mensajeRespuesta, setMensajeRespuesta] = useState(null)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [sonidoActivo, setSonidoActivo] = useState(() => localStorage.getItem('sonidoActivo') !== 'false')
    const [noLeidos, setNoLeidos] = useState({})

    const finRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const inputRef = useRef(null)
    const timeoutEscritura = useRef(null)

    const { marcarChatComoLeidoGlobal, contadoresActivos } = useNotifications()

    // Inyectar estilos al cargar el componente
    useEffect(() => {
        if (!document.getElementById('interno-chat-styles')) {
            const styleTag = document.createElement('style')
            styleTag.id = 'interno-chat-styles'
            styleTag.textContent = styles
            document.head.appendChild(styleTag)
        }
    }, [])

    const getFotoPerfil = (agenteId) => {
        if (!agenteId) return null
        try {
            const foto = localStorage.getItem(`foto_perfil_${agenteId}`)
            if (foto && foto !== 'undefined' && foto !== 'null' && foto.length > 50) {
                return foto
            }
        } catch(e) {}
        return null
    }

    const reproducirSonido = () => {
        if (sonidoActivo) {
            playNotificationSound()
        }
    }

    // Cargar contadores guardados al inicio
    useEffect(() => {
        if (agenteActual?.id) {
            const saved = localStorage.getItem(`noLeidos_internos_${agenteActual.id}`)
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    setNoLeidos(parsed)
                } catch(e) {}
            }
        }
    }, [agenteActual?.id])

    const marcarChatComoLeido = (chatInternoId) => {
        setNoLeidos(prev => {
            const nuevo = { ...prev, [chatInternoId]: 0 }
            if (agenteActual?.id) {
                localStorage.setItem(`noLeidos_internos_${agenteActual.id}`, JSON.stringify(nuevo))
            }
            return nuevo
        })
    }

    const actualizarListaConNuevoMensaje = (chatInternoId, mensaje) => {
        setLista(prevLista => {
            const itemExistente = prevLista.find(item => item.chat?.id === chatInternoId)
            if (!itemExistente) return prevLista
            
            let previewTexto = 'Nuevo mensaje'
            if (mensaje?.texto) {
                previewTexto = mensaje.texto.length > 30 ? mensaje.texto.substring(0, 30) + '...' : mensaje.texto
            } else if (mensaje?.tipo === 'imagen') {
                previewTexto = '📷 Imagen'
            } else if (mensaje?.tipo === 'video') {
                previewTexto = '🎥 Video'
            } else if (mensaje?.tipo === 'archivo') {
                previewTexto = '📎 Archivo'
            }
            
            const esMio = mensaje?.emisor_id === agenteActual?.id
            const emisorNombre = esMio ? 'Tú' : (mensaje?.emisor_nombre || 'Compañero')
            const previewConEmisor = `${emisorNombre}: ${previewTexto}`
            
            const chatActualizado = {
                ...itemExistente.chat,
                ultimo_mensaje: previewConEmisor,
                ultimo_mensaje_hora: new Date().toISOString(),
                ultimo_mensaje_emisor_id: mensaje?.emisor_id
            }
            
            const nuevoItem = {
                ...itemExistente,
                chat: chatActualizado,
                tieneChat: true
            }
            
            const nuevaLista = prevLista.filter(item => item.agente.id !== itemExistente.agente.id)
            return [nuevoItem, ...nuevaLista]
        })
    }

    // Cargar TODOS los agentes y sus chats
    const cargarListaCompleta = useCallback(async () => {
        if (!agenteActual?.id) return
        
        try {
            const otrosAgentes = (agentes || []).filter(a => a.id !== agenteActual?.id)
            
            const response = await apiFetch('/api/interno/chats')
            let chatsExistentes = []
            if (response.ok) {
                const data = await response.json()
                chatsExistentes = data
            }
            
            const listaCompleta = otrosAgentes.map(agente => {
                const chatExistente = chatsExistentes.find(c => c.otro_id === agente.id)
                
                if (chatExistente) {
                    return {
                        agente: agente,
                        chat: chatExistente,
                        tieneChat: true,
                        ultimo_mensaje: chatExistente.ultimo_mensaje || "Sin mensajes",
                        ultimo_mensaje_hora: chatExistente.ultimo_mensaje_hora
                    }
                } else {
                    return {
                        agente: agente,
                        chat: null,
                        tieneChat: false,
                        ultimo_mensaje: "Sin conversación",
                        ultimo_mensaje_hora: null
                    }
                }
            })
            
            listaCompleta.sort((a, b) => {
                if (a.tieneChat && !b.tieneChat) return -1
                if (!a.tieneChat && b.tieneChat) return 1
                if (a.tieneChat && b.tieneChat) {
                    const fechaA = a.ultimo_mensaje_hora ? new Date(a.ultimo_mensaje_hora) : new Date(0)
                    const fechaB = b.ultimo_mensaje_hora ? new Date(b.ultimo_mensaje_hora) : new Date(0)
                    return fechaB - fechaA
                }
                return a.agente.nombre.localeCompare(b.agente.nombre)
            })
            
            setLista(listaCompleta)
        } catch (error) {
            console.error('Error cargando lista completa:', error)
        }
    }, [agenteActual?.id, agentes])

    const cargarMensajes = async (chatId) => {
        try {
            const response = await apiFetch(`/api/interno/chats/${chatId}/mensajes`)
            if (response.ok) {
                const data = await response.json()
                setMensajes(data.map((m) => ({
                    ...m,
                    horaISO: m.hora,
                    hora: horaWhatsApp(m.hora)
                })))
                
                setNoLeidos(prev => {
                    const nuevo = { ...prev, [chatId]: 0 }
                    if (agenteActual?.id) {
                        localStorage.setItem(`noLeidos_internos_${agenteActual.id}`, JSON.stringify(nuevo))
                    }
                    return nuevo
                })
                
                if (marcarChatComoLeidoGlobal) {
                    marcarChatComoLeidoGlobal(chatId, 'interno')
                }
                
                cargarListaCompleta()
            }
        } catch (error) {
            console.error('Error cargando mensajes:', error)
        }
    }

    const abrirCon = async (idOtro) => {
        if (idOtro === otroId) return
        setOtroId(idOtro)
        setMensajeRespuesta(null)
        
        try {
            const response = await apiFetch(`/api/interno/chats/con/${idOtro}`)
            if (!response.ok) return
            const chat = await response.json()
            setChatRow(chat)
            
            const itemEnLista = lista.find(item => item.agente.id === idOtro)
            if (itemEnLista && itemEnLista.tieneChat && itemEnLista.chat) {
                setNoLeidos(prev => {
                    const nuevo = { ...prev, [itemEnLista.chat.id]: 0 }
                    if (agenteActual?.id) {
                        localStorage.setItem(`noLeidos_internos_${agenteActual.id}`, JSON.stringify(nuevo))
                    }
                    return nuevo
                })
                
                if (marcarChatComoLeidoGlobal) {
                    marcarChatComoLeidoGlobal(itemEnLista.chat.id, 'interno')
                }
            }
            
            await cargarMensajes(chat.id)
        } catch (error) {
            console.error('Error abriendo chat:', error)
        }
    }

    const enviarTexto = async () => {
        if (!chatRow || !texto.trim()) return
        
        try {
            const response = await apiFetch(`/api/interno/chats/${chatRow.id}/mensajes`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto: texto.trim(), tipo: "texto" })
            })
            
            if (response.ok) {
                setTexto("")
                setMensajeRespuesta(null)
                await cargarMensajes(chatRow.id)
                await cargarListaCompleta()
            }
        } catch (error) {
            console.error('Error enviando mensaje:', error)
        }
    }

    const subirYEnviar = async (file) => {
        if (!chatRow || !file) return
        
        const maxSize = 25 * 1024 * 1024
        if (file.size > maxSize) {
            alert(`El archivo es demasiado grande. Máximo permitido: 25MB`)
            return
        }
        
        setSubiendo(true)
        setProgresoSubida(0)
        
        try {
            const fd = new FormData()
            fd.append("archivo", file)
            const token = localStorage.getItem('token')
            
            const meta = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.upload.addEventListener("progress", (e) => {
                    if (e.lengthComputable) setProgresoSubida(Math.round((e.loaded / e.total) * 100))
                })
                xhr.onload = () => {
                    if (xhr.status === 200) resolve(JSON.parse(xhr.responseText))
                    else reject(new Error("Error al subir archivo"))
                }
                xhr.onerror = () => reject(new Error("Error de conexión"))
                xhr.open("POST", `${API_BASE}/api/mensajes/adjunto`)
                xhr.setRequestHeader('Authorization', `Bearer ${token}`)
                xhr.send(fd)
            })
            
            await apiFetch(`/api/interno/chats/${chatRow.id}/mensajes`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    texto: "", 
                    tipo: meta.tipo, 
                    url_adjunto: meta.url, 
                    metadata_archivo: meta.metadata_archivo 
                })
            })
            
            await cargarMensajes(chatRow.id)
            await cargarListaCompleta()
        } catch (e) {
            console.error("Error:", e)
            alert(e.message || "Error al enviar archivo")
        } finally {
            setSubiendo(false)
            setProgresoSubida(0)
        }
    }

    const handleReply = (mensaje) => {
        setMensajeRespuesta(mensaje)
        inputRef.current?.focus()
    }

    const handleEscribir = () => {
        if (!chatRow) return
        if (timeoutEscritura.current) clearTimeout(timeoutEscritura.current)
        socket.emit('escribiendo', { chat_id: chatRow.id, agente_id: agenteActual.id, nombre: agenteActual.nombre })
        timeoutEscritura.current = setTimeout(() => {
            socket.emit('dejando-escribir', { chat_id: chatRow.id, agente_id: agenteActual.id })
        }, 1000)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            enviarTexto()
        }
    }

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }
    const handleDrop = async (e) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(false)
        const files = e.dataTransfer.files
        if (files.length > 0) await subirYEnviar(files[0])
    }

    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed)
    const toggleSonido = () => {
        const nuevo = !sonidoActivo
        setSonidoActivo(nuevo)
        localStorage.setItem('sonidoActivo', nuevo)
        if (nuevo) playNotificationSound()
    }

    // Cargar lista completa al inicio
    useEffect(() => {
        cargarListaCompleta()
    }, [cargarListaCompleta])

    useEffect(() => {
        const handleMensajeInterno = (data) => {
            const esChatActual = data.chat_interno_id === chatRow?.id
            const esOtroAgente = data.mensaje?.emisor_id !== agenteActual?.id
            
            if (esOtroAgente) reproducirSonido()
            
            actualizarListaConNuevoMensaje(data.chat_interno_id, data.mensaje)
            
            if (esChatActual) {
                cargarMensajes(data.chat_interno_id)
                marcarChatComoLeido(data.chat_interno_id)
            } else if (esOtroAgente) {
                setNoLeidos(prev => {
                    const nuevo = { ...prev, [data.chat_interno_id]: (prev[data.chat_interno_id] || 0) + 1 }
                    if (agenteActual?.id) localStorage.setItem(`noLeidos_internos_${agenteActual.id}`, JSON.stringify(nuevo))
                    return nuevo
                })
                cargarListaCompleta()
            }
        }
        
        const handleEscritura = ({ chat_id, nombre }) => {
            if (chat_id === chatRow?.id && nombre !== agenteActual?.nombre) {
                setIndicadorEscritura(true)
                setTimeout(() => setIndicadorEscritura(false), 3000)
            }
        }
        
        socket.on("mensaje-interno", handleMensajeInterno)
        socket.on("usuario-escribiendo", handleEscritura)
        
        return () => {
            socket.off("mensaje-interno", handleMensajeInterno)
            socket.off("usuario-escribiendo", handleEscritura)
        }
    }, [chatRow?.id, cargarListaCompleta, agenteActual?.nombre])

    useEffect(() => {
        if (finRef.current) finRef.current.scrollIntoView({ behavior: "smooth" })
    }, [mensajes])

    const otros = (agentes || []).filter((a) => a.id !== agenteActual?.id)
    let diaActual = ""

    const getUltimoMensajeConEmisor = (item) => {
        if (!item.tieneChat) return "Sin conversación"
        let mensaje = item.chat?.ultimo_mensaje || "Sin mensajes"
        if (mensaje.includes(': ')) return mensaje
        if (item.chat?.ultimo_mensaje_emisor_id) {
            if (item.chat.ultimo_mensaje_emisor_id === agenteActual?.id) return `Tú: ${mensaje}`
            else return `${item.agente.nombre}: ${mensaje}`
        }
        return mensaje
    }

    return (
        <div className="flex flex-1 overflow-hidden h-full w-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 custom-scrollbar">
            {/* SIDEBAR DE CONTACTOS */}
            <div className={`${sidebarCollapsed ? 'w-20' : 'w-80'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0 h-full overflow-y-auto transition-all duration-300 shadow-sm`}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
                    <div className="flex items-center justify-between mb-4">
                        {!sidebarCollapsed && (
                            <div>
                                <h2 className="text-lg font-semibold text-[#1F2A4D] dark:text-white">Chats Internos</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{otros.length} compañeros</p>
                            </div>
                        )}
                        <div className="flex gap-1">
                            <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
                                {sidebarCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
                            </button>
                            <button onClick={toggleSonido} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500" title={sonidoActivo ? "Desactivar sonido" : "Activar sonido"}>
                                {sonidoActivo ? <Volume2Icon className="w-5 h-5" /> : <VolumeOffIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    {!sidebarCollapsed && (
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar compañero..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ED3237] placeholder:text-gray-400 dark:text-white transition-all" 
                            />
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {lista.filter(item => {
                        if (!searchTerm) return true
                        return item.agente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
                    }).map((item) => {
                        const agente = item.agente
                        const isActive = otroId === agente.id
                        const fotoPerfil = getFotoPerfil(agente.id)
                        const noLeidoCount = item.chat ? (noLeidos[item.chat.id] || 0) : 0
                        const horaUltimo = item.ultimo_mensaje_hora
                        const ultimoMsg = getUltimoMensajeConEmisor(item)
                        
                        return (
                            <button 
                                key={agente.id} 
                                onClick={() => abrirCon(agente.id)} 
                                className={`w-full text-left transition-all ${sidebarCollapsed ? 'px-2 py-3' : 'px-4 py-3'} ${isActive ? 'bg-gradient-to-r from-[#ED3237]/10 to-[#2D355D]/10 border-l-4 border-l-[#ED3237]' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-l-transparent'}`}
                            >
                                {sidebarCollapsed ? (
                                    <div className="flex flex-col items-center gap-2 relative">
                                        <Avatar nombre={agente.nombre} fotoPerfil={fotoPerfil} estado={agente.estado} size="md" />
                                        {contadoresActivos && noLeidoCount > 0 && (
                                            <div className="absolute -bottom-1 -right-1"><UnreadBadge count={noLeidoCount} /></div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 relative">
                                        <Avatar nombre={agente.nombre} fotoPerfil={fotoPerfil} estado={agente.estado} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-[#1F2A4D] dark:text-white truncate">{agente.nombre}</span>
                                                {horaUltimo && (
                                                    <span className="text-xs text-gray-400">{new Date(horaUltimo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{ultimoMsg}</span>
                                                {contadoresActivos && noLeidoCount > 0 && <UnreadBadge count={noLeidoCount} />}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </button>
                        )
                    })}
                    {lista.length === 0 && !sidebarCollapsed && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <UsersIcon className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm">No hay compañeros disponibles</p>
                            <p className="text-xs mt-1">Los agentes aparecerán aquí</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ÁREA DE CHAT PRINCIPAL */}
            <div className="flex-1 flex flex-col min-w-0 h-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
                {!chatRow ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ED3237]/10 to-[#2D355D]/10 flex items-center justify-center mx-auto mb-6">
                                <MessageCircleIcon className="w-12 h-12 text-[#2D355D] opacity-40" />
                            </div>
                            <h3 className="text-xl font-semibold text-[#1F2A4D] dark:text-white mb-2">Chat Interno</h3>
                            <p className="text-gray-400">Selecciona un compañero para comenzar</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header del chat */}
                        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex-shrink-0 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar 
                                        nombre={lista.find(x => x.agente.id === otroId)?.agente?.nombre} 
                                        fotoPerfil={getFotoPerfil(otroId)}
                                        estado={lista.find(x => x.agente.id === otroId)?.agente?.estado} 
                                        size="lg" 
                                    />
                                    <div>
                                        <div className="font-semibold text-[#1F2A4D] dark:text-white">
                                            {lista.find(x => x.agente.id === otroId)?.agente?.nombre}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {lista.find(x => x.agente.id === otroId)?.agente?.estado === "disponible" ? "🟢 En línea" : "⚫ Conectado"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Área de mensajes */}
                        <div 
                            className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 custom-scrollbar"
                            ref={messagesContainerRef}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {dragOver && (
                                <div className="flex justify-center py-12 border-2 border-dashed border-[#ED3237] rounded-xl bg-[#ED3237]/5">
                                    <div className="text-center">
                                        <AttachmentIcon className="w-12 h-12 mx-auto mb-2 text-[#ED3237]" />
                                        <div className="text-sm text-[#ED3237]">Suelta el archivo aquí</div>
                                    </div>
                                </div>
                            )}
                            
                            {mensajeRespuesta && (
                                <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl border-l-4 border-[#ED3237] flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="text-xs text-[#ED3237] font-medium">Respondiendo a:</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{mensajeRespuesta.texto?.substring(0, 80)}</p>
                                    </div>
                                    <button onClick={() => setMensajeRespuesta(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                                        <XIcon className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            )}
                            
                            {indicadorEscritura && (
                                <div className="flex justify-start mb-3">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {lista.find(x => x.agente.id === otroId)?.agente?.nombre} está escribiendo...
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            {mensajes.map((msg, idx) => {
                                const dia = etiquetaDia(msg.horaISO)
                                const showSep = dia && dia !== diaActual
                                if (dia) diaActual = dia
                                const esMio = msg.emisor_id === agenteActual?.id
                                const fotoEmisor = esMio ? getFotoPerfil(agenteActual.id) : getFotoPerfil(msg.emisor_id)
                                
                                return (
                                    <div key={msg.id} className="message-animate" style={{ animationDelay: `${idx * 30}ms` }}>
                                        {showSep && (
                                            <div className="flex justify-center my-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-700"></div>
                                                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full shadow-sm">
                                                        {dia}
                                                    </span>
                                                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-700"></div>
                                                </div>
                                            </div>
                                        )}
                                        <div className={`flex ${esMio ? "justify-end" : "justify-start"} mb-3 group relative`}>
                                            {!esMio && (
                                                <div className="flex-shrink-0 mr-2 self-end mb-1">
                                                    <Avatar nombre={msg.emisor_nombre} fotoPerfil={fotoEmisor} estado={null} size="sm" />
                                                </div>
                                            )}
                                            <div className={`flex flex-col ${esMio ? "items-end" : "items-start"} max-w-[75%]`}>
                                                {!esMio && (
                                                    <span className="text-xs text-gray-500 mb-1 ml-1">{msg.emisor_nombre}</span>
                                                )}
                                                <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200 message-bubble ${
                                                    esMio 
                                                        ? "bg-gradient-to-r from-[#ED3237] to-[#c4282c] text-white rounded-br-md" 
                                                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700"
                                                } hover:shadow-md`}>
                                                    {msg.url_adjunto && msg.tipo === "imagen" && (
                                                        <div className="mb-2">
                                                            <img 
                                                                src={getFullUrl(msg.url_adjunto)} 
                                                                alt="Imagen" 
                                                                className="rounded-lg max-w-[200px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                                                onClick={() => window.open(getFullUrl(msg.url_adjunto), '_blank')}
                                                            />
                                                        </div>
                                                    )}
                                                    {msg.url_adjunto && msg.tipo === "video" && (
                                                        <div className="mb-2">
                                                            <video src={getFullUrl(msg.url_adjunto)} controls className="rounded-lg max-w-[200px] max-h-[200px]" />
                                                        </div>
                                                    )}
                                                    {msg.url_adjunto && (msg.tipo === "archivo" || (!msg.tipo && !msg.texto)) && (
                                                        <a href={getFullUrl(msg.url_adjunto)} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-sm ${esMio ? "bg-white/20 hover:bg-white/30" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"} transition-colors`}>
                                                            <DownloadIcon className="w-4 h-4" /> 
                                                            <span className="truncate max-w-[150px]">Descargar archivo</span>
                                                        </a>
                                                    )}
                                                    {msg.texto && <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.texto}</div>}
                                                    <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${esMio ? "text-white/70" : "text-gray-400"}`}>
                                                        <span>{msg.hora}</span>
                                                        {esMio && <CheckCheckIcon className="w-3 h-3" />}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleReply(msg)} 
                                                className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md ${esMio ? "-left-8" : "-right-8"}`}
                                            >
                                                <ReplyIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={finRef} />
                        </div>

                        {/* Input de mensaje */}
                        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 flex-shrink-0 shadow-sm">
                            {subiendo && (
                                <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                    <div className="flex items-center gap-2 text-sm mb-2 text-gray-600 dark:text-gray-300">
                                        <div className="w-4 h-4 border-2 border-[#ED3237] border-t-transparent rounded-full animate-spin" />
                                        <span>Subiendo archivo... {progresoSubida}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                        <div className="bg-[#ED3237] h-1.5 rounded-full transition-all" style={{ width: `${progresoSubida}%` }} />
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2 items-end">
                                <label className="cursor-pointer text-gray-500 hover:text-[#ED3237] p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <PaperclipIcon className="w-5 h-5" />
                                    <input type="file" className="hidden" disabled={subiendo} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) subirYEnviar(f) }} />
                                </label>
                                <div className="flex-1">
                                    <textarea 
                                        ref={inputRef} 
                                        className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#ED3237] dark:text-white placeholder:text-gray-400 transition-all" 
                                        placeholder="Escribe un mensaje..." 
                                        value={texto} 
                                        onChange={(e) => setTexto(e.target.value)} 
                                        onKeyDown={handleKeyDown} 
                                        onKeyUp={handleEscribir}
                                        disabled={subiendo} 
                                        rows={1} 
                                        style={{ minHeight: '42px', maxHeight: '100px' }} 
                                        onInput={(e) => { 
                                            e.target.style.height = 'auto'; 
                                            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' 
                                        }} 
                                    />
                                </div>
                                <button type="button" disabled={subiendo || !texto.trim()} onClick={enviarTexto} className={`p-2.5 rounded-full transition-all ${(!subiendo && texto.trim()) ? "bg-gradient-to-r from-[#ED3237] to-[#c4282c] text-white shadow-md hover:shadow-lg" : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"}`}>
                                    <SendHorizontalIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 text-center mt-2">Enter para enviar · Shift+Enter para nueva línea</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
