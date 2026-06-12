// src/components/AdminDashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api'
import socket from '../sockets/socket'
import ChatWindow from './ChatWindow'
import { 
    UsersIcon, 
    MessageCircleIcon, 
    CalendarIcon, 
    AlertCircleIcon, 
    PlusIcon, 
    EditIcon, 
    TrashIcon, 
    XIcon, 
    RefreshIcon, 
    CheckCircleIcon, 
    ArrowLeftIcon, 
    UserCheckIcon, 
    ClockIcon, 
    ChevronRightIcon, 
    InboxIcon, 
    ListIcon, 
    MessageSquareIcon, 
    SearchIcon, 
    FilterIcon
} from "./icons";

export default function AdminDashboard({ agenteActual, cargarAgentes }) {
    const [stats, setStats] = useState({
        totalAgentes: 0,
        agentesActivos: 0,
        chatsActivos: 0,
        chatsHoy: 0,
        chatsSinAsignar: 0
    })
    const [agentesLista, setAgentesLista] = useState([])
    const [chatsActivos, setChatsActivos] = useState([])
    const [chatsSinAsignar, setChatsSinAsignar] = useState([])
    const [chatsOlvidados, setChatsOlvidados] = useState([])
    const [todosChats, setTodosChats] = useState([])
    const [cargando, setCargando] = useState(true)
    const [tabActiva, setTabActiva] = useState('sin-asignar')
    const [mostrarModalAgente, setMostrarModalAgente] = useState(false)
    const [agenteEditando, setAgenteEditando] = useState(null)
    const [formAgente, setFormAgente] = useState({ 
        usuario: '', 
        password: '', 
        nombre: '', 
        rol: 'agente' 
    })
    
    // Filtros mejorados
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')
    const [busquedaTelefono, setBusquedaTelefono] = useState('')
    const [busquedaNombre, setBusquedaNombre] = useState('')
    const [filtroAgente, setFiltroAgente] = useState('todos')
    const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false)
    const [paginaActual, setPaginaActual] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)

    const [selectedChat, setSelectedChat] = useState(null)
    const [inputMessage, setInputMessage] = useState('')
    const [enviando, setEnviando] = useState(false)

    // Inyectar estilos mejorados
    useEffect(() => {
        if (!document.getElementById('admin-styles')) {
            const styleTag = document.createElement('style')
            styleTag.id = 'admin-styles'
            styleTag.textContent = `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .stat-card {
                    animation: fadeInUp 0.4s ease forwards;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .stat-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 20px 25px -12px rgba(0, 0, 0, 0.15);
                }
                .stat-card:hover .stat-icon {
                    transform: scale(1.1);
                }
                .stat-icon {
                    transition: transform 0.3s ease;
                }
                .tab-item {
                    transition: all 0.2s ease;
                    position: relative;
                }
                .tab-item.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                    border-radius: 3px;
                }
                .empty-state {
                    animation: slideInLeft 0.4s ease forwards;
                }
                .btn-hover {
                    transition: all 0.2s ease;
                }
                .btn-hover:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                .filter-badge {
                    animation: fadeInUp 0.3s ease;
                }
            `
            document.head.appendChild(styleTag)
        }
    }, [])

    const cargarDatos = useCallback(async () => {
        setCargando(true)
        try {
            await Promise.all([
                cargarEstadisticas(),
                cargarAgentesLista(),
                cargarChatsActivos(),
                cargarChatsSinAsignar(),
                cargarChatsOlvidados()
            ])
        } catch (error) {
            console.error('Error cargando datos:', error)
        }
        setCargando(false)
    }, [])

    const cargarEstadisticas = async () => {
        try {
            const res = await apiFetch('/api/admin/estadisticas')
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const cargarAgentesLista = async () => {
        try {
            const res = await apiFetch('/api/admin/agentes')
            if (res.ok) {
                const data = await res.json()
                setAgentesLista(data)
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const cargarChatsActivos = async () => {
        try {
            const res = await apiFetch('/api/admin/chats-activos')
            if (res.ok) {
                const data = await res.json()
                setChatsActivos(data)
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const cargarChatsSinAsignar = async () => {
        try {
            const res = await apiFetch('/api/admin/chats-sin-asignar')
            if (res.ok) {
                const data = await res.json()
                setChatsSinAsignar(data)
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const cargarChatsOlvidados = async () => {
        try {
            const res = await apiFetch('/api/admin/chats-olvidados')
            if (res.ok) {
                const data = await res.json()
                setChatsOlvidados(data)
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const cargarTodosChats = async (pagina = 1) => {
        try {
            let url = `/api/admin/todos-chats?pagina=${pagina}&limite=20`
            
            if (filtroEstado !== 'todos') {
                url += `&estado=${filtroEstado}`
            }
            if (fechaInicio) {
                url += `&fecha_inicio=${fechaInicio}`
            }
            if (fechaFin) {
                url += `&fecha_fin=${fechaFin}`
            }
            if (busquedaTelefono && busquedaTelefono.trim()) {
                url += `&telefono=${encodeURIComponent(busquedaTelefono.trim())}`
            }
            if (busquedaNombre && busquedaNombre.trim()) {
                url += `&nombre=${encodeURIComponent(busquedaNombre.trim())}`
            }
            if (filtroAgente !== 'todos') {
                url += `&agente_id=${filtroAgente}`
            }
            
            const res = await apiFetch(url)
            if (res.ok) {
                const data = await res.json()
                setTodosChats(data.chats || [])
                setTotalPaginas(data.total_paginas || 1)
                setPaginaActual(data.pagina || 1)
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const limpiarFiltros = () => {
        setFiltroEstado('todos')
        setFechaInicio('')
        setFechaFin('')
        setBusquedaTelefono('')
        setBusquedaNombre('')
        setFiltroAgente('todos')
        setPaginaActual(1)
        cargarTodosChats(1)
    }

    const aplicarFiltros = useCallback(() => {
        setPaginaActual(1)
        cargarTodosChats(1)
    }, [filtroEstado, fechaInicio, fechaFin, busquedaTelefono, busquedaNombre, filtroAgente])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (tabActiva === 'todos') {
                aplicarFiltros()
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [busquedaTelefono, busquedaNombre, aplicarFiltros, tabActiva])

    useEffect(() => {
        if (tabActiva === 'todos') {
            aplicarFiltros()
        }
    }, [filtroEstado, fechaInicio, fechaFin, filtroAgente, aplicarFiltros, tabActiva])

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

    const abrirChatCompleto = async (chat) => {
        const mensajes = await cargarMensajes(chat.id)
        setSelectedChat({ ...chat, mensajes })
    }

    const cerrarChatCompleto = () => {
        setSelectedChat(null)
        cargarDatos()
        if (tabActiva === 'todos') {
            cargarTodosChats(paginaActual)
        }
    }

    const enviarMensaje = async (opts) => {
        const mensaje = opts?.texto || inputMessage
        const chat = selectedChat
        
        if (!chat) return
        if (!mensaje?.trim()) return

        const nuevoMensaje = {
            chat_id: chat.id,
            texto: mensaje,
            tipo: "texto"
        }

        setEnviando(true)
        try {
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

            setSelectedChat(prev => ({
                ...prev,
                mensajes: [...(prev?.mensajes || []), mensajeConHora],
                ultimo_mensaje: mensaje
            }))

            setInputMessage("")
            cargarDatos()
            if (tabActiva === 'todos') {
                cargarTodosChats(paginaActual)
            }
        } catch (error) {
            console.error("Error enviando mensaje:", error)
        }
        setEnviando(false)
    }

    const asignarChat = async (chatId, agenteId) => {
        if (!agenteId) return
        try {
            const res = await apiFetch(`/api/admin/chats/${chatId}/asignar`, {
                method: 'POST',
                body: JSON.stringify({ agente_id: parseInt(agenteId) })
            })
            if (res.ok) {
                alert('Chat asignado correctamente')
                cargarChatsSinAsignar()
                cargarChatsActivos()
                cargarChatsOlvidados()
                cargarEstadisticas()
                setSelectedChat(null)
                if (tabActiva === 'todos') {
                    cargarTodosChats(paginaActual)
                }
            } else {
                const error = await res.json()
                alert(error.error || 'Error al asignar')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al asignar chat')
        }
    }

    const reasignarChat = async (chatId, nuevoAgenteId) => {
        if (!nuevoAgenteId) return
        try {
            const res = await apiFetch(`/api/admin/chats/${chatId}/reasignar`, {
                method: 'POST',
                body: JSON.stringify({ nuevo_agente_id: parseInt(nuevoAgenteId) })
            })
            if (res.ok) {
                alert('Chat reasignado correctamente')
                cargarChatsActivos()
                cargarChatsOlvidados()
                if (tabActiva === 'todos') {
                    cargarTodosChats(paginaActual)
                }
            } else {
                const error = await res.json()
                alert(error.error || 'Error al reasignar')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al reasignar')
        }
    }

    const guardarAgente = async () => {
        if (!formAgente.usuario || !formAgente.nombre) {
            alert('Usuario y nombre son obligatorios')
            return
        }
        
        if (!agenteEditando && !formAgente.password) {
            alert('Contraseña es obligatoria para nuevos agentes')
            return
        }

        try {
            let res
            if (agenteEditando) {
                res = await apiFetch(`/api/admin/agentes/${agenteEditando.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formAgente)
                })
            } else {
                res = await apiFetch('/api/admin/agentes', {
                    method: 'POST',
                    body: JSON.stringify(formAgente)
                })
            }
            
            if (res.ok) {
                alert(agenteEditando ? 'Agente actualizado' : 'Agente creado')
                setMostrarModalAgente(false)
                setAgenteEditando(null)
                setFormAgente({ usuario: '', password: '', nombre: '', rol: 'agente' })
                cargarAgentesLista()
                if (cargarAgentes) cargarAgentes()
            } else {
                const error = await res.json()
                alert(error.error || 'Error al guardar')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al guardar agente')
        }
    }

    const eliminarAgente = async (agente) => {
        if (!confirm(`¿Eliminar a ${agente.nombre}?`)) return
        try {
            const res = await apiFetch(`/api/admin/agentes/${agente.id}`, { method: 'DELETE' })
            if (res.ok) {
                alert('Agente eliminado')
                cargarAgentesLista()
                if (cargarAgentes) cargarAgentes()
            } else {
                const error = await res.json()
                alert(error.error || 'Error al eliminar')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al eliminar agente')
        }
    }

    const cambiarEstadoAgente = async (agenteId, nuevoEstado) => {
        try {
            const res = await apiFetch(`/api/admin/agentes/${agenteId}`, {
                method: 'PUT',
                body: JSON.stringify({ estado: nuevoEstado })
            })
            if (res.ok) {
                cargarAgentesLista()
                if (cargarAgentes) cargarAgentes()
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    useEffect(() => {
        const handleChatsActualizados = () => {
            cargarChatsSinAsignar()
            cargarChatsActivos()
            cargarChatsOlvidados()
            cargarEstadisticas()
            if (tabActiva === 'todos') {
                cargarTodosChats(paginaActual)
            }
        }
        
        socket.on('chats-actualizados', handleChatsActualizados)
        socket.on('chat-asignado', handleChatsActualizados)
        
        return () => {
            socket.off('chats-actualizados', handleChatsActualizados)
            socket.off('chat-asignado', handleChatsActualizados)
        }
    }, [tabActiva, paginaActual])

    useEffect(() => {
        cargarDatos()
    }, [cargarDatos])

    const getInitials = (nombre) => {
        if (!nombre) return "??"
        return nombre.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }

    const getEstadoColor = (estado) => {
        switch(estado) {
            case 'disponible': return 'bg-green-500'
            case 'ocupado': return 'bg-yellow-500'
            default: return 'bg-gray-400'
        }
    }

    const filtrosActivos = () => {
        let count = 0
        if (filtroEstado !== 'todos') count++
        if (fechaInicio) count++
        if (fechaFin) count++
        if (busquedaTelefono) count++
        if (busquedaNombre) count++
        if (filtroAgente !== 'todos') count++
        return count
    }

    // Configuración de tabs - SIN NOTIFICACIONES
    const tabs = [
        { id: 'sin-asignar', label: 'Sin Asignar', icon: InboxIcon, color: 'orange', count: chatsSinAsignar.length },
        { id: 'activos', label: 'Chats Activos', icon: MessageSquareIcon, color: 'blue', count: chatsActivos.length },
        { id: 'olvidados', label: 'Sin Respuesta', icon: AlertCircleIcon, color: 'red', count: chatsOlvidados.length },
        { id: 'todos', label: 'Todos los Chats', icon: ListIcon, color: 'purple', count: null },
        { id: 'agentes', label: 'Agentes', icon: UsersIcon, color: 'green', count: null }
    ]

    const cards = [
        { title: "Total Agentes", value: stats.totalAgentes, icon: UsersIcon, color: "blue", description: "Todos los agentes registrados" },
        { title: "Agentes Activos", value: stats.agentesActivos, icon: UserCheckIcon, color: "green", description: "Agentes disponibles ahora" },
        { title: "Chats Activos", value: stats.chatsActivos, icon: MessageCircleIcon, color: "purple", description: "Conversaciones en curso" },
        { title: "Chats Hoy", value: stats.chatsHoy, icon: CalendarIcon, color: "orange", description: "Chats iniciados hoy" },
        { title: "Sin Asignar", value: stats.chatsSinAsignar, icon: ClockIcon, color: "red", description: "Chats esperando atención", highlight: stats.chatsSinAsignar > 0 }
    ]

    const colorStyles = {
        blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", gradient: "from-blue-500 to-blue-600" },
        green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100", gradient: "from-green-500 to-green-600" },
        purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100", gradient: "from-purple-500 to-purple-600" },
        orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", gradient: "from-orange-500 to-orange-600" },
        red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100", gradient: "from-red-500 to-red-600" }
    }

    if (selectedChat) {
        return (
            <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
                <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-3 flex-shrink-0">
                    <button onClick={cerrarChatCompleto} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>Volver al panel de administración</span>
                    </button>
                    <div className="text-sm text-gray-400">| Viendo chat como <span className="text-blue-500 font-medium">Administrador</span></div>
                </div>
                <div className="flex-1 min-h-0">
                    <ChatWindow
                        selectedChat={selectedChat}
                        inputMessage={inputMessage}
                        setInputMessage={setInputMessage}
                        enviarMensaje={enviarMensaje}
                        agenteActual={agenteActual}
                        cargarChats={cargarDatos}
                        setSelectedChat={setSelectedChat}
                        cerrarChat={cerrarChatCompleto}
                        transferirChat={(nuevoAgenteId) => reasignarChat(selectedChat.id, nuevoAgenteId)}
                        tomarChat={() => {}}
                        reabrirChat={() => {}}
                        agentes={agentesLista}
                        esAdmin={true}
                        modoVisualizacion="Administrador - Visualizando chat"
                        cargarMensajes={cargarMensajes}
                    />
                </div>
            </div>
        )
    }

    if (cargando) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Cargando panel de administración...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
            <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                Panel de Administración
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona agentes y monitorea el sistema</p>
                        </div>
                        <button 
                            onClick={cargarDatos} 
                            className="btn-hover p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 hover:rotate-180"
                        >
                            <RefreshIcon className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Tarjetas de estadísticas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                    {cards.map((card, index) => {
                        const Icon = card.icon
                        const styles = colorStyles[card.color]
                        const isHighlight = card.highlight && card.value > 0
                        
                        return (
                            <div 
                                key={index}
                                className="stat-card bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-xl"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                {card.title}
                                            </p>
                                            <p className={`text-3xl font-bold ${isHighlight ? 'text-red-600' : 'text-gray-800 dark:text-white'}`}>
                                                {card.value}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                                                {card.description}
                                                <ChevronRightIcon className="w-3 h-3 opacity-0 transition-all group-hover:opacity-100" />
                                            </p>
                                        </div>
                                        <div className={`stat-icon p-3 rounded-2xl ${styles.bg}`}>
                                            <Icon className={`w-6 h-6 ${styles.text}`} />
                                        </div>
                                    </div>
                                </div>
                                <div className={`h-1 bg-gradient-to-r ${styles.gradient} opacity-75`} />
                            </div>
                        )
                    })}
                </div>

                {/* Tabs mejorados - SIN NOTIFICACIONES */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="flex gap-1 flex-wrap">
                        {tabs.map(tab => {
                            const Icon = tab.icon
                            const isActive = tabActiva === tab.id
                            const colorMap = {
                                orange: "hover:text-orange-600",
                                blue: "hover:text-blue-600",
                                red: "hover:text-red-600",
                                purple: "hover:text-purple-600",
                                green: "hover:text-green-600"
                            }
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { 
                                        setTabActiva(tab.id)
                                        if (tab.id === 'sin-asignar') cargarChatsSinAsignar()
                                        else if (tab.id === 'activos') cargarChatsActivos()
                                        else if (tab.id === 'olvidados') cargarChatsOlvidados()
                                        else if (tab.id === 'todos') cargarTodosChats(1)
                                    }}
                                    className={`tab-item flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium transition-all duration-200
                                        ${isActive 
                                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                                            : `text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 ${colorMap[tab.color]}`
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                    {tab.count !== null && tab.count > 0 && (
                                        <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                                            tab.id === 'sin-asignar' ? 'bg-orange-100 text-orange-600' :
                                            tab.id === 'activos' ? 'bg-blue-100 text-blue-600' :
                                            tab.id === 'olvidados' ? 'bg-red-100 text-red-600' :
                                            'bg-purple-100 text-purple-600'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* CHATS SIN ASIGNAR */}
                {tabActiva === 'sin-asignar' && (
                    <div>
                        {chatsSinAsignar.length === 0 ? (
                            <div className="empty-state bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-800/30 flex items-center justify-center">
                                    <CheckCircleIcon className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">¡Todo al día!</h3>
                                <p className="text-green-600 dark:text-green-500">No hay chats pendientes por asignar</p>
                                <p className="text-sm text-green-500 dark:text-green-400 mt-1">Todos los chats tienen un asesor asignado</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {chatsSinAsignar.map(chat => (
                                    <div key={chat.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start flex-wrap gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold text-gray-800 dark:text-white">{chat.cliente_nombre || 'Cliente'}</h3>
                                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">⏱️ {Math.round(chat.minutos_espera || 0)} min esperando</span>
                                                </div>
                                                <p className="text-sm text-gray-500">{chat.cliente_numero}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{chat.ultimo_mensaje || 'Sin mensajes'}</p>
                                                <p className="text-xs text-gray-400 mt-1">📊 {chat.total_mensajes || 0} mensajes</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => abrirChatCompleto(chat)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all">Ver Chat Completo</button>
                                                <select onChange={(e) => asignarChat(chat.id, e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700" defaultValue="">
                                                    <option value="" disabled>Asignar a...</option>
                                                    {agentesLista.filter(a => a.estado === 'disponible' && a.rol !== 'admin').map(a => (<option key={a.id} value={a.id}>{a.nombre}</option>))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* CHATS ACTIVOS */}
                {tabActiva === 'activos' && (
                    <div>
                        {chatsActivos.length === 0 ? (
                            <div className="empty-state bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center">
                                    <MessageCircleIcon className="w-10 h-10 text-blue-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2">Sin chats activos</h3>
                                <p className="text-blue-600 dark:text-blue-500">No hay conversaciones en curso en este momento</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {agentesLista.filter(a => a.estado !== 'inactivo' && a.rol !== 'admin').map(agente => {
                                    const chatsDelAgente = chatsActivos.filter(c => c.agente_id === agente.id)
                                    if (chatsDelAgente.length === 0) return null
                                    return (
                                        <div key={agente.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all">
                                            <div className="p-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 border-b flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-blue-600 font-medium text-sm">{getInitials(agente.nombre)}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">{agente.nombre}</div>
                                                        <div className="text-xs text-gray-500">{chatsDelAgente.length} chats activos</div>
                                                    </div>
                                                </div>
                                                <div className={`w-2 h-2 rounded-full ${getEstadoColor(agente.estado)}`} />
                                            </div>
                                            <div className="divide-y max-h-96 overflow-y-auto">
                                                {chatsDelAgente.map(chat => (
                                                    <div key={chat.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => abrirChatCompleto(chat)}>
                                                        <div className="font-medium text-sm">{chat.cliente_nombre || 'Cliente'}</div>
                                                        <div className="text-xs text-gray-500 truncate">{chat.ultimo_mensaje?.substring(0, 60) || 'Sin mensajes'}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* CHATS OLVIDADOS */}
                {tabActiva === 'olvidados' && (
                    <div>
                        {chatsOlvidados.length === 0 ? (
                            <div className="empty-state bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-800/30 flex items-center justify-center">
                                    <CheckCircleIcon className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">¡Excelente atención!</h3>
                                <p className="text-green-600 dark:text-green-500">No hay chats sin respuesta</p>
                                <p className="text-sm text-green-500 dark:text-green-400 mt-1">Todos los clientes están siendo atendidos</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {chatsOlvidados.map(chat => (
                                    <div key={chat.id} className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-4 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start flex-wrap gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-800 dark:text-white">{chat.cliente_nombre || 'Cliente'}</h3>
                                                <p className="text-sm text-gray-500">{chat.cliente_numero}</p>
                                                <p className="text-sm text-gray-600 mt-2">Asignado a: <span className="font-medium">{chat.agente_nombre || 'Sin asignar'}</span></p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => abrirChatCompleto(chat)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all">Ver Chat Completo</button>
                                                <select onChange={(e) => reasignarChat(chat.id, e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm bg-white" defaultValue="">
                                                    <option value="" disabled>Reasignar a...</option>
                                                    {agentesLista.filter(a => a.estado === 'disponible' && a.id !== chat.agente_id && a.rol !== 'admin').map(a => (<option key={a.id} value={a.id}>{a.nombre}</option>))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TODOS LOS CHATS - FILTROS MEJORADOS */}
                {tabActiva === 'todos' && (
                    <div>
                        {/* Panel de filtros mejorado */}
                        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FilterIcon className="w-5 h-5 text-gray-500" />
                                        <h3 className="font-semibold text-gray-700 dark:text-gray-300">Filtros de búsqueda</h3>
                                        {filtrosActivos() > 0 && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                {filtrosActivos()} filtros activos
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
                                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        {mostrarFiltrosAvanzados ? 'Ocultar' : 'Mostrar'} filtros avanzados
                                        <ChevronRightIcon className={`w-4 h-4 transform transition-transform ${mostrarFiltrosAvanzados ? 'rotate-90' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-4 space-y-4">
                                {/* Filtros rápidos */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            <SearchIcon className="w-4 h-4 inline mr-1" />
                                            Número de teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="Ej: 3001234567"
                                            value={busquedaTelefono}
                                            onChange={(e) => setBusquedaTelefono(e.target.value)}
                                            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                        <SearchIcon className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                                    </div>
                                    
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            <UsersIcon className="w-4 h-4 inline mr-1" />
                                            Nombre del cliente
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nombre del cliente"
                                            value={busquedaNombre}
                                            onChange={(e) => setBusquedaNombre(e.target.value)}
                                            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                        <SearchIcon className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>

                                {/* Filtros avanzados */}
                                {mostrarFiltrosAvanzados && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 filter-badge">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado del chat</label>
                                            <select 
                                                value={filtroEstado} 
                                                onChange={(e) => setFiltroEstado(e.target.value)} 
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="todos">Todos</option>
                                                <option value="abierto">Abiertos 🟢</option>
                                                <option value="cerrado">Cerrados 🔒</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agente asignado</label>
                                            <select 
                                                value={filtroAgente} 
                                                onChange={(e) => setFiltroAgente(e.target.value)} 
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="todos">Todos los agentes</option>
                                                <option value="sin_asignar">Sin asignar</option>
                                                {agentesLista.filter(a => a.rol !== 'admin').map(agente => (
                                                    <option key={agente.id} value={agente.id}>{agente.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rango de fechas</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <input
                                                        type="date"
                                                        value={fechaInicio}
                                                        onChange={(e) => setFechaInicio(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder="Fecha inicio"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="date"
                                                        value={fechaFin}
                                                        onChange={(e) => setFechaFin(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder="Fecha fin"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Botones de acción */}
                                <div className="flex justify-end gap-2 pt-2">
                                    {filtrosActivos() > 0 && (
                                        <button
                                            onClick={limpiarFiltros}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
                                        >
                                            <XIcon className="w-4 h-4" />
                                            Limpiar todos los filtros
                                        </button>
                                    )}
                                    <button
                                        onClick={aplicarFiltros}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                                    >
                                        <SearchIcon className="w-4 h-4" />
                                        Aplicar filtros
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tabla de resultados */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
                            {todosChats.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        <SearchIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No se encontraron chats</h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {filtrosActivos() > 0 
                                            ? 'No hay chats que coincidan con los filtros seleccionados' 
                                            : 'No hay chats disponibles'}
                                    </p>
                                    {filtrosActivos() > 0 && (
                                        <button
                                            onClick={limpiarFiltros}
                                            className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 text-sm"
                                        >
                                            Limpiar filtros
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Número</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Agente</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Estado</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Mensajes</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {todosChats.map(chat => (
                                                    <tr key={chat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                            {chat.cliente_nombre || 'Cliente'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                                                            {chat.cliente_numero || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            {chat.agente_nombre || 'Sin asignar'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                                chat.estado === 'abierto' 
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                                                            }`}>
                                                                {chat.estado === 'abierto' ? '🟢 Abierto' : '🔒 Cerrado'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            {chat.total_mensajes || 0}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                            {chat.created_at ? new Date(chat.created_at).toLocaleDateString('es-CO') : '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button 
                                                                onClick={() => abrirChatCompleto(chat)} 
                                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                                                            >
                                                                Ver chat
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* Paginación mejorada */}
                                    {totalPaginas > 1 && (
                                        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Mostrando {((paginaActual - 1) * 20) + 1} - {Math.min(paginaActual * 20, todosChats.length)} de {todosChats.length} chats
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => cargarTodosChats(paginaActual - 1)} 
                                                    disabled={paginaActual === 1} 
                                                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    Anterior
                                                </button>
                                                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                                                    Página {paginaActual} de {totalPaginas}
                                                </span>
                                                <button 
                                                    onClick={() => cargarTodosChats(paginaActual + 1)} 
                                                    disabled={paginaActual === totalPaginas} 
                                                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    Siguiente
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* GESTIÓN DE AGENTES */}
                {tabActiva === 'agentes' && (
                    <div>
                        <div className="mb-4 flex justify-end gap-2">
                            <button 
                                onClick={async () => {
                                    if (confirm('¿Inicializar chats internos para TODOS los agentes?\n\nEsto creará conversaciones vacías entre todos los agentes para que puedan chatear entre sí.')) {
                                        try {
                                            const res = await apiFetch('/api/interno/inicializar-todos', { method: 'POST' })
                                            const data = await res.json()
                                            if (res.ok) {
                                                alert(`Inicialización completada!\n\n📊 Chats creados: ${data.creados}\n📋 Ya existían: ${data.existentes}`)
                                                window.location.reload()
                                            } else {
                                                alert('Error: ' + (data.error || 'No se pudo inicializar'))
                                            }
                                        } catch (error) {
                                            console.error('Error:', error)
                                            alert('Error de conexión')
                                        }
                                    }
                                }}
                                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center gap-2 transition-all"
                            >
                                🔄 Inicializar todos los chats internos
                            </button>
                            <button 
                                onClick={() => {
                                    setAgenteEditando(null)
                                    setFormAgente({ usuario: '', password: '', nombre: '', rol: 'agente' })
                                    setMostrarModalAgente(true)
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-all"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Nuevo Agente
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Agente</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Usuario</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Estado</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Rol</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {agentesLista.map(agente => (
                                            <tr key={agente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{getInitials(agente.nombre)}</span>
                                                        </div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{agente.nombre}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">@{agente.usuario}</td>
                                                <td className="px-4 py-3">
                                                    <select 
                                                        value={agente.estado} 
                                                        onChange={(e) => cambiarEstadoAgente(agente.id, e.target.value)} 
                                                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    >
                                                        <option value="disponible">🟢 Disponible</option>
                                                        <option value="ocupado">🟡 Ocupado</option>
                                                        <option value="inactivo">⚫ Inactivo</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                                        agente.rol === 'admin' 
                                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                                                    }`}>
                                                        {agente.rol === 'admin' ? 'Admin' : 'Agente'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => { 
                                                                setAgenteEditando(agente)
                                                                setFormAgente({ 
                                                                    usuario: agente.usuario, 
                                                                    password: '', 
                                                                    nombre: agente.nombre, 
                                                                    rol: agente.rol 
                                                                })
                                                                setMostrarModalAgente(true)
                                                            }} 
                                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                        >
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                        {agente.rol !== 'admin' && agente.id !== agenteActual?.id && (
                                                            <button onClick={() => eliminarAgente(agente)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Agente */}
            {mostrarModalAgente && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                {agenteEditando ? 'Editar Agente' : 'Nuevo Agente'}
                            </h3>
                            <button onClick={() => setMostrarModalAgente(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <XIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <input 
                                type="text" 
                                placeholder="Usuario *" 
                                value={formAgente.usuario} 
                                onChange={(e) => setFormAgente({...formAgente, usuario: e.target.value})} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input 
                                type="password" 
                                placeholder={agenteEditando ? "Nueva contraseña (opcional)" : "Contraseña *"} 
                                value={formAgente.password} 
                                onChange={(e) => setFormAgente({...formAgente, password: e.target.value})} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input 
                                type="text" 
                                placeholder="Nombre *" 
                                value={formAgente.nombre} 
                                onChange={(e) => setFormAgente({...formAgente, nombre: e.target.value})} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <select 
                                value={formAgente.rol} 
                                onChange={(e) => setFormAgente({...formAgente, rol: e.target.value})} 
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="agente">Agente</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                            <button 
                                onClick={() => setMostrarModalAgente(false)} 
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={guardarAgente} 
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
