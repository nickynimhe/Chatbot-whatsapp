import { useState, useRef, useEffect } from "react"
import EmojiPicker from "emoji-picker-react"
import socket from "../sockets/socket"
import { apiFetch, API_BASE } from "../api"
import { 
    SearchIcon, XIcon, SendIcon, PaperclipIcon, ImageIcon, 
    CheckCheckIcon, UserIcon, CalendarIcon, ImageIconSearch,
    VideoIconSearch, FileIconSearch, ChevronLeftIcon, ChevronRightIcon,
    TextIcon, FilterIcon, DownloadIcon, ReplyIcon, PlusIcon,
    ClockIcon, UserCheckIcon, RefreshCwIcon, AlertCircleIcon,
    MoreHorizontalIcon, UsersIcon, LogOutIcon, CheckIcon
} from "./icons"
import LocationMap from "./LocationMap"
import AudioNoSoportado from "./AudioNoSoportado"

// ==================== FUNCIÓN PARA OBTENER URL COMPLETA ====================
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

// ==================== FUNCIONES AUXILIARES ====================
function etiquetaDia(fechaIso) {
    const d = new Date(fechaIso)
    if (Number.isNaN(d.getTime())) return ""
    const hoy = new Date()
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)
    if (d.toDateString() === hoy.toDateString()) return "Hoy"
    if (d.toDateString() === ayer.toDateString()) return "Ayer"
    return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function horaWhatsApp(fechaIso) {
    const d = new Date(fechaIso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
}

function mensajesDesdeUltimaBienvenida(mensajes) {
    const arr = [...(mensajes || [])]
    let idx = -1
    for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].tipo === "bienvenida" && arr[i].emisor === "agente") {
            idx = i
            break
        }
    }
    if (idx === -1) return arr
    return arr.slice(idx)
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return ""
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function formatMessageText(text) {
    if (!text) return null
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
        if (part && (part.match(/^https?:\/\//i) || part.match(/^www\./i))) {
            const fullUrl = part.startsWith('http') ? part : `https://${part}`
            return <a key={`url-${i}`} href={fullUrl} target="_blank" rel="noopener noreferrer" className="break-all text-white/80 hover:text-white underline" title={part}>{part.length > 50 ? part.substring(0, 47) + '...' : part}</a>
        }
        return <span key={`text-${i}`} className="break-words whitespace-pre-wrap">{part}</span>
    })
}

