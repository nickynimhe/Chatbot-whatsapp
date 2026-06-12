import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminAgents from './components/AdminAgents'

function App() {
    const [agenteLogueado, setAgenteLogueado] = useState(null)

    useEffect(() => {
        const agenteGuardado = localStorage.getItem('agente')
        if (agenteGuardado) {
            setAgenteLogueado(JSON.parse(agenteGuardado))
        }
    }, [])

    const cerrarSesion = () => {
        localStorage.removeItem('agente')
        setAgenteLogueado(null)
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login setAgenteLogueado={setAgenteLogueado} />} />
                <Route path="/dashboard" element={
                    agenteLogueado ? 
                        <Dashboard agenteLogueado={agenteLogueado} cerrarSesion={cerrarSesion} /> : 
                        <Navigate to="/login" />
                } />
                <Route path="/admin/agentes" element={
                    agenteLogueado?.rol === 'admin' ? 
                        <AdminAgents agenteActual={agenteLogueado} /> : 
                        <Navigate to="/dashboard" />
                } />
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App