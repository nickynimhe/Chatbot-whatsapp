import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Solucionar problema de iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

// Icono personalizado rojo para ubicaciones
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function LocationMap({ lat, lng, nombre, direccion, isLive = false }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return

    // Crear el mapa si no existe
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([lat, lng], 15)
      
      // Capa de mapa (estilo claro)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3
      }).addTo(mapInstanceRef.current)
    } else {
      mapInstanceRef.current.setView([lat, lng], 15)
    }

    // Eliminar marcador anterior
    if (markerRef.current) {
      markerRef.current.remove()
    }

    // Crear nuevo marcador
    const popupText = isLive 
      ? `<strong>📍 Ubicación en vivo</strong><br/>${nombre || ""} ${direccion || ""}`
      : `<strong>${nombre || "📍 Ubicación"}</strong><br/>${direccion || ""}`
    
    markerRef.current = L.marker([lat, lng], { icon: redIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup(popupText)
      .openPopup()

    return () => {
      if (mapInstanceRef.current && !isLive) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, nombre, direccion, isLive])

  // Actualizar posición si es ubicación en vivo
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && lat && lng && isLive) {
      mapInstanceRef.current.setView([lat, lng], 15)
      markerRef.current.setLatLng([lat, lng])
      markerRef.current.getPopup().setContent(`<strong>📍 Ubicación en vivo (actualizada)</strong>`)
    }
  }, [lat, lng, isLive])

  // Abrir en Google Maps al hacer clic
  const abrirGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`
    window.open(url, "_blank")
  }

  return (
    <div 
      className="relative rounded-xl overflow-hidden mb-2 cursor-pointer shadow-md hover:shadow-lg transition-shadow"
      style={{ width: "280px", height: "200px" }}
      onClick={abrirGoogleMaps}
    >
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      {isLive && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse z-10">
          🔴 EN VIVO
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10 backdrop-blur-sm">
        📍 Ver en Google Maps
      </div>
    </div>
  )
}

export default LocationMap