// ==================== SELECTOR DE COLORES PARA EL ASESOR ====================
const ColorPicker = ({ currentColor, onSelectColor, onClose }) => {
    // Solo colores que garantizan buena visibilidad del texto blanco
    const coloresDisponibles = [
        { nombre: "Default", gradient: "from-[#1F2A4D] to-[#E27A6E]", color1: "#1F2A4D", color2: "#E27A6E" },
        { nombre: "Azul Marino", gradient: "from-[#1a237e] to-[#283593]", color1: "#1a237e", color2: "#283593" },
        { nombre: "Verde Esmeralda", gradient: "from-[#004d40] to-[#00695c]", color1: "#004d40", color2: "#00695c" },
        { nombre: "Morado", gradient: "from-[#4a148c] to-[#6a1b9a]", color1: "#4a148c", color2: "#6a1b9a" },
        { nombre: "Rojo Vino", gradient: "from-[#880e4f] to-[#ad1457]", color1: "#880e4f", color2: "#ad1457" },
        { nombre: "Naranja", gradient: "from-[#e65100] to-[#ef6c00]", color1: "#e65100", color2: "#ef6c00" },
        { nombre: "Verde Menta", gradient: "from-[#1b5e20] to-[#2e7d32]", color1: "#1b5e20", color2: "#2e7d32" },
        { nombre: "Grafito", gradient: "from-[#263238] to-[#37474f]", color1: "#263238", color2: "#37474f" },
        { nombre: "Índigo", gradient: "from-[#1a237e] to-[#283593]", color1: "#1a237e", color2: "#283593" },
        { nombre: "Teal", gradient: "from-[#004d40] to-[#00695c]", color1: "#004d40", color2: "#00695c" },
        { nombre: "Café", gradient: "from-[#4e342e] to-[#5d4037]", color1: "#4e342e", color2: "#5d4037" },
    ]

    return (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[#E5DDD0] z-50 overflow-hidden animate-scaleIn">
            <div className="p-3 border-b bg-gradient-to-r from-[#1F2A4D] to-[#E27A6E] text-white">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold flex items-center gap-2">
                        🎨 Color de tus mensajes
                    </span>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-all">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-white/70 mt-1">Elige un color para tus burbujas</p>
            </div>
            
            <div className="p-3 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                    {coloresDisponibles.map((color, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelectColor(color)}
                            className={`h-12 rounded-lg transition-all duration-200 hover:scale-105 ${
                                currentColor?.nombre === color.nombre 
                                    ? "ring-2 ring-offset-2 ring-[#E27A6E] scale-105" 
                                    : ""
                            }`}
                            style={{ background: `linear-gradient(135deg, ${color.color1}, ${color.color2})` }}
                            title={color.nombre}
                        >
                            <span className="text-white text-[10px] font-medium opacity-0 hover:opacity-100 transition-opacity">
                                {color.nombre}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-2 border-t text-center bg-gray-50">
                <button 
                    onClick={() => onSelectColor(null)} 
                    className="text-xs text-[#1F2A4D] hover:text-[#E27A6E] transition-colors"
                >
                    Restablecer color original
                </button>
            </div>
        </div>
    )
}

// ==================== MENSAJE DE SISTEMA ====================
const SystemMessage = ({ msg, hora }) => {
    const texto = msg.texto || ""
    
    const isTransfer = texto.includes("Transferido") || texto.includes("transferido")
    const isAssigned = texto.includes("asignado") || texto.includes("Asignado")
    const isClosed = texto.includes("cerrado") || texto.includes("Cerrado")
    const isReopened = texto.includes("reabierto") || texto.includes("Reabierto")
    const isWaiting = texto.includes("espera") || texto.includes("Espera")
    
    let icon = "•"
    if (isTransfer) icon = "🔄"
    else if (isAssigned) icon = "👤"
    else if (isClosed) icon = "🔒"
    else if (isReopened) icon = "🔓"
    else if (isWaiting) icon = "⏳"
    
    return (
        <div className="flex justify-center my-3" key={`system-${msg.id}`}>
            <div className="flex items-center gap-1.5 text-xs text-[#9A937F] bg-[#F4EFE7]/50 backdrop-blur-sm px-3 py-1 rounded-full shadow-soft">
                <span className="text-[#C9C2B5]">{icon}</span>
                <span>{texto}</span>
                <span className="text-[10px] text-[#C9C2B5]">{hora}</span>
            </div>
        </div>
    )
}

// ==================== MENSAJE DE BIENVENIDA ====================
const WelcomeMessage = ({ msg, hora, agenteNombre }) => {
    return (
        <div className="flex justify-center my-3" key={`welcome-${msg.id}`}>
            <div className="flex items-center gap-1.5 text-xs text-[#5E8557] bg-[#EEF4ED]/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-soft">
                <span>🤝</span>
                <span>{msg.texto || `Hola, soy ${agenteNombre || "el asesor"}. ¿En qué puedo ayudarte?`}</span>
                <span className="text-[10px] text-[#9A937F]">{hora}</span>
            </div>
        </div>
    )
}

// ==================== FUNCIONES DE DETECCIÓN DE UBICACIÓN ====================
function extraerCoordenadas(texto) {
    if (!texto) return null
    const coordRegex = /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/
    const match = texto.match(coordRegex)
    if (match) {
        const lat = parseFloat(match[1])
        const lng = parseFloat(match[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng }
        }
    }
    return null
}

function obtenerCoordenadasDeMensaje(msg) {
    if (msg.metadata_archivo) {
        try {
            const meta = typeof msg.metadata_archivo === 'string' ? JSON.parse(msg.metadata_archivo) : msg.metadata_archivo
            if (meta.latitud && meta.longitud) return { lat: meta.latitud, lng: meta.longitud }
        } catch(e) {}
    }
    if (msg.location && msg.location.lat && msg.location.lng) return { lat: msg.location.lat, lng: msg.location.lng }
    if (msg.texto) {
        const coords = extraerCoordenadas(msg.texto)
        if (coords) return coords
    }
    return null
}

function esMensajeUbicacion(msg) {
    if (msg.tipo === "location") return true
    if (msg.tipo === "live_location") return true
    if (msg.metadata_archivo) {
        try {
            const meta = typeof msg.metadata_archivo === 'string' ? JSON.parse(msg.metadata_archivo) : msg.metadata_archivo
            if (meta.latitud && meta.longitud) return true
        } catch(e) {}
    }
    if (msg.location && msg.location.lat && msg.location.lng) return true
    if (msg.texto && extraerCoordenadas(msg.texto)) return true
    if (msg.texto && msg.texto.includes("google.com/maps")) return true
    return false
}

// ==================== COMPONENTE PDF PREVIEW ====================
function PDFPreview({ url, nombreArchivo, sizeArchivo, esAgenteBubble }) {
    const fullUrl = getFullUrl(url)
    const nombreSinExtension = nombreArchivo?.replace(/\.pdf$/i, "") || "Documento"
    const tamanio = formatFileSize(sizeArchivo) || ''
    
    return (
        <a href={fullUrl} target="_blank" rel="noreferrer" download className={`flex items-center gap-3 p-3 rounded-xl ${esAgenteBubble ? "bg-white/10 hover:bg-white/20" : "bg-white hover:bg-gray-50"} border border-[#E5DDD0]/50 transition-all duration-200 group max-w-[300px] shadow-soft hover:shadow-glow`}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center shadow-soft group-hover:shadow-glow transition-all duration-200">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6M9 17h4" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-[#1F2A4D] dark:text-white">{nombreSinExtension}</div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-red-600 font-medium">PDF</span>
                    {tamanio && <span className="text-[10px] text-[#9A937F]">• {tamanio}</span>}
                </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#F4EFE7] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                <DownloadIcon className="w-4 h-4 text-[#7A7567]" />
            </div>
        </a>
    )
}

// ==================== COMPONENTE ARCHIVO PREVIEW ====================
function FilePreview({ url, nombreArchivo, sizeArchivo, esAgenteBubble }) {
    const fullUrl = getFullUrl(url)
    const extension = nombreArchivo?.split('.').pop()?.toLowerCase() || ''
    const nombreSinExtension = nombreArchivo?.replace(/\.[^/.]+$/, "") || "Archivo"
    const tamanio = formatFileSize(sizeArchivo) || ''
    
    const getFileInfo = () => {
        if (extension === 'pdf') {
            return { 
                icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6M9 17h4" /></svg>,
                bgColor: "from-red-100 to-red-200", 
                textColor: "text-red-600", 
                label: "PDF" 
            }
        }
        if (['jpg','jpeg','png','gif','webp'].includes(extension)) {
            return { 
                icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15l-5-4-3 3-4-4-6 6" /></svg>,
                bgColor: "from-purple-100 to-purple-200", 
                textColor: "text-purple-600", 
                label: "IMAGEN" 
            }
        }
        if (['mp4','avi','mov'].includes(extension)) {
            return { 
                icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
                bgColor: "from-indigo-100 to-indigo-200", 
                textColor: "text-indigo-600", 
                label: "VIDEO" 
            }
        }
        if (['doc','docx'].includes(extension)) {
            return { 
                icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6M9 9h1M14 9h1M9 17h6" /></svg>,
                bgColor: "from-blue-100 to-blue-200", 
                textColor: "text-blue-600", 
                label: "WORD" 
            }
        }
        if (['xls','xlsx'].includes(extension)) {
            return { 
                icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l2 2 4-4" /></svg>,
                bgColor: "from-green-100 to-green-200", 
                textColor: "text-green-600", 
                label: "EXCEL" 
            }
        }
        if (['ppt','pptx'].includes(extension)) {
            return { 
                icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11h2a2 2 0 012 2v2a2 2 0 01-2 2h-2v-6z" /></svg>,
                bgColor: "from-orange-100 to-orange-200", 
                textColor: "text-orange-600", 
                label: "PPT" 
            }
        }
        if (['mp3','wav','ogg'].includes(extension)) {
            return { 
                icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
                bgColor: "from-pink-100 to-pink-200", 
                textColor: "text-pink-600", 
                label: "AUDIO" 
            }
        }
        if (['zip','rar'].includes(extension)) {
            return { 
                icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v4M10 5h4" /></svg>,
                bgColor: "from-yellow-100 to-yellow-200", 
                textColor: "text-yellow-600", 
                label: "ZIP" 
            }
        }
        return { 
            icon: (props) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6M9 17h4" /></svg>,
            bgColor: "from-gray-100 to-gray-200", 
            textColor: "text-gray-600", 
            label: "ARCHIVO" 
        }
    }
    
    const fileInfo = getFileInfo()
    const IconComponent = fileInfo.icon
    
    return (
        <a href={fullUrl} target="_blank" rel="noreferrer" download className={`flex items-center gap-3 p-3 rounded-xl ${esAgenteBubble ? "bg-white/10 hover:bg-white/20" : "bg-white hover:bg-gray-50"} border border-[#E5DDD0]/50 transition-all duration-200 group max-w-[300px] shadow-soft hover:shadow-glow`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${fileInfo.bgColor} flex items-center justify-center shadow-soft group-hover:shadow-glow transition-all duration-200`}>
                <IconComponent className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-[#1F2A4D] dark:text-white">{nombreSinExtension}</div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${fileInfo.textColor} font-medium`}>{fileInfo.label}</span>
                    {tamanio && <span className="text-[10px] text-[#9A937F]">• {tamanio}</span>}
                </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#F4EFE7] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                <DownloadIcon className="w-4 h-4 text-[#7A7567]" />
            </div>
        </a>
    )
}

// ==================== COMPONENTE IMAGEN PREVIEW ====================
function ImagePreview({ url }) {
    const [showLightbox, setShowLightbox] = useState(false)
    const fullUrl = getFullUrl(url)
    
    return (
        <>
            <div className="cursor-pointer inline-block" onClick={() => setShowLightbox(true)}>
                <img 
                    src={fullUrl} 
                    alt="Imagen adjunta" 
                    className="rounded-xl max-w-full max-h-[300px] object-cover shadow-soft transition-all duration-300 hover:shadow-glow hover:scale-[1.02]"
                    loading="lazy"
                />
            </div>
            {showLightbox && (
                <div className="fixed inset-0 bg-[#1F2A4D]/95 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn" onClick={() => setShowLightbox(false)}>
                    <button className="absolute top-4 right-4 text-white text-2xl w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 flex items-center justify-center z-10">
                        <XIcon className="w-5 h-5" />
                    </button>
                    <img 
                        src={fullUrl} 
                        alt="Vista previa" 
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}
        </>
    )
}

// ==================== COMPONENTE VIDEO PREVIEW ====================
function VideoPreview({ url }) {
    const fullUrl = getFullUrl(url)
    return (
        <video 
            src={fullUrl} 
            controls 
            className="rounded-xl max-w-full max-h-[300px] shadow-soft"
        >
            Tu navegador no soporta reproducción de video.
        </video>
    )
}

// ==================== COMPONENTE PRINCIPAL ====================
function ChatWindow({
    selectedChat,
    inputMessage: externalInputMessage,
    setInputMessage: setExternalInputMessage,
    enviarMensaje,
    agenteActual,
    cargarChats,
    setSelectedChat,
    cerrarChat,
    transferirChat,
    tomarChat,
    reabrirChat,
    agentes,
    esAdmin,
    modoVisualizacion,
    cargarMensajes
}) {
    const [showEmojis, setShowEmojis] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [showTransferirLista, setShowTransferirLista] = useState(false)
    const [subiendo, setSubiendo] = useState(false)
    const [cargandoHistorial, setCargandoHistorial] = useState(false)
    const [hayMasMensajes, setHayMasMensajes] = useState(true)
    const [archivosPendientes, setArchivosPendientes] = useState([])
    const [progresoSubida, setProgresoSubida] = useState(0)
    const [dragOver, setDragOver] = useState(false)
    const [mensajeRespondiendo, setMensajeRespondiendo] = useState(null)
    const [showSearchPanel, setShowSearchPanel] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
    const [contextMenu, setContextMenu] = useState(null)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [colorAsesor, setColorAsesor] = useState(() => {
        const saved = localStorage.getItem('colorBurbujaAsesor')
        if (saved) {
            return JSON.parse(saved)
        }
        return { nombre: "Default", gradient: "from-[#1F2A4D] to-[#E27A6E]", color1: "#1F2A4D", color2: "#E27A6E" }
    })

    const messagesEndRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const fileInputRef = useRef(null)
    const textareaRef = useRef(null)

    // Guardar color en localStorage
    useEffect(() => {
        localStorage.setItem('colorBurbujaAsesor', JSON.stringify(colorAsesor))
    }, [colorAsesor])

    const handleSelectColor = (color) => {
        if (color === null) {
            setColorAsesor({ nombre: "Default", gradient: "from-[#1F2A4D] to-[#E27A6E]", color1: "#1F2A4D", color2: "#E27A6E" })
        } else {
            setColorAsesor(color)
        }
        setShowColorPicker(false)
    }

    // ========== AUTO-SCROLL ==========
    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
    }

    useEffect(() => {
        if (selectedChat?.mensajes?.length) {
            setTimeout(() => scrollToBottom(), 100)
        }
    }, [selectedChat?.mensajes?.length])

    useEffect(() => {
        if (selectedChat?.id) {
            setTimeout(() => scrollToBottom(), 150)
        }
    }, [selectedChat?.id])

    useEffect(() => {
        if (!socket) return;

        const handleNuevoMensaje = (data) => {
            if (selectedChat?.id === data.chat_id) {
                setTimeout(() => scrollToBottom(), 100)
            }
        }

        socket.on("nuevo-mensaje-cliente", handleNuevoMensaje)
        socket.on("mensaje-recibido", handleNuevoMensaje)

        return () => {
            socket.off("nuevo-mensaje-cliente", handleNuevoMensaje)
            socket.off("mensaje-recibido", handleNuevoMensaje)
        }
    }, [selectedChat?.id])

    // ========== FUNCIONES PARA LIMPIAR TEXTAREA ==========
    const limpiarTextarea = () => {
        if (textareaRef.current) {
            textareaRef.current.value = ""
            textareaRef.current.style.height = '42px'
        }
    }

    // ========== SUBIR ARCHIVO CON TEXTO ==========
    const subirArchivoConTexto = async (archivoPendiente, texto, mensajeRespondidoId = null) => {
        if (!selectedChat || !archivoPendiente.file) return
        setSubiendo(true); setProgresoSubida(0)
        try {
            const fd = new FormData()
            fd.append("archivo", archivoPendiente.file)
            const meta = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.upload.addEventListener("progress", (e) => { 
                    if (e.lengthComputable) setProgresoSubida(Math.round((e.loaded / e.total) * 100)) 
                })
                xhr.onload = () => { 
                    if (xhr.status === 200) resolve(JSON.parse(xhr.responseText)); 
                    else reject(new Error("Error")) 
                }
                xhr.onerror = () => reject(new Error("Error de conexión"))
                xhr.open("POST", `${API_BASE}/api/mensajes/adjunto`)
                xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`)
                xhr.send(fd)
            })
            
            await enviarMensaje({ 
                adjunto: { 
                    url: meta.url, 
                    tipo: meta.tipo, 
                    metadata_archivo: meta.metadata_archivo 
                }, 
                texto: texto,
                mensaje_respondido_id: mensajeRespondidoId
            })
            
            eliminarArchivoPendiente(archivoPendiente.id)
        } catch (e) { 
            console.error("Error:", e); 
            alert(e.message || "No se pudo enviar el archivo") 
        }
        finally { 
            setSubiendo(false); 
            setProgresoSubida(0) 
        }
    }

    const enviarTodosArchivosConTexto = async (mensajeRespondidoId = null) => {
        const texto = textareaRef.current?.value || ""
        for (const archivo of archivosPendientes) {
            await subirArchivoConTexto(archivo, texto, mensajeRespondidoId)
        }
        limpiarTextarea()
        setMensajeRespondiendo(null)
        setTimeout(() => scrollToBottom(), 100)
    }

    const enviarMensajeTexto = async () => {
        const texto = textareaRef.current?.value || ""
        if (texto.trim() || archivosPendientes.length > 0) {
            const mensajeRespondidoId = mensajeRespondiendo?.id || null
            
            if (archivosPendientes.length > 0) {
                await enviarTodosArchivosConTexto(mensajeRespondidoId)
            } else {
                await enviarMensaje({ 
                    texto: texto,
                    mensaje_respondido_id: mensajeRespondidoId
                })
                limpiarTextarea()
                setMensajeRespondiendo(null)
                setTimeout(() => scrollToBottom(), 100)
            }
        }
    }

    useEffect(() => { setHayMasMensajes(true) }, [selectedChat?.id])
    useEffect(() => {
        const handleClickOutside = () => closeContextMenu()
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])
    
    useEffect(() => {
        const handleClickOutside = () => {
            setShowMenu(false)
            setShowTransferirLista(false)
            setShowColorPicker(false)
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    const cargarMasMensajes = async () => {
        if (!selectedChat || cargandoHistorial || !hayMasMensajes) return
        setCargandoHistorial(true)
        try {
            const primerMensaje = selectedChat.mensajes?.[0]
            const beforeId = primerMensaje?.id
            const res = await fetch(`${API_BASE}/api/mensajes/${selectedChat.id}?limit=50${beforeId ? `&before_id=${beforeId}` : ""}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            const data = await res.json()
            if (data.messages && data.messages.length > 0) {
                const nuevosMensajes = data.messages.map(msg => ({ ...msg, horaISO: msg.hora, hora: new Date(msg.hora).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) }))
                setSelectedChat(prev => ({ ...prev, mensajes: [...nuevosMensajes, ...(prev?.mensajes || [])] }))
                setHayMasMensajes(data.pagination?.hasMore || false)
            } else { setHayMasMensajes(false) }
        } catch (error) { console.error("Error:", error) }
        finally { setCargandoHistorial(false) }
    }

    const handleScroll = async () => {
        const container = messagesContainerRef.current
        if (!container || cargandoHistorial || !hayMasMensajes || !selectedChat) return
        if (container.scrollTop < 100) await cargarMasMensajes()
    }

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const files = e.dataTransfer.files; if (files.length > 0) agregarArchivosPendientes(files) }
    const cancelarRespuesta = () => setMensajeRespondiendo(null)

    const handleContextMenu = (e, msg) => {
        e.preventDefault()
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            mensaje: msg
        })
    }

    const closeContextMenu = () => setContextMenu(null)

    const buscarMensajes = () => {
        if (!selectedChat?.mensajes) return
        const results = selectedChat.mensajes.filter(msg => 
            msg.texto?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setSearchResults(results)
        setSelectedResultIndex(results.length > 0 ? 0 : -1)
        if (results.length > 0) {
            setTimeout(() => {
                const el = document.getElementById(`message-${results[0].id}`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                el?.classList.add('bg-[#F7EBC9]', 'transition-all', 'duration-500')
                setTimeout(() => el?.classList.remove('bg-[#F7EBC9]'), 2000)
            }, 100)
        }
    }

    const prevResult = () => {
        if (searchResults.length === 0) return
        const newIndex = selectedResultIndex - 1 < 0 ? searchResults.length - 1 : selectedResultIndex - 1
        setSelectedResultIndex(newIndex)
        const el = document.getElementById(`message-${searchResults[newIndex].id}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.classList.add('bg-[#F7EBC9]', 'transition-all', 'duration-500')
        setTimeout(() => el?.classList.remove('bg-[#F7EBC9]'), 2000)
    }

    const nextResult = () => {
        if (searchResults.length === 0) return
        const newIndex = (selectedResultIndex + 1) % searchResults.length
        setSelectedResultIndex(newIndex)
        const el = document.getElementById(`message-${searchResults[newIndex].id}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.classList.add('bg-[#F7EBC9]', 'transition-all', 'duration-500')
        setTimeout(() => el?.classList.remove('bg-[#F7EBC9]'), 2000)
    }

    const validarArchivo = (file) => {
        const maxSize = 25 * 1024 * 1024
        if (file.size > maxSize) { alert(`El archivo "${file.name}" es demasiado grande. Máximo: 25MB`); return false }
        return true
    }

    const agregarArchivosPendientes = (files) => {
        const archivosValidos = Array.from(files).filter(file => validarArchivo(file))
        const nuevosArchivos = archivosValidos.map(file => ({ file, id: Date.now() + Math.random(), preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null, nombre: file.name, tamaño: file.size, tipo: file.type }))
        setArchivosPendientes(prev => [...prev, ...nuevosArchivos])
    }

    const eliminarArchivoPendiente = (id) => {
        setArchivosPendientes(prev => { const archivo = prev.find(a => a.id === id); if (archivo?.preview) URL.revokeObjectURL(archivo.preview); return prev.filter(a => a.id !== id) })
    }

    const renderDateSeparator = (dia, index) => (
        <div key={`sep-${dia}-${index}`} className="flex justify-center my-3">
            <span className="text-[10px] text-[#9A937F] bg-[#F4EFE7]/60 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-soft">{dia}</span>
        </div>
    )

    const renderAdjunto = (url, tipo, nombreArchivo, sizeArchivo, esAgenteBubble, texto, esSoloArchivo) => {
        if (!url) return null
        
        if (tipo === "imagen") return <ImagePreview url={url} />
        if (tipo === "video") return <VideoPreview url={url} />
        
        if (tipo === "audio" || tipo === "audio_no_soportado") return null
        if (tipo === "archivo" && url && (url.includes(".ogg") || url.includes(".mp3") || url.includes(".wav") || url.includes(".m4a"))) return null
        
        if (tipo === "documento" || tipo === "archivo") {
            if (url.toLowerCase().includes('.pdf')) {
                return <PDFPreview url={url} nombreArchivo={nombreArchivo} sizeArchivo={sizeArchivo} esAgenteBubble={esAgenteBubble} />
            }
            return <FilePreview url={url} nombreArchivo={nombreArchivo} sizeArchivo={sizeArchivo} esAgenteBubble={esAgenteBubble} />
        }
        return null
    }

    const renderCuerpoMensaje = (msg, esAgenteBubble) => {
        const url = msg.url_adjunto
        const tipo = msg.tipo || "texto"
        const metadata = msg.metadata_archivo ? (typeof msg.metadata_archivo === "string" ? JSON.parse(msg.metadata_archivo) : msg.metadata_archivo) : null
        const nombreArchivo = metadata?.nombre || msg.nombre_archivo || "Archivo"
        const sizeArchivo = metadata?.size || msg.tamaño_archivo || 0
        const mensajeRespondido = msg.mensaje_respondido
        const esUbicacion = esMensajeUbicacion(msg)
        const coordenadas = esUbicacion ? obtenerCoordenadasDeMensaje(msg) : null
        
        const textoOriginal = msg.texto || ""
        const textosAOcultar = [
            "documento", "Documento", "DOCUMENTO",
            "archivo", "Archivo", "ARCHIVO",
            "imagen", "Imagen", "IMAGEN",
            "video", "Video", "VIDEO",
            "audio", "Audio", "AUDIO",
            "📷 Imagen",
            "🎥 Video",
            "🎤 Audio"
        ]
        
        const esNombreArchivoWhatsApp = /^whatsapp_[\d_]+\.(jpg|jpeg|png|gif|webp|mp4|mp3|pdf|doc|docx)$/i.test(textoOriginal)
        const tieneExtensionArchivo = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|mp4|mp3|wav|ogg|zip|rar)$/i.test(textoOriginal)
        
        const esTextoGenerico = textoOriginal === "" || 
            textosAOcultar.includes(textoOriginal) ||
            textosAOcultar.includes(textoOriginal.toLowerCase()) ||
            esNombreArchivoWhatsApp ||
            tieneExtensionArchivo ||
            (nombreArchivo && textoOriginal === nombreArchivo) ||
            (nombreArchivo && textoOriginal === nombreArchivo.replace(/\.[^/.]+$/, ""))
        
        const esSoloTextoGenerico = (!url || tipo === "texto") && esTextoGenerico && textoOriginal !== ""
        
        if (esSoloTextoGenerico) return null
        
        const esSoloArchivo = (tipo === "imagen" || tipo === "video" || tipo === "documento" || tipo === "archivo") && esTextoGenerico
        const debeMostrarTexto = !esSoloArchivo && textoOriginal && !esTextoGenerico
        
        const esAudioCliente = msg.emisor === "cliente" && (
            tipo === "audio" || 
            tipo === "audio_no_soportado" ||
            (tipo === "archivo" && msg.texto && (msg.texto.includes("🎤 Audio") || msg.texto.includes("Audio enviado"))) ||
            (tipo === "archivo" && msg.url_adjunto && (msg.url_adjunto.includes(".ogg") || msg.url_adjunto.includes(".mp3") || msg.url_adjunto.includes(".wav") || msg.url_adjunto.includes(".m4a"))) ||
            (msg.texto && (msg.texto.includes("Audio enviado") || msg.texto.includes("🎤")))
        );
        
        if (esAudioCliente && url) {
            return (
                <AudioNoSoportado 
                    metadata={metadata} 
                    esAgenteBubble={esAgenteBubble} 
                    mensaje={msg.texto}
                    url_audio={url}
                />
            )
        }
        
        if (esAudioCliente && !url) {
            return (
                <div className={`flex items-center gap-2 p-2 rounded-lg ${esAgenteBubble ? "bg-white/10" : "bg-[#F4EFE7]"}`}>
                    <span className="text-sm">🎤</span>
                    <div className="flex-1">
                        <div className="text-xs font-medium">Audio no disponible</div>
                        <div className="text-[10px] text-[#7A7567]">{msg.texto || "El cliente intentó enviar un audio"}</div>
                    </div>
                </div>
            )
        }

        if (mensajeRespondido) {
            return (
                <div key={`respondido-${msg.id}`}>
                    <div className={`text-xs rounded-lg mb-2 p-2.5 ${esAgenteBubble ? "bg-white/15" : "bg-[#F4EFE7]"} cursor-pointer hover:opacity-80 transition-all duration-200 border-l-4 border-[#E27A6E]`} onClick={() => {
                        const el = document.getElementById(`message-${mensajeRespondido.id}`)
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        el?.classList.add('bg-[#F7EBC9]', 'transition-all', 'duration-500')
                        setTimeout(() => el?.classList.remove('bg-[#F7EBC9]'), 2000)
                    }}>
                        <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1">
                            <ReplyIcon className="w-2.5 h-2.5" />
                            <span>Respondiendo a {mensajeRespondido.emisor === "agente" ? "ti" : selectedChat?.cliente_nombre || "cliente"}</span>
                        </div>
                        <div className="text-xs line-clamp-2 italic">
                            "{mensajeRespondido.texto?.substring(0, 100) || (mensajeRespondido.tipo === "imagen" ? "📷 Imagen" : "Mensaje")}"
                        </div>
                    </div>
                    {renderAdjunto(url, tipo, nombreArchivo, sizeArchivo, esAgenteBubble, msg.texto, esSoloArchivo)}
                    {!esUbicacion && debeMostrarTexto && <div className="text-sm whitespace-pre-wrap break-words mt-1">{formatMessageText(msg.texto)}</div>}
                    {esUbicacion && coordenadas && <LocationMap lat={coordenadas.lat} lng={coordenadas.lng} isLive={msg.tipo === "live_location"} />}
                </div>
            )
        }
        
        return (
            <div key={`cuerpo-${msg.id}`}>
                {renderAdjunto(url, tipo, nombreArchivo, sizeArchivo, esAgenteBubble, msg.texto, esSoloArchivo)}
                {!esUbicacion && debeMostrarTexto && <div className="text-sm whitespace-pre-wrap break-words">{formatMessageText(msg.texto)}</div>}
                {esUbicacion && coordenadas && <LocationMap lat={coordenadas.lat} lng={coordenadas.lng} isLive={msg.tipo === "live_location"} />}
            </div>
        )
    }

    if (!selectedChat) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-white to-[#FBF8F3] h-full">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#DCE0EE] to-[#F8DFD9] flex items-center justify-center mb-4 animate-bounceIn shadow-glow">
                    <UserIcon className="w-10 h-10 text-[#1F2A4D]" />
                </div>
                <div className="text-[#9A937F] text-sm font-medium">Selecciona un chat</div>
                <div className="text-[11px] text-[#C9C2B5] mt-1">Para comenzar a atender</div>
            </div>
        )
    }

    const esChatCerrado = selectedChat.estado === "cerrado"
    const otrosAgentes = (agentes || []).filter(a => a.id !== agenteActual?.id)
    const mensajesEnHilo = mensajesDesdeUltimaBienvenida(selectedChat.mensajes)
    let diaCursor = ""
    let sepIndex = 0

    const handleMenuToggle = (e) => {
        e.stopPropagation()
        setShowMenu(!showMenu)
        setShowTransferirLista(false)
        setShowColorPicker(false)
    }

    const handleTransferirClick = (e) => {
        e.stopPropagation()
        e.preventDefault()
        setShowTransferirLista(prev => !prev)
    }

    const handleTransferir = (agenteId, e) => {
        e.stopPropagation()
        transferirChat(agenteId)
        setShowMenu(false)
        setShowTransferirLista(false)
    }

    const handleCerrarChat = (e) => {
        e.stopPropagation()
        cerrarChat()
        setShowMenu(false)
    }

    const handleReabrirChat = (e) => {
        e.stopPropagation()
        reabrirChat()
        setShowMenu(false)
    }

    const handleBuscarClick = (e) => {
        e.stopPropagation()
        setShowSearchPanel(!showSearchPanel)
        setShowMenu(false)
    }

    const iniciarRespuesta = (msg, e) => {
        if (e) e.stopPropagation()
        setMensajeRespondiendo(msg)
        textareaRef.current?.focus()
    }

    return (
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-gradient-to-br from-white to-[#FBF8F3]">
            {/* HEADER */}
            <div className="bg-white/80 backdrop-blur-md border-b border-[#E5DDD0]/50 px-4 py-3 flex-shrink-0 z-10 relative shadow-soft">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1F2A4D] to-[#E27A6E] flex items-center justify-center shadow-glow">
                            <UserIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#1F2A4D] text-sm">{selectedChat.cliente_nombre}</h3>
                            <p className="text-xs text-[#7A7567]">{selectedChat.cliente_numero}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Botón para cambiar color del asesor */}
                        <div className="relative">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowColorPicker(!showColorPicker)
                                    setShowMenu(false)
                                }}
                                className="p-2 rounded-lg hover:bg-[#F4EFE7] transition-all duration-200"
                                title="Cambiar color de tus mensajes"
                            >
                                🎨
                            </button>
                            
                            {showColorPicker && (
                                <ColorPicker 
                                    currentColor={colorAsesor}
                                    onSelectColor={handleSelectColor}
                                    onClose={() => setShowColorPicker(false)}
                                />
                            )}
                        </div>

                        {/* Menú principal */}
                        <div className="relative">
                            <button 
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleMenuToggle(e)
                                }}
                                className="p-2 rounded-lg hover:bg-[#F4EFE7] transition-all duration-200 hover-lift"
                                title="Opciones"
                            >
                                <MoreHorizontalIcon className="w-5 h-5 text-[#7A7567]" />
                            </button>
                            
                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-[#E5DDD0]/50 rounded-xl shadow-glow z-50 overflow-visible animate-scaleIn">
                                    <button 
                                        onClick={handleBuscarClick} 
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#3D3D52] hover:bg-[#FBF8F3] transition-all duration-200 rounded-lg"
                                    >
                                        <SearchIcon className="w-4 h-4 text-[#9A937F]" />
                                        <span>Buscar mensajes</span>
                                    </button>
                                    
                                    {!esChatCerrado && !modoVisualizacion && (
                                        <div className="relative">
                                            <button 
                                                onClick={handleTransferirClick}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#3D3D52] hover:bg-[#FBF8F3] transition-all duration-200 rounded-lg"
                                            >
                                                <UsersIcon className="w-4 h-4 text-[#9A937F]" />
                                                <span>Transferir chat</span>
                                                <ChevronRightIcon className="w-3 h-3 ml-auto text-[#9A937F]" />
                                            </button>
                                            
                                            {showTransferirLista && (
                                                <div className="absolute right-0 top-full mt-1 w-56 bg-white/95 backdrop-blur-md border border-[#E5DDD0]/50 rounded-xl shadow-glow z-[100] overflow-visible animate-scaleIn">
                                                    <div className="py-1">
                                                        <div className="px-3 py-2 text-xs text-[#9A937F] border-b border-[#F0EAE0] bg-[#FBF8F3]">
                                                            Transferir a:
                                                        </div>
                                                        {otrosAgentes.length === 0 ? (
                                                            <div className="px-3 py-2 text-sm text-[#7A7567]">
                                                                No hay agentes disponibles
                                                            </div>
                                                        ) : (
                                                            otrosAgentes.map(a => (
                                                                <button 
                                                                    key={a.id} 
                                                                    onClick={(e) => handleTransferir(a.id, e)} 
                                                                    className="w-full px-3 py-2 text-sm text-left hover:bg-[#FBF8F3] flex items-center justify-between transition-all duration-200"
                                                                >
                                                                    <span className="truncate">{a.nombre}</span>
                                                                    <span className="text-xs flex-shrink-0 ml-2">
                                                                        {a.estado === "disponible" ? "🟢 Disponible" : a.estado === "ocupado" ? "🔴 Ocupado" : "🟡 Descanso"}
                                                                    </span>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {!esChatCerrado && !modoVisualizacion && (
                                        <>
                                            <div className="border-t border-[#F0EAE0] my-1"></div>
                                            <button 
                                                onClick={handleCerrarChat} 
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#C24A3E] hover:bg-[#FBEFEC] transition-all duration-200 rounded-lg"
                                            >
                                                <LogOutIcon className="w-4 h-4" />
                                                <span>Cerrar chat</span>
                                            </button>
                                        </>
                                    )}
                                    
                                    {esChatCerrado && (
                                        <button 
                                            onClick={handleReabrirChat} 
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#5E8557] hover:bg-[#EEF4ED] transition-all duration-200 rounded-lg"
                                        >
                                            <RefreshCwIcon className="w-4 h-4" />
                                            <span>Reabrir chat</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {showSearchPanel && (
                    <div className="mt-3 pt-3 border-t border-[#F0EAE0]/50 animate-fadeIn">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A937F]" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar mensajes..." 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && buscarMensajes()}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#F4EFE7]/50 border border-[#E5DDD0]/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F2A4D]/50 focus:border-[#1F2A4D] transition-all duration-200"
                                    autoFocus
                                />
                            </div>
                            <button onClick={buscarMensajes} className="px-3 py-2 text-xs bg-gradient-to-r from-[#1F2A4D] to-[#E27A6E] text-white rounded-lg hover:from-[#4A5585] hover:to-[#C41E24] transition-all duration-200 shadow-soft hover-lift">Buscar</button>
                            <button onClick={() => setShowSearchPanel(false)} className="p-2 rounded-lg hover:bg-[#F4EFE7] transition-all duration-200">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {searchResults.length > 0 && (
                            <div className="mt-2 p-3 bg-gradient-to-r from-[#1F2A4D]/10 to-[#E27A6E]/10 rounded-xl border border-[#1F2A4D]/20">
                                <div className="flex justify-between items-center text-xs text-[#5A5648]">
                                    <span className="font-medium">{searchResults.length} resultados</span>
                                    <div className="flex gap-2">
                                        <button onClick={prevResult} className="p-1 rounded hover:bg-white/50 transition-all duration-200">
                                            <ChevronLeftIcon className="w-3 h-3" />
                                        </button>
                                        <span className="font-semibold text-[#1F2A4D]">{selectedResultIndex + 1}/{searchResults.length}</span>
                                        <button onClick={nextResult} className="p-1 rounded hover:bg-white/50 transition-all duration-200">
                                            <ChevronRightIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MENSAJES */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3" ref={messagesContainerRef} onScroll={handleScroll}>
                {cargandoHistorial && (
                    <div className="flex justify-center py-2" key="loading-historial">
                        <div className="w-4 h-4 border-2 border-[#D6CCBB] border-t-[#E27A6E] rounded-full animate-spin"></div>
                    </div>
                )}
                {dragOver && (
                    <div className="flex justify-center py-8" key="drag-overlay">
                        <div className="text-sm text-[#1F2A4D] font-medium bg-[#1F2A4D]/10 backdrop-blur-sm px-4 py-2 rounded-xl animate-pulseSoft shadow-soft">📎 Suelta archivos aquí</div>
                    </div>
                )}
                {mensajesEnHilo.map((msg, index) => {
                    const fechaIso = msg.horaISO || msg.hora || msg.created_at
                    const dia = etiquetaDia(fechaIso)
                    let showSep = false
                    if (dia && dia !== diaCursor) {
                        diaCursor = dia
                        showSep = true
                        sepIndex++
                    }
                    const hora = horaWhatsApp(fechaIso)

                    if (msg.tipo === "bienvenida" && msg.emisor === "agente") {
                        return (
                            <div key={`msg-${msg.id}`}>
                                {showSep && renderDateSeparator(dia, sepIndex)}
                                <WelcomeMessage msg={msg} hora={hora} agenteNombre={agenteActual?.nombre} />
                            </div>
                        )
                    }

                    if (msg.emisor === "sistema") {
                        return (
                            <div key={`msg-${msg.id}`}>
                                {showSep && renderDateSeparator(dia, sepIndex)}
                                <SystemMessage msg={msg} hora={hora} />
                            </div>
                        )
                    }

                    const esAgenteBubble = msg.emisor === "agente"
                    
                    return (
                        <div key={`msg-${msg.id}`} id={`message-${msg.id}`}>
                            {showSep && renderDateSeparator(dia, sepIndex)}
                            <div className={`flex ${esAgenteBubble ? "justify-end" : "justify-start"} group mb-3 animate-fadeIn relative`} 
                                 onContextMenu={(e) => handleContextMenu(e, msg)}>
                                
                                {/* Botón de respuesta (citar) */}
                                <button
                                    onClick={(e) => iniciarRespuesta(msg, e)}
                                    className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10
                                                ${esAgenteBubble ? "-right-8" : "-left-8"} 
                                                p-1.5 rounded-full bg-white shadow-md hover:bg-[#F4EFE7] hover:scale-110
                                                border border-[#E5DDD0]/50`}
                                    title="Responder (citar)"
                                >
                                    <ReplyIcon className="w-3.5 h-3.5 text-[#1F2A4D]" />
                                </button>
                                
                                <div className={`${esAgenteBubble ? "ml-auto" : "mr-auto"} max-w-[85%] relative`}>
                                    {!esAgenteBubble && (
                                        <div className="text-[10px] text-[#9A937F] mb-0.5 ml-1">{selectedChat.cliente_nombre}</div>
                                    )}
                                    <div className={`relative px-4 py-2.5 rounded-2xl break-words shadow-soft transition-all duration-200 hover:shadow-glow ${
                                        esAgenteBubble 
                                            ? `bg-gradient-to-br ${colorAsesor.gradient} text-white rounded-br-sm`
                                            : "bg-white text-[#1F2A4D] rounded-bl-sm border border-[#E5DDD0]/50"
                                    }`}>
                                        {renderCuerpoMensaje(msg, esAgenteBubble)}
                                        <div className={`text-[9px] mt-1 flex items-center gap-1 justify-end ${esAgenteBubble ? "text-white/70" : "text-[#7A7567]"}`}>
                                            <span>{hora}</span>
                                            {esAgenteBubble && <CheckCheckIcon className="w-2.5 h-2.5" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} key="messages-end" />
            </div>

            {/* MENÚ CONTEXTUAL */}
            {contextMenu && (
                <div
                    key="context-menu"
                    className="fixed bg-white/95 backdrop-blur-md rounded-xl shadow-glow border border-[#E5DDD0]/50 py-1 z-50 min-w-[150px] animate-scaleIn"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => { iniciarRespuesta(contextMenu.mensaje); closeContextMenu() }}
                        className="w-full px-4 py-2 text-left hover:bg-[#FBF8F3] flex items-center gap-2 text-sm text-[#3D3D52] transition-all duration-200"
                    >
                        <ReplyIcon className="w-4 h-4" />
                        <span>Responder (citar)</span>
                    </button>
                </div>
            )}

            {/* INPUT */}
            {!esChatCerrado ? (
                <div className="bg-white/80 backdrop-blur-md border-t border-[#E5DDD0]/50 p-3 flex-shrink-0">
                    {mensajeRespondiendo && (
                        <div className="flex items-center gap-2 mb-2 p-2.5 bg-gradient-to-r from-[#1F2A4D]/10 to-[#E27A6E]/10 rounded-xl border border-[#E27A6E]/30">
                            <div className="bg-gradient-to-br from-[#1F2A4D] to-[#E27A6E] rounded-full p-1">
                                <ReplyIcon className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] text-[#1F2A4D] font-medium">
                                    Respondiendo a {mensajeRespondiendo.emisor === "agente" ? "ti mismo" : selectedChat.cliente_nombre}
                                </div>
                                <div className="text-xs text-[#5A5648] truncate italic">
                                    {mensajeRespondiendo.texto?.substring(0, 50) || (mensajeRespondiendo.tipo === "imagen" ? "📷 Imagen adjunta" : mensajeRespondiendo.tipo === "video" ? "🎥 Video adjunto" : "Mensaje")}
                                </div>
                            </div>
                            <button 
                                onClick={cancelarRespuesta} 
                                className="p-1.5 hover:bg-white/50 rounded-full transition-all duration-200"
                                title="Cancelar respuesta"
                            >
                                <XIcon className="w-3.5 h-3.5 text-[#7A7567]" />
                            </button>
                        </div>
                    )}
                    
                    {archivosPendientes.length > 0 && (
                        <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                            {archivosPendientes.map(arch => {
                                const extension = arch.nombre?.split('.').pop()?.toLowerCase() || ''
                                const getIcon = () => {
                                    if (extension === 'pdf') return "📄"
                                    if (['jpg','jpeg','png','gif','webp'].includes(extension)) return "🖼️"
                                    if (['mp4','avi','mov'].includes(extension)) return "🎬"
                                    if (['doc','docx'].includes(extension)) return "📝"
                                    if (['xls','xlsx'].includes(extension)) return "📊"
                                    if (['ppt','pptx'].includes(extension)) return "📽️"
                                    if (['mp3','wav','ogg'].includes(extension)) return "🎵"
                                    return "📎"
                                }
                                return (
                                    <div key={arch.id} className="relative flex-shrink-0 w-20 h-20 bg-white rounded-xl border border-[#E5DDD0]/50 overflow-hidden shadow-soft hover:shadow-glow transition-all duration-200 group">
                                        {arch.preview ? (
                                            <img src={arch.preview} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                                <span className="text-2xl">{getIcon()}</span>
                                                <span className="text-[8px] text-gray-400 mt-1 truncate px-1">{extension.toUpperCase()}</span>
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => eliminarArchivoPendiente(arch.id)} 
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <XIcon className="w-2.5 h-2.5" />
                                        </button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm py-0.5">
                                            <div className="text-[8px] text-white text-center truncate px-1">{arch.nombre?.substring(0, 15)}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    
                    {subiendo && (
                        <div className="mb-2">
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#1F2A4D] to-[#E27A6E] rounded-full transition-all" style={{ width: `${progresoSubida}%` }}></div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 text-center">Subiendo archivo... {progresoSubida}%</p>
                        </div>
                    )}
                    
                    <div className="flex gap-2 items-end">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-[#F4EFE7] transition-all self-center" title="Adjuntar">
                            <PaperclipIcon className="w-5 h-5 text-[#7A7567]" />
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => agregarArchivosPendientes(Array.from(e.target.files || []))} />
                        
                        <button onClick={() => setShowEmojis(!showEmojis)} className="p-2 rounded-lg hover:bg-[#F4EFE7] transition-all text-[#7A7567] self-center">
                            😊
                        </button>
                        
                        {showEmojis && (
                            <div className="absolute bottom-16 left-4 z-50 shadow-xl rounded-xl overflow-hidden">
                                <EmojiPicker onEmojiClick={(emoji) => {
                                    if (textareaRef.current) {
                                        const textarea = textareaRef.current
                                        const start = textarea.selectionStart
                                        const end = textarea.selectionEnd
                                        const value = textarea.value
                                        textarea.value = value.substring(0, start) + emoji.emoji + value.substring(end)
                                        textarea.dispatchEvent(new Event('input'))
                                    }
                                    setShowEmojis(false)
                                }} />
                            </div>
                        )}
                        
                        <textarea
                            ref={textareaRef}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    enviarMensajeTexto()
                                }
                            }}
                            onInput={(e) => {
                                e.target.style.height = 'auto'
                                const nuevaAltura = Math.min(e.target.scrollHeight, 120)
                                e.target.style.height = `${nuevaAltura}px`
                            }}
                            placeholder="Escribe un mensaje..."
                            rows={1}
                            className="flex-1 px-4 py-2.5 text-sm bg-[#F4EFE7]/50 border border-[#E5DDD0]/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2A4D]/50 focus:border-[#1F2A4D] transition-all resize-none overflow-y-auto"
                            style={{ minHeight: '42px', maxHeight: '120px' }}
                        />
                        
                        <button 
                            onClick={enviarMensajeTexto}
                            disabled={subiendo}
                            className="p-2.5 rounded-xl bg-gradient-to-r from-[#1F2A4D] to-[#E27A6E] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-[#4A5585] hover:to-[#C41E24] transition-all self-center"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="text-[10px] text-[#9A937F] mt-1 text-center">
                        ↵ Enter para enviar · Shift+Enter para nueva línea
                    </div>
                </div>
            ) : (
                <div className="bg-white/80 backdrop-blur-md border-t border-[#E5DDD0]/50 p-3 text-center text-xs text-[#9A937F]">
                    Chat cerrado. <button onClick={reabrirChat} className="text-[#1F2A4D] hover:text-[#E27A6E] font-medium">Reabrir</button>
                </div>
            )}
        </div>
    )
}

export default ChatWindow
