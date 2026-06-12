import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { 
    XIcon, 
    EditIcon, 
    TrashIcon, 
    PlusIcon,
    ShieldIcon,
    UserIcon
} from "./icons"

function AdminAgents({ agenteActual }) {
    const navigate = useNavigate()
    const [agentes, setAgentes] = useState([])
    const [mostrarModal, setMostrarModal] = useState(false)
    const [editando, setEditando] = useState(null)
    const [configuracion, setConfiguracion] = useState({ 
        mensaje_bienvenida_general: "",
        mensaje_validacion_datos: ""
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [editandoConfig, setEditandoConfig] = useState(null) // 'bienvenida' o 'validacion'
    const [formData, setFormData] = useState({
        usuario: "",
        password: "",
        nombre: "",
        email: "",
        rol: "agente"
    })

    const getToken = () => {
        return localStorage.getItem('token')
    }

    const fetchConAuth = async (url, options = {}) => {
        const token = getToken()
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                "Authorization": token ? `Bearer ${token}` : "",
                "X-Agente-Id": String(agenteActual?.id || "")
            }
        })
        
        if (response.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('agente')
            alert('Sesión expirada. Por favor inicia sesión nuevamente.')
            navigate('/login')
            return null
        }
        
        return response
    }

    const cargarAgentes = async () => {
        try {
            setLoading(true)
            setError(null)
            
            const response = await fetchConAuth("http://192.168.101.36:3000/api/admin/agentes")
            
            if (!response) return
            
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || errorData.error || `Error ${response.status}`)
            }
            
            const data = await response.json()
            
            if (Array.isArray(data)) {
                setAgentes(data)
            } else {
                setAgentes([])
            }
        } catch (err) {
            console.error('Error cargando agentes:', err)
            setError(err.message || 'Error al cargar los agentes')
            setAgentes([])
        } finally {
            setLoading(false)
        }
    }

    const cargarConfiguracion = async () => {
        try {
            const response = await fetchConAuth("http://192.168.101.36:3000/api/admin/configuracion")
            
            if (!response) return
            
            if (response.ok) {
                const data = await response.json()
                setConfiguracion({ 
                    mensaje_bienvenida_general: data.mensaje_bienvenida_general || "",
                    mensaje_validacion_datos: data.mensaje_validacion_datos || ""
                })
            }
        } catch (err) {
            console.error('Error cargando configuración:', err)
        }
    }

    const guardarConfiguracion = async () => {
        try {
            const response = await fetchConAuth("http://192.168.101.36:3000/api/admin/configuracion", {
                method: "PUT",
                body: JSON.stringify({
                    mensaje_bienvenida_general: configuracion.mensaje_bienvenida_general,
                    mensaje_validacion_datos: configuracion.mensaje_validacion_datos
                })
            })
            
            if (response && response.ok) {
                alert("✅ Configuración guardada correctamente")
                setEditandoConfig(null)
            } else if (response?.status === 401) {
                return
            } else {
                throw new Error('Error al guardar')
            }
        } catch (err) {
            alert("❌ Error al guardar configuración")
        }
    }

    const guardarAgente = async () => {
        if (!editando && (!formData.password || !String(formData.password).trim())) {
            alert("La contraseña es obligatoria para un nuevo asesor")
            return
        }

        const url = editando
            ? `http://192.168.101.36:3000/api/admin/agentes/${editando.id}`
            : "http://192.168.101.36:3000/api/admin/agentes"

        const method = editando ? "PUT" : "POST"

        const datosEnviar = { 
            usuario: formData.usuario,
            nombre: formData.nombre,
            email: formData.email,
            rol: formData.rol
        }
        
        if (formData.password && formData.password.trim()) {
            datosEnviar.password = formData.password
        }

        try {
            const response = await fetchConAuth(url, {
                method,
                body: JSON.stringify(datosEnviar)
            })

            if (!response) return

            if (response.ok) {
                await cargarAgentes()
                setMostrarModal(false)
                setEditando(null)
                setFormData({ 
                    usuario: "", 
                    password: "", 
                    nombre: "", 
                    email: "", 
                    rol: "agente"
                })
                alert(editando ? "✅ Agente actualizado" : "✅ Agente creado")
            } else {
                const error = await response.json()
                alert("❌ Error: " + (error.message || error.error))
            }
        } catch (err) {
            console.error('Error guardando agente:', err)
            alert("❌ Error al guardar el agente")
        }
    }

    const eliminarAgente = async (id, nombre) => {
        if (!confirm(`¿Eliminar a ${nombre}?`)) return
        
        try {
            const response = await fetchConAuth(`http://192.168.101.36:3000/api/admin/agentes/${id}`, {
                method: "DELETE"
            })
            
            if (response && response.ok) {
                await cargarAgentes()
                alert("✅ Agente eliminado")
            } else if (response?.status === 401) {
                return
            } else {
                const error = await response.json()
                alert("❌ " + (error.message || error.error))
            }
        } catch (err) {
            console.error('Error eliminando agente:', err)
            alert("❌ Error al eliminar el agente")
        }
    }

    useEffect(() => {
        const token = getToken()
        if (!token) {
            navigate('/login')
            return
        }
        
        cargarAgentes()
        cargarConfiguracion()
    }, [])

    if (agenteActual?.rol !== "admin") {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-destructive/10 text-destructive px-6 py-4 rounded-xl text-center">
                    ⚠️ No tienes permiso para ver esta página
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Cargando agentes...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-destructive/10 text-destructive px-6 py-4 rounded-xl text-center max-w-md">
                    <p className="font-semibold mb-2">❌ Error</p>
                    <p className="text-sm mb-4">{error}</p>
                    <button 
                        onClick={() => cargarAgentes()} 
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-all"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        )
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

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
                <Link to="/dashboard" className="text-primary hover:text-primary/80 text-sm transition-colors">
                    ← Volver al panel
                </Link>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Gestión de Agentes</h2>
                    <p className="text-sm text-muted-foreground">Administra los asesores de tu equipo</p>
                </div>
                <button 
                    onClick={() => {
                        setEditando(null)
                        setFormData({ 
                            usuario: "", 
                            password: "", 
                            nombre: "", 
                            email: "", 
                            rol: "agente"
                        })
                        setMostrarModal(true)
                    }} 
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    Nuevo Agente
                </button>
            </div>

            {/* Configuración de Mensajes */}
            <div className="space-y-6 mb-6">
                {/* Mensaje de Bienvenida General */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <span>💬</span> Mensaje de Bienvenida General
                        </h3>
                        {editandoConfig !== 'bienvenida' && (
                            <button 
                                onClick={() => setEditandoConfig('bienvenida')}
                                className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
                            >
                                <EditIcon className="w-3 h-3" />
                                Editar
                            </button>
                        )}
                    </div>
                    
                    {editandoConfig === 'bienvenida' ? (
                        <>
                            <textarea
                                value={configuracion.mensaje_bienvenida_general}
                                onChange={(e) => setConfiguracion({ 
                                    ...configuracion, 
                                    mensaje_bienvenida_general: e.target.value 
                                })}
                                rows="4"
                                className="w-full p-3 bg-secondary border-0 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                placeholder="Mensaje de bienvenida general..."
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                💡 Usa [NOMBRE_AGENTE] para insertar el nombre del agente automáticamente
                            </p>
                            <div className="flex gap-2 mt-3">
                                <button 
                                    onClick={guardarConfiguracion}
                                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:opacity-90"
                                >
                                    Guardar
                                </button>
                                <button 
                                    onClick={() => setEditandoConfig(null)}
                                    className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-secondary/80"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="bg-secondary/50 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap">
                            {configuracion.mensaje_bienvenida_general || 'No configurado'}
                        </div>
                    )}
                </div>

                {/* Mensaje de Validación de Datos - EDITABLE */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <span>🔐</span> Mensaje de Validación de Datos Personales
                        </h3>
                        {editandoConfig !== 'validacion' && (
                            <button 
                                onClick={() => setEditandoConfig('validacion')}
                                className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
                            >
                                <EditIcon className="w-3 h-3" />
                                Editar
                            </button>
                        )}
                    </div>
                    
                    {editandoConfig === 'validacion' ? (
                        <>
                            <textarea
                                value={configuracion.mensaje_validacion_datos}
                                onChange={(e) => setConfiguracion({ 
                                    ...configuracion, 
                                    mensaje_validacion_datos: e.target.value 
                                })}
                                rows="12"
                                className="w-full p-3 bg-secondary border-0 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                placeholder="Mensaje de validación de datos..."
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                💡 Este mensaje se enviará automáticamente cuando el cliente necesite validar sus datos personales (opción 9 del menú)
                            </p>
                            <div className="flex gap-2 mt-3">
                                <button 
                                    onClick={guardarConfiguracion}
                                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:opacity-90"
                                >
                                    Guardar
                                </button>
                                <button 
                                    onClick={() => setEditandoConfig(null)}
                                    className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-secondary/80"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="bg-secondary/50 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {configuracion.mensaje_validacion_datos || 'No configurado'}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabla de agentes */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {agentes && agentes.length > 0 ? (
                                agentes.map((agente) => (
                                    <tr key={agente.id} className="hover:bg-secondary/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-foreground font-medium">{agente.usuario}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                                                    <span className="text-xs font-medium text-primary">
                                                        {getInitials(agente.nombre)}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-foreground">{agente.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">{agente.email || "-"}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                agente.rol === "admin" 
                                                    ? "bg-destructive/10 text-destructive" 
                                                    : "bg-primary/10 text-primary"
                                            }`}>
                                                {agente.rol === "admin" ? <ShieldIcon className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                                {agente.rol === "admin" ? "Admin" : "Agente"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                agente.estado === "disponible" 
                                                    ? "bg-green-500/10 text-green-600"
                                                    : agente.estado === "ocupado" 
                                                    ? "bg-yellow-500/10 text-yellow-600"
                                                    : "bg-gray-500/10 text-gray-600"
                                            }`}>
                                                {agente.estado === "disponible" && "🟢"}
                                                {agente.estado === "ocupado" && "🔴"}
                                                {agente.estado === "descanso" && "🟡"}
                                                {" "}{agente.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button 
                                                onClick={() => { 
                                                    setEditando(agente)
                                                    setFormData({ 
                                                        usuario: agente.usuario,
                                                        password: "", 
                                                        nombre: agente.nombre, 
                                                        email: agente.email || "", 
                                                        rol: agente.rol
                                                    })
                                                    setMostrarModal(true) 
                                                }} 
                                                className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                                            >
                                                <EditIcon className="w-4 h-4" />
                                                Editar
                                            </button>
                                            <button 
                                                onClick={() => eliminarAgente(agente.id, agente.nombre)} 
                                                className="text-destructive hover:text-destructive/80 transition-colors inline-flex items-center gap-1"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">
                                        No hay agentes registrados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de creación/edición */}
            {mostrarModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card rounded-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto border border-border shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-foreground">
                                {editando ? "Editar Agente" : "Nuevo Agente"}
                            </h3>
                            <button 
                                onClick={() => { 
                                    setMostrarModal(false)
                                    setEditando(null)
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Usuario *</label>
                                <input 
                                    type="text" 
                                    placeholder="Usuario" 
                                    value={formData.usuario} 
                                    onChange={e => setFormData({...formData, usuario: e.target.value})} 
                                    className="w-full p-2 bg-secondary border-0 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    {editando ? "Nueva contraseña (opcional)" : "Contraseña *"}
                                </label>
                                <input 
                                    type="password" 
                                    placeholder={editando ? "Dejar en blanco para mantener" : "Contraseña"} 
                                    value={formData.password || ""} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    className="w-full p-2 bg-secondary border-0 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre completo *</label>
                                <input 
                                    type="text" 
                                    placeholder="Nombre completo" 
                                    value={formData.nombre} 
                                    onChange={e => setFormData({...formData, nombre: e.target.value})} 
                                    className="w-full p-2 bg-secondary border-0 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                                <input 
                                    type="email" 
                                    placeholder="Email" 
                                    value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})} 
                                    className="w-full p-2 bg-secondary border-0 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Rol</label>
                                <select 
                                    value={formData.rol} 
                                    onChange={e => setFormData({...formData, rol: e.target.value})} 
                                    className="w-full p-2 bg-secondary border-0 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="agente">Agente</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                            <button 
                                onClick={() => { 
                                    setMostrarModal(false)
                                    setEditando(null)
                                }} 
                                className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={guardarAgente} 
                                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
                            >
                                {editando ? "Actualizar" : "Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminAgents