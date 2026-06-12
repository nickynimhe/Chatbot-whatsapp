import { SparklesIcon } from "./icons"

function WelcomeScreen({ agenteActual, onVerHistorial, onVerPerfil }) {
    // Hora y fecha actual
    const ahora = new Date()
    const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    const fecha = ahora.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
    
    // Saludo según la hora
    const horas = ahora.getHours()
    let saludo = "¡Hola de nuevo!"
    if (horas < 12) saludo = "¡Buenos días!"
    else if (horas < 19) saludo = "¡Buenas tardes!"
    else saludo = "¡Buenas noches!"

    const getEstado = () => {
        switch (agenteActual?.estado) {
            case "disponible": 
                return { label: "Disponible", dot: "#22c55e", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/70" }
            case "ocupado":    
                return { label: "Ocupado", dot: "#ef4444", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/70" }
            default:           
                return { label: "Descanso", dot: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/70" }
        }
    }
    const estado = getEstado()

    const nombrePartes = (agenteActual?.nombre || "Agente").split(" ")
    const nombre = nombrePartes[0] || "Agente"
    const apellido = nombrePartes.slice(1).join(" ") || ""

    return (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-white to-[#FBF8F3]">
            {/* Contenedor más ancho - sin max-w-2xl */}
            <div className="w-full max-w-5xl mx-auto px-6">
                <div className="relative overflow-hidden rounded-3xl border border-[#E5DDD0]/50 bg-white p-8 md:p-10 shadow-glow">
                    {/* Blobs decorativos */}
                    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#F8DFD9] opacity-60 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#DCE0EE] opacity-50 blur-3xl" />

                    <div className="relative flex flex-col items-center text-center">
                        {/* Saludo badge */}
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#E5DDD0]/50 bg-white/60 px-4 py-1.5 text-sm font-medium text-[#7A7567] backdrop-blur-sm shadow-soft">
                            <SparklesIcon className="h-4 w-4 text-[#ED3237]" />
                            {saludo}
                        </div>
                        
                        {/* Nombre */}
                        <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-[#1F2A4D] md:text-5xl">
                            {nombre} <span className="text-[#ED3237]">{apellido}</span>
                        </h1>
                        
                        {/* Estado */}
                        <div className={`mt-5 inline-flex items-center gap-2 rounded-full border ${estado.border} ${estado.bg} px-5 py-2 text-base font-semibold ${estado.text} shadow-soft`}>
                            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: estado.dot }} />
                            {estado.label}
                        </div>

                        {/* Hora y fecha */}
                        <div className="mt-8">
                            <div className="font-display text-5xl font-extrabold tracking-tight text-[#1F2A4D] md:text-6xl">
                                {hora}
                            </div>
                            <div className="mt-2 text-base capitalize text-[#9A937F]">
                                {fecha}
                            </div>
                        </div>

                        {/* Mensaje cuando no hay chats seleccionados */}
                        <div className="mt-8 pt-6 border-t border-[#E5DDD0]/50">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#DCE0EE] to-[#F8DFD9] flex items-center justify-center">
                                <svg className="w-8 h-8 text-[#1F2A4D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className="text-[#1F2A4D] font-medium text-lg">Selecciona un chat</p>
                            <p className="text-[#9A937F] text-sm mt-1">Para comenzar a atender</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WelcomeScreen
