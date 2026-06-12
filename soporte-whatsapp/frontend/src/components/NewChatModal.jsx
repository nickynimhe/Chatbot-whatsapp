import { useState } from "react"
import { XIcon, PhoneIcon, PlusIcon, ChevronDownIcon } from "./icons"

const PAISES = [
  { codigo: "57", nombre: "Colombia 🇨🇴", bandera: "🇨🇴" },
  { codigo: "1", nombre: "Estados Unidos 🇺🇸", bandera: "🇺🇸" },
  { codigo: "52", nombre: "México 🇲🇽", bandera: "🇲🇽" },
  { codigo: "58", nombre: "Venezuela 🇻🇪", bandera: "🇻🇪" },
  { codigo: "55", nombre: "Brasil 🇧🇷", bandera: "🇧🇷" },
  { codigo: "54", nombre: "Argentina 🇦🇷", bandera: "🇦🇷" },
  { codigo: "56", nombre: "Chile 🇨🇱", bandera: "🇨🇱" },
  { codigo: "51", nombre: "Perú 🇵🇪", bandera: "🇵🇪" },
  { codigo: "593", nombre: "Ecuador 🇪🇨", bandera: "🇪🇨" },
  { codigo: "34", nombre: "España 🇪🇸", bandera: "🇪🇸" },
  { codigo: "591", nombre: "Bolivia 🇧🇴", bandera: "🇧🇴" },
  { codigo: "595", nombre: "Paraguay 🇵🇾", bandera: "🇵🇾" },
  { codigo: "598", nombre: "Uruguay 🇺🇾", bandera: "🇺🇾" },
  { codigo: "506", nombre: "Costa Rica 🇨🇷", bandera: "🇨🇷" },
  { codigo: "503", nombre: "El Salvador 🇸🇻", bandera: "🇸🇻" },
  { codigo: "502", nombre: "Guatemala 🇬🇹", bandera: "🇬🇹" },
  { codigo: "504", nombre: "Honduras 🇭🇳", bandera: "🇭🇳" },
  { codigo: "505", nombre: "Nicaragua 🇳🇮", bandera: "🇳🇮" },
  { codigo: "507", nombre: "Panamá 🇵🇦", bandera: "🇵🇦" },
  { codigo: "53", nombre: "Cuba 🇨🇺", bandera: "🇨🇺" },
  { codigo: "1", nombre: "Canadá 🇨🇦", bandera: "🇨🇦" },
  { codigo: "44", nombre: "Reino Unido 🇬🇧", bandera: "🇬🇧" },
  { codigo: "49", nombre: "Alemania 🇩🇪", bandera: "🇩🇪" },
  { codigo: "33", nombre: "Francia 🇫🇷", bandera: "🇫🇷" },
  { codigo: "39", nombre: "Italia 🇮🇹", bandera: "🇮🇹" },
  { codigo: "81", nombre: "Japón 🇯🇵", bandera: "🇯🇵" },
  { codigo: "86", nombre: "China 🇨🇳", bandera: "🇨🇳" },
  { codigo: "91", nombre: "India 🇮🇳", bandera: "🇮🇳" },
]

function NewChatModal({ isOpen, onClose, onCrearChat }) {
  const [paisSeleccionado, setPaisSeleccionado] = useState(PAISES[0])
  const [numero, setNumero] = useState("")
  const [mostrarSelector, setMostrarSelector] = useState(false)
  const [cargando, setCargando] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!numero.trim()) return

    const numeroCompleto = `${paisSeleccionado.codigo}${numero.trim()}`
    setCargando(true)
    
    try {
      await onCrearChat(numeroCompleto)
      onClose()
      setNumero("")
    } catch (error) {
      console.error("Error creando chat:", error)
      alert(`Error al crear la conversación: ${error.message || 'Por favor intenta nuevamente.'}`)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold gradient-text">Nueva conversación</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
          >
            <XIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Selector de país */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              País
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMostrarSelector(!mostrarSelector)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{paisSeleccionado.bandera}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    +{paisSeleccionado.codigo}
                  </span>
                </div>
                <ChevronDownIcon className="w-5 h-5 text-gray-500" />
              </button>

              {/* Dropdown de países */}
              {mostrarSelector && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {PAISES.map((pais) => (
                    <button
                      key={pais.codigo}
                      type="button"
                      onClick={() => {
                        setPaisSeleccionado(pais)
                        setMostrarSelector(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      <span className="text-2xl">{pais.bandera}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {pais.nombre}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{pais.codigo}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input de número */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de teléfono
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                <PhoneIcon className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  +{paisSeleccionado.codigo}
                </span>
              </div>
              <input
                type="tel"
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
                placeholder="300 123 4567"
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D355D] focus:border-transparent transition-all duration-200"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ingresa solo los dígitos del número
            </p>
          </div>

          {/* Botón crear */}
          <button
            type="submit"
            disabled={cargando || !numero.trim()}
            className="w-full py-3 bg-gradient-to-r from-[#2D355D] to-[#ED3237] text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando conversación...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <PlusIcon className="w-5 h-5" />
                Crear conversación
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default NewChatModal
