// src/contexts/NotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import socket from '../sockets/socket'
import { playNotificationSound, playNewChatSound, playInternalMessageSound } from '../utils/sounds'

const NotificationContext = createContext()

export const useNotifications = () => useContext(NotificationContext)

export const NotificationProvider = ({ children, agenteActual }) => {
    const [notificaciones, setNotificaciones] = useState([])
    const [noLeidosGlobal, setNoLeidosGlobal] = useState(0)
    const [noLeidosInternos, setNoLeidosInternos] = useState({})
    const [noLeidosClientes, setNoLeidosClientes] = useState({})
    const [sonidoActivo, setSonidoActivo] = useState(() => {
        return localStorage.getItem('sonidoActivo') !== 'false'
    })
    const [contadoresActivos, setContadoresActivos] = useState(() => {
        return localStorage.getItem('contadoresActivos') !== 'false'
    })
    const [pestañaActiva, setPestañaActiva] = useState(true)

    // Detectar si la pestaña está activa (el usuario está viendo el panel)
    useEffect(() => {
        const handleVisibilityChange = () => {
            setPestañaActiva(!document.hidden)
        }
        
        document.addEventListener('visibilitychange', handleVisibilityChange)
        
        // Estado inicial
        setPestañaActiva(!document.hidden)
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    // Guardar preferencia de sonido
    useEffect(() => {
        localStorage.setItem('sonidoActivo', sonidoActivo)
    }, [sonidoActivo])

    // Guardar preferencia de contadores
    useEffect(() => {
        localStorage.setItem('contadoresActivos', contadoresActivos)
    }, [contadoresActivos])

    // Función para eliminar una notificación individual
    const eliminarNotificacion = useCallback((id) => {
        setNotificaciones(prev => prev.filter(n => n.id !== id))
    }, [])

    // Función para marcar un chat como leído y actualizar contador global
    const marcarChatComoLeidoGlobal = useCallback((chatId, tipo = 'interno') => {
        if (tipo === 'interno') {
            setNoLeidosInternos(prev => {
                const nuevo = { ...prev, [chatId]: 0 }
                localStorage.setItem(`noLeidos_internos_${agenteActual?.id}`, JSON.stringify(nuevo))
                return nuevo
            })
        } else {
            setNoLeidosClientes(prev => {
                const nuevo = { ...prev, [chatId]: 0 }
                localStorage.setItem(`noLeidos_clientes_${agenteActual?.id}`, JSON.stringify(nuevo))
                return nuevo
            })
        }
        
        setTimeout(() => {
            setNoLeidosGlobal(prev => {
                const totalInternos = Object.values(noLeidosInternos).reduce((a, b) => a + b, 0)
                const totalClientes = Object.values(noLeidosClientes).reduce((a, b) => a + b, 0)
                return totalInternos + totalClientes
            })
        }, 0)
    }, [agenteActual?.id, noLeidosInternos, noLeidosClientes])

    useEffect(() => {
        if (!agenteActual?.id) return

        // Cargar contadores guardados en localStorage
        const savedInternos = localStorage.getItem(`noLeidos_internos_${agenteActual.id}`)
        if (savedInternos) {
            try {
                const parsed = JSON.parse(savedInternos)
                setNoLeidosInternos(parsed)
            } catch(e) {}
        }

        const savedClientes = localStorage.getItem(`noLeidos_clientes_${agenteActual.id}`)
        if (savedClientes) {
            try {
                const parsed = JSON.parse(savedClientes)
                setNoLeidosClientes(parsed)
            } catch(e) {}
        }

        // Calcular total de no leídos
        const totalInternos = Object.values(noLeidosInternos).reduce((a, b) => a + b, 0)
        const totalClientes = Object.values(noLeidosClientes).reduce((a, b) => a + b, 0)
        setNoLeidosGlobal(totalInternos + totalClientes)

        const handleMensajeInterno = (data) => {
            console.log('📨 [NOTIFICATION] mensaje-interno recibido:', data)
            const esChatActual = window.location.href.includes('interno') && data.chat_interno_id === window.currentChatId
            const esOtroAgente = data.mensaje?.emisor_id !== agenteActual?.id

            if (esOtroAgente) {
                // Solo sonido si la pestaña NO está activa
                if (sonidoActivo && !pestañaActiva) {
                    playInternalMessageSound()
                }

                if (!esChatActual) {
                    setNoLeidosInternos(prev => {
                        const nuevo = {
                            ...prev,
                            [data.chat_interno_id]: (prev[data.chat_interno_id] || 0) + 1
                        }
                        localStorage.setItem(`noLeidos_internos_${agenteActual.id}`, JSON.stringify(nuevo))
                        const total = Object.values(nuevo).reduce((a, b) => a + b, 0) + Object.values(noLeidosClientes).reduce((a, b) => a + b, 0)
                        setNoLeidosGlobal(total)
                        return nuevo
                    })
                }
            }
        }

        const handleNuevoMensajeCliente = (data) => {
            console.log('📨 [NOTIFICATION] nuevo-mensaje-cliente recibido:', data)
            
            // Solo sonido si la pestaña NO está activa
            if (sonidoActivo && !pestañaActiva) {
                playNotificationSound()
            }

            // Incrementar contador de no leídos del cliente
            setNoLeidosClientes(prev => {
                const nuevo = {
                    ...prev,
                    [data.chat_id]: (prev[data.chat_id] || 0) + 1
                }
                localStorage.setItem(`noLeidos_clientes_${agenteActual.id}`, JSON.stringify(nuevo))
                const total = Object.values(noLeidosInternos).reduce((a, b) => a + b, 0) + Object.values(nuevo).reduce((a, b) => a + b, 0)
                setNoLeidosGlobal(total)
                return nuevo
            })
        }

        const handleNuevoChatCreado = (data) => {
            console.log('📨 [NOTIFICATION] nuevo-chat-creado recibido:', data)
            // Solo sonido si la pestaña NO está activa
            if (sonidoActivo && !pestañaActiva) {
                playNewChatSound()
            }
        }

        // Escuchar eventos de socket
        socket.on("mensaje-interno", handleMensajeInterno)
        socket.on("nuevo-mensaje-cliente", handleNuevoMensajeCliente)
        socket.on("nuevo-chat-creado", handleNuevoChatCreado)
        
        return () => {
            socket.off("mensaje-interno", handleMensajeInterno)
            socket.off("nuevo-mensaje-cliente", handleNuevoMensajeCliente)
            socket.off("nuevo-chat-creado", handleNuevoChatCreado)
        }
    }, [agenteActual?.id, sonidoActivo, pestañaActiva])

    const marcarComoLeido = (id, chatId, tipo = 'interno') => {
        if (chatId) {
            marcarChatComoLeidoGlobal(chatId, tipo)
        }
    }

    const marcarChatComoLeido = (chatId, tipo = 'interno') => {
        marcarChatComoLeidoGlobal(chatId, tipo)
    }

    const marcarTodosComoLeidos = () => {
        setNoLeidosInternos({})
        setNoLeidosClientes({})
        setNoLeidosGlobal(0)
        localStorage.setItem(`noLeidos_internos_${agenteActual?.id}`, JSON.stringify({}))
        localStorage.setItem(`noLeidos_clientes_${agenteActual?.id}`, JSON.stringify({}))
    }

    const limpiarNotificaciones = () => {
        setNoLeidosGlobal(0)
        setNoLeidosInternos({})
        setNoLeidosClientes({})
        localStorage.setItem(`noLeidos_internos_${agenteActual?.id}`, JSON.stringify({}))
        localStorage.setItem(`noLeidos_clientes_${agenteActual?.id}`, JSON.stringify({}))
    }

    const getNoLeidosPorChat = (chatId, tipo = 'interno') => {
        if (tipo === 'interno') {
            return noLeidosInternos[chatId] || 0
        }
        return noLeidosClientes[chatId] || 0
    }

    const getTotalNoLeidosClientes = () => {
        return Object.values(noLeidosClientes).reduce((a, b) => a + b, 0)
    }

    const getTotalNoLeidosInternos = () => {
        return Object.values(noLeidosInternos).reduce((a, b) => a + b, 0)
    }

    return (
        <NotificationContext.Provider value={{
            notificaciones,
            noLeidosGlobal,
            noLeidosInternos,
            noLeidosClientes,
            sonidoActivo,
            setSonidoActivo,
            contadoresActivos,
            setContadoresActivos,
            eliminarNotificacion,
            marcarComoLeido,
            marcarChatComoLeido,
            marcarChatComoLeidoGlobal,
            marcarTodosComoLeidos,
            limpiarNotificaciones,
            getNoLeidosPorChat,
            getTotalNoLeidosClientes,
            getTotalNoLeidosInternos
        }}>
            {children}
        </NotificationContext.Provider>
    )
}
