import { useState } from "react"
import { SearchIcon, PlusIcon, CheckCheckIcon, MessageCircleIcon, AlertCircleIcon } from "./icons"

function ChatList({ chats, selectedChat, seleccionarChat, onNuevaConversacion, busqueda, onBusquedaChange }) {
    const [filtroActivo, setFiltroActivo] = useState("todos")
    
    const limpiarMensaje = (texto) => {
        if (!texto) return "Sin mensajes"
        if (texto.length > 100 && /[A-Za-z0-9+/=]{50,}/.test(texto)) return "📎 Imagen adjunta"
        return texto.length > 45 ? texto.substring(0, 45) + "..." : texto
    }

    const getStatusDot = (estado) => {
        switch (estado) {
            case "abierto": return "bg-emerald-500"
            case "cerrado": return "bg-gray-400"
            default: return "bg-amber-500"
        }
    }

    const totalNoLeidos = chats?.reduce((acc, chat) => acc + (chat.no_leidos || 0), 0) || 0
    
    // Solo dos filtros
    const filtrosRapidos = [
        { id: "todos", label: "Todos", icon: MessageCircleIcon },
        { id: "no-leidos", label: "No leídos", icon: AlertCircleIcon },
    ]
    
    const chatsFiltrados = chats?.filter(chat => {
        if (selectedChat && chat.id === selectedChat.id) return true
        
        if (filtroActivo === "no-leidos") return chat.no_leidos > 0
        return true
    }).filter(chat => {
        if (!busqueda) return true
        const nombre = (chat.cliente_nombre || chat.nombre || "").toLowerCase()
        const numero = (chat.cliente_numero || "").toLowerCase()
        return nombre.includes(busqueda.toLowerCase()) || numero.includes(busqueda.toLowerCase())
    }) || []

    if (!chats || chats.length === 0) {
        return (
            <div className="flex flex-col h-full bg-white">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Conversaciones</h2>
                            <p className="text-xs text-gray-400">0 chats activos</p>
                        </div>
                        <button 
                            onClick={onNuevaConversacion}
                            className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#2D355D] to-[#ED3237] text-white shadow-md hover:shadow-lg transition-all"
                        >
                            <PlusIcon className="w-4 h-4 mx-auto" />
                        </button>
                    </div>
                    
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o número..."
                            value={busqueda || ""}
                            onChange={(e) => onBusquedaChange?.(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ED3237]/50"
                        />
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <SearchIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm text-center">
                        {busqueda ? "No se encontraron resultados" : "No hay conversaciones activas"}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Conversaciones</h2>
                        <p className="text-xs text-gray-400">{totalNoLeidos} sin leer · {chats.length} chats</p>
                    </div>
                    <button 
                        onClick={onNuevaConversacion}
                        className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#2D355D] to-[#ED3237] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <PlusIcon className="w-4 h-4 mx-auto" />
                    </button>
                </div>
                
                {/* Search */}
                <div className="relative mb-3">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o número..."
                        value={busqueda || ""}
                        onChange={(e) => onBusquedaChange?.(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ED3237]/50 focus:border-transparent"
                    />
                </div>
                
                {/* Filtros - solo dos opciones */}
                <div className="flex items-center gap-2">
                    {filtrosRapidos.map((filtro) => {
                        const Icon = filtro.icon
                        const isActive = filtroActivo === filtro.id
                        return (
                            <button
                                key={filtro.id}
                                onClick={() => setFiltroActivo(filtro.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                    isActive
                                        ? "bg-[#ED3237] text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{filtro.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto">
                {chatsFiltrados.map((chat) => {
                    const isSelected = selectedChat?.id === chat.id
                    const hasUnread = chat.no_leidos > 0
                    const nombre = chat.cliente_nombre || chat.nombre || "?"
                    
                    return (
                        <div
                            key={chat.id}
                            onClick={() => seleccionarChat(chat)}
                            className={`px-4 py-3 cursor-pointer transition-all duration-200 border-b border-gray-50 ${
                                isSelected 
                                    ? "bg-gradient-to-r from-[#ED3237]/5 to-[#2D355D]/5 border-l-4 border-l-[#ED3237]" 
                                    : "hover:bg-gray-50"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-sm ${
                                        chat.estado === "abierto" 
                                            ? "bg-gradient-to-br from-[#2D355D] to-[#ED3237]" 
                                            : "bg-gray-400"
                                    }`}>
                                        {nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusDot(chat.estado)}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`font-semibold text-sm ${hasUnread ? "text-gray-900" : "text-gray-700"}`}>
                                                {nombre}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] flex-shrink-0 ${hasUnread ? "text-[#ED3237] font-medium" : "text-gray-400"}`}>
                                            {chat.hora || ""}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5">
                                        {chat.no_leidos === 0 && chat.ultimo_mensaje && (
                                            <CheckCheckIcon className="w-3 h-3 text-blue-500" />
                                        )}
                                        <p className={`text-xs truncate flex-1 ${hasUnread ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                                            {limpiarMensaje(chat.ultimo_mensaje)}
                                        </p>
                                        {hasUnread && (
                                            <span className="bg-[#ED3237] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                {chat.no_leidos > 99 ? "99+" : chat.no_leidos}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default ChatList
