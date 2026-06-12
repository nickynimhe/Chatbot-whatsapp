import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/icons'

function Login({ setAgenteLogueado }) {
    const [usuario, setUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [cargando, setCargando] = useState(false)
    const [mounted, setMounted] = useState(false)

    const navigate = useNavigate()

    useEffect(() => { setMounted(true) }, [])

    const handleLogin = async (e) => {
        e.preventDefault()
        setCargando(true)
        setError('')
        try {
            const response = await apiFetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            })
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json'))
                throw new Error('El servidor no respondió con JSON')
            const data = await response.json()
            if (response.ok && data.success) {
                localStorage.setItem('agente', JSON.stringify(data.agente))
                if (data.token) localStorage.setItem('token', data.token)
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true')
                    localStorage.setItem('savedUsuario', usuario)
                }
                setAgenteLogueado(data.agente)
                navigate('/dashboard')
            } else {
                setError(data.error || 'Usuario o contraseña incorrectos')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setCargando(false)
        }
    }

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }

                .login-root {
                    min-height: 100vh;
                    display: flex;
                    font-family: 'DM Sans', sans-serif;
                    position: relative;
                    overflow: hidden;
                }

                /* ============================================ */
                /* FONDO CON DEGRADADO ROJO QUE SE DIFUMINA */
                /* ============================================ */
                .dark-bg {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at 30% 40%, 
                        #ED3237 0%,
                        #8B1A1A 25%,
                        #1a0a0a 50%,
                        #0a0a0f 80%,
                        #050508 100%
                    );
                    z-index: 0;
                }

                /* MANCHAS ROJAS QUE FLOTAN Y SE DIFUMINAN */
                .blur-red {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(90px);
                    background: #ED3237;
                    animation: floatRed 14s infinite alternate ease-in-out;
                    z-index: 1;
                }
                .blur-red-1 {
                    width: 550px;
                    height: 550px;
                    top: -150px;
                    left: -100px;
                    opacity: 0.35;
                    animation-duration: 12s;
                }
                .blur-red-2 {
                    width: 450px;
                    height: 450px;
                    bottom: -100px;
                    left: 20%;
                    opacity: 0.25;
                    animation-duration: 15s;
                    animation-delay: 2s;
                }
                .blur-red-3 {
                    width: 380px;
                    height: 380px;
                    top: 40%;
                    right: 5%;
                    opacity: 0.2;
                    animation-duration: 18s;
                    animation-delay: 5s;
                }
                @keyframes floatRed {
                    0% {
                        transform: translate(0, 0) scale(1);
                    }
                    50% {
                        transform: translate(60px, -40px) scale(1.15);
                    }
                    100% {
                        transform: translate(-30px, 50px) scale(0.95);
                    }
                }

                /* ONDAS DE RADIO ROJAS SUTILES */
                .radio-pulse {
                    position: absolute;
                    top: 20%;
                    left: 8%;
                    z-index: 1;
                }
                .pulse-ring {
                    position: absolute;
                    border: 1px solid rgba(237, 50, 55, 0.3);
                    border-radius: 50%;
                    animation: pulseExpand 4s ease-out infinite;
                }
                .pulse-ring:nth-child(1) { width: 30px; height: 30px; animation-delay: 0s; }
                .pulse-ring:nth-child(2) { width: 30px; height: 30px; animation-delay: 1.3s; }
                .pulse-ring:nth-child(3) { width: 30px; height: 30px; animation-delay: 2.6s; }
                @keyframes pulseExpand {
                    0% {
                        width: 20px;
                        height: 20px;
                        opacity: 0.5;
                    }
                    100% {
                        width: 140px;
                        height: 140px;
                        opacity: 0;
                    }
                }

                /* PARTÍCULAS ROJAS (datos) */
                .red-particles {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    pointer-events: none;
                }
                .r-particle {
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    background: #ED3237;
                    border-radius: 50%;
                    opacity: 0;
                    animation: floatParticle 10s linear infinite;
                }
                .r-particle:nth-child(1) { top: 15%; left: 20%; animation-delay: 0s; }
                .r-particle:nth-child(2) { top: 35%; left: 75%; animation-delay: 1.5s; }
                .r-particle:nth-child(3) { top: 60%; left: 10%; animation-delay: 3s; }
                .r-particle:nth-child(4) { top: 80%; left: 60%; animation-delay: 4.5s; }
                .r-particle:nth-child(5) { top: 25%; left: 45%; animation-delay: 6s; }
                .r-particle:nth-child(6) { top: 70%; left: 85%; animation-delay: 7.5s; }
                @keyframes floatParticle {
                    0% {
                        transform: translateY(0) translateX(0);
                        opacity: 0;
                    }
                    20% {
                        opacity: 0.7;
                    }
                    80% {
                        opacity: 0.4;
                    }
                    100% {
                        transform: translateY(-180px) translateX(60px);
                        opacity: 0;
                    }
                }

                /* GRID TENUE */
                .tech-grid {
                    position: absolute;
                    inset: 0;
                    background-image: linear-gradient(rgba(237,50,55,0.04) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(237,50,55,0.03) 1px, transparent 1px);
                    background-size: 45px 45px;
                    z-index: 2;
                    pointer-events: none;
                }

                /* PANEL IZQUIERDO */
                .left-panel {
                    flex: 0 0 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 2.5rem;
                    position: relative;
                    z-index: 10;
                }

                /* FORMULARIO CON BORDE ROJO DIFUMINADO */
                .form-card {
                    width: 100%;
                    max-width: 520px;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.6s ease, transform 0.6s ease;
                    background: rgba(248, 250, 255, 0.96);
                    backdrop-filter: blur(20px);
                    border-radius: 48px;
                    padding: 2.5rem 2.5rem 2.5rem 2.5rem;
                    border: 1px solid rgba(237, 50, 55, 0.35);
                    box-shadow: 
                        0 25px 45px -15px rgba(0, 0, 0, 0.2),
                        0 0 30px rgba(237, 50, 55, 0.1);
                }
                .form-card.visible { opacity: 1; transform: translateY(0); }
                .form-card:hover {
                    border-color: rgba(237, 50, 55, 0.6);
                    box-shadow: 
                        0 30px 50px -15px rgba(0, 0, 0, 0.25),
                        0 0 40px rgba(237, 50, 55, 0.2);
                    transform: translateY(-2px);
                    transition: all 0.25s ease;
                }

                .login-title {
                    font-family: 'Syne', sans-serif;
                    font-size: 2.6rem;
                    font-weight: 800;
                    color: #1a1e2c;
                    letter-spacing: -0.03em;
                    line-height: 1.2;
                    margin-bottom: 0.5rem;
                }
                .login-title span { color: #ED3237; }
                .login-subtitle {
                    font-size: 0.95rem;
                    color: #5a6075;
                    font-weight: 500;
                    margin-bottom: 2rem;
                }

                .divider { display: flex; align-items: center; gap: 12px; margin-bottom: 1.8rem; }
                .divider-line { flex: 1; height: 1px; background: rgba(0,0,0,0.08); }
                .divider-text { 
                    font-size: 0.7rem; 
                    color: #8a90a8; 
                    letter-spacing: 0.12em; 
                    text-transform: uppercase; 
                    font-weight: 600;
                    white-space: nowrap; 
                }

                .field-wrap { position: relative; margin-bottom: 1.4rem; }
                .field-label { 
                    display: block; 
                    font-size: 0.7rem; 
                    font-weight: 700; 
                    color: #4a4f69; 
                    letter-spacing: 0.08em; 
                    text-transform: uppercase; 
                    margin-bottom: 8px; 
                }
                .field-inner { position: relative; }
                .field-icon { 
                    position: absolute; 
                    left: 16px; 
                    top: 50%; 
                    transform: translateY(-50%); 
                    width: 18px; 
                    height: 18px; 
                    opacity: 0.4; 
                    pointer-events: none; 
                    color: #4a4f69;
                }
                .field-inner:focus-within .field-icon { opacity: 0.8; color: #ED3237; }
                .field-input {
                    width: 100%;
                    padding: 14px 18px 14px 48px;
                    background: #ffffff;
                    border: 1.5px solid #e2e6f0;
                    border-radius: 20px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 1rem;
                    font-weight: 500;
                    color: #1a1e2c;
                    outline: none;
                    transition: all 0.2s;
                }
                .field-input::placeholder { color: #b0b5c8; font-size: 0.9rem; font-weight: 400; }
                .field-input:focus { 
                    border-color: #ED3237; 
                    box-shadow: 0 0 0 3px rgba(237, 50, 55, 0.1);
                }
                .eye-btn { 
                    position: absolute; 
                    right: 16px; 
                    top: 50%; 
                    transform: translateY(-50%); 
                    background: none; 
                    border: none; 
                    cursor: pointer; 
                    color: #9aa0b5; 
                    padding: 6px; 
                    display: flex; 
                    align-items: center; 
                    border-radius: 12px;
                }
                .eye-btn:hover { color: #ED3237; background: rgba(237,50,55,0.05); }
                .eye-btn svg { width: 18px; height: 18px; }

                .error-box { 
                    display: flex; 
                    align-items: center; 
                    gap: 10px; 
                    background: rgba(237,50,55,0.1); 
                    border: 1px solid rgba(237,50,55,0.4); 
                    border-radius: 18px; 
                    padding: 12px 16px; 
                    font-size: 0.8rem; 
                    font-weight: 500;
                    color: #c62a2f; 
                    margin-bottom: 1.2rem; 
                    animation: shake 0.4s ease; 
                }
                @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 60%{transform:translateX(4px)} }

                .bottom-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.8rem; font-size: 0.8rem; }
                .remember-label { display: flex; align-items: center; gap: 10px; color: #5a6075; cursor: pointer; font-weight: 500; }
                .remember-label:hover { color: #ED3237; }
                .remember-check { width: 16px; height: 16px; border-radius: 4px; accent-color: #ED3237; cursor: pointer; }
                .forgot-btn { 
                    background: none; 
                    border: none; 
                    cursor: pointer; 
                    color: #8a90a8; 
                    font-family: 'DM Sans', sans-serif; 
                    font-size: 0.8rem; 
                    font-weight: 500;
                    padding: 6px 10px;
                    border-radius: 12px;
                }
                .forgot-btn:hover { color: #ED3237; background: rgba(237,50,55,0.05); }

                .submit-btn {
                    width: 100%;
                    padding: 16px;
                    border-radius: 24px;
                    border: none;
                    background: linear-gradient(135deg, #ED3237, #c4282c);
                    color: #fff;
                    font-family: 'Syne', sans-serif;
                    font-size: 1rem;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                }
                .submit-btn:hover:not(:disabled) { 
                    opacity: 0.92; 
                    transform: translateY(-3px);
                    box-shadow: 0 12px 28px rgba(237,50,55,0.3);
                }
                .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .loading-dots { display: flex; gap: 6px; }
                .loading-dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.9); animation: bounce 1.2s ease-in-out infinite; }
                .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
                .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }

                .login-footer { 
                    margin-top: 2rem; 
                    text-align: center; 
                    font-size: 0.7rem; 
                    color: #9aa0b5; 
                    font-weight: 500;
                    letter-spacing: 0.02em; 
                }

                /* ============================================ */
                /* PANEL DERECHO - BLANCO CON DETALLES ROJOS */
                /* ============================================ */
                .right-panel {
                    display: none;
                    flex: 1;
                    background: linear-gradient(145deg, #ffffff 0%, #f8f9fc 100%);
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    position: relative;
                    z-index: 10;
                    overflow: hidden;
                }
                .right-panel::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(circle, rgba(237,50,55,0.04) 1px, transparent 1px);
                    background-size: 30px 30px;
                    pointer-events: none;
                }
                /* Toque rojo en la esquina del panel blanco */
                .right-panel::after {
                    content: '';
                    position: absolute;
                    bottom: -50px;
                    right: -50px;
                    width: 250px;
                    height: 250px;
                    background: radial-gradient(circle, rgba(237,50,55,0.08), transparent);
                    border-radius: 50%;
                    pointer-events: none;
                }
                @media (min-width: 1024px) { .right-panel { display: flex; } }

                .right-content {
                    text-align: center;
                    max-width: 520px;
                    position: relative;
                    z-index: 3;
                    opacity: 0;
                    transform: translateX(20px);
                    transition: opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .right-content.visible { opacity: 1; transform: translateX(0); }

                .logo-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 20px;
                    background: #ffffff;
                    border: 1px solid rgba(237,50,55,0.2);
                    border-radius: 80px;
                    padding: 12px 32px 12px 12px;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
                    margin-bottom: 35px;
                    transition: all 0.3s ease;
                }
                .logo-pill:hover {
                    transform: translateY(-3px);
                    border-color: rgba(237,50,55,0.4);
                    box-shadow: 0 12px 25px rgba(237,50,55,0.1);
                }
                .logo-pill-img {
                    width: 70px;
                    height: 70px;
                    object-fit: contain;
                    border-radius: 50%;
                    border: 2px solid #fff;
                }
                .logo-pill-text {
                    font-family: 'Syne', sans-serif;
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #2D355D;
                    letter-spacing: 0.02em;
                }
                .logo-pill-text span {
                    color: #ED3237;
                    font-size: 1.8rem;
                }

                .mascot-wrap { 
                    position: relative; 
                    display: inline-block; 
                    margin-bottom: 2rem;
                }
                .mascot-ring { 
                    position: absolute; 
                    inset: -40px; 
                    border-radius: 50%; 
                    border: 2px dashed rgba(237,50,55,0.3); 
                    animation: spin 20s linear infinite; 
                }
                .mascot-ring::before { 
                    content: ''; 
                    position: absolute; 
                    top: -10px; 
                    left: 50%; 
                    width: 14px; 
                    height: 14px; 
                    border-radius: 50%; 
                    background: #ED3237; 
                    transform: translateX(-50%);
                    box-shadow: 0 0 6px rgba(237,50,55,0.6);
                }
                .mascot-ring::after { 
                    content: ''; 
                    position: absolute; 
                    bottom: -10px; 
                    left: 50%; 
                    width: 10px; 
                    height: 10px; 
                    border-radius: 50%; 
                    background: #ED3237; 
                    transform: translateX(-50%);
                    opacity: 0.6;
                }
                .mascot-ring-outer { 
                    position: absolute; 
                    inset: -70px; 
                    border-radius: 50%; 
                    border: 1px solid rgba(237,50,55,0.1); 
                    animation: spin 30s linear infinite reverse; 
                }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .mascot-circle {
                    width: 380px;
                    height: 380px;
                    border-radius: 50%;
                    background: linear-gradient(145deg, #ffffff, #f5f7fd);
                    border: 2px solid rgba(237,50,55,0.1);
                    box-shadow: 0 25px 45px rgba(0,0,0,0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    z-index: 2;
                    overflow: hidden;
                    animation: bob 4s ease-in-out infinite;
                }
                .mascot-img {
                    width: 580px;
                    height: 580px;
                    object-fit: contain;
                    position: relative;
                    z-index: 3;
                }
                @keyframes bob { 
                    0%,100%{transform:translateY(0)} 
                    50%{transform:translateY(-12px)} 
                }

                .mascot-shadow { 
                    position: absolute; 
                    bottom: -25px; 
                    left: 50%; 
                    transform: translateX(-50%); 
                    width: 260px; 
                    height: 30px; 
                    background: radial-gradient(ellipse, rgba(237,50,55,0.15) 0%, transparent 70%); 
                    border-radius: 50%; 
                    animation: glow-pulse 4s ease-in-out infinite; 
                }
                @keyframes glow-pulse { 
                    0%,100%{opacity:0.4;transform:translateX(-50%) scaleX(1)} 
                    50%{opacity:0.8;transform:translateX(-50%) scaleX(1.15)} 
                }

                .right-tagline { 
                    font-family: 'Syne', sans-serif; 
                    font-size: 1.8rem; 
                    font-weight: 800; 
                    color: #1a1e30; 
                    letter-spacing: -0.03em; 
                    line-height: 1.3; 
                    margin-top: 0.5rem; 
                }
                .right-tagline span { 
                    color: #ED3237;
                    text-shadow: 0 0 8px rgba(237,50,55,0.2);
                }
                .right-sub { 
                    font-size: 0.9rem; 
                    color: rgba(45,53,93,0.5); 
                    margin-top: 0.8rem;
                }
            `}</style>

            <div className="login-root">
                {/* FONDO CON DEGRADADO ROJO */}
                <div className="dark-bg"></div>
                
                {/* MANCHAS ROJAS DIFUMINADAS */}
                <div className="blur-red blur-red-1"></div>
                <div className="blur-red blur-red-2"></div>
                <div className="blur-red blur-red-3"></div>

                {/* ONDAS DE RADIO ROJAS */}
                <div className="radio-pulse">
                    <div className="pulse-ring"></div>
                    <div className="pulse-ring"></div>
                    <div className="pulse-ring"></div>
                </div>

                {/* PARTÍCULAS ROJAS */}
                <div className="red-particles">
                    <div className="r-particle"></div>
                    <div className="r-particle"></div>
                    <div className="r-particle"></div>
                    <div className="r-particle"></div>
                    <div className="r-particle"></div>
                    <div className="r-particle"></div>
                </div>

                {/* GRID TENUE */}
                <div className="tech-grid"></div>

                {/* PANEL IZQUIERDO */}
                <div className="left-panel">
                    <div className={`form-card ${mounted ? 'visible' : ''}`}>
                        <h1 className="login-title">Sistema de<br /><span>Soporte</span></h1>
                        <p className="login-subtitle">Panel de atención multiagente</p>
                        <div className="divider">
                            <div className="divider-line" />
                            <span className="divider-text">Ingresa tus credenciales</span>
                            <div className="divider-line" />
                        </div>
                        <form onSubmit={handleLogin}>
                            <div className="field-wrap">
                                <label className="field-label">Usuario</label>
                                <div className="field-inner">
                                    <UserIcon className="field-icon" />
                                    <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="Tu usuario" required className="field-input" />
                                </div>
                            </div>
                            <div className="field-wrap">
                                <label className="field-label">Contraseña</label>
                                <div className="field-inner">
                                    <LockIcon className="field-icon" />
                                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="field-input" style={{ paddingRight: '48px' }} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            {error && (
                                <div className="error-box">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16.5" r=".5" fill="currentColor"/></svg>
                                    {error}
                                </div>
                            )}
                            <div className="bottom-row">
                                <label className="remember-label">
                                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="remember-check" />
                                    Recordar sesión
                                </label>
                                <button type="button" className="forgot-btn">¿Olvidaste tu contraseña?</button>
                            </div>
                            <button type="submit" disabled={cargando} className="submit-btn">
                                {cargando
                                    ? <div className="loading-dots"><span /><span /><span /></div>
                                    : <><span>Ingresar</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                                }
                            </button>
                        </form>
                        <p className="login-footer">© M@STV Producciones S.A.S — Todos los derechos reservados</p>
                    </div>
                </div>

                {/* PANEL DERECHO - BLANCO CON TOQUES ROJOS */}
                <div className="right-panel">
                    <div className={`right-content ${mounted ? 'visible' : ''}`}>
                        <div className="logo-pill">
                            <img src="/logo.jpg" alt="Logo" className="logo-pill-img" />
                            <span className="logo-pill-text">M<span>@</span>s Ayuda</span>
                        </div>
                        
                        <div className="mascot-wrap">
                            <div className="mascot-ring-outer" />
                            <div className="mascot-ring" />
                            <div className="mascot-circle">
                                <img src="/videos/perrito.gif" alt="Mascota M@STV" className="mascot-img" />
                            </div>
                            <div className="mascot-shadow" />
                        </div>
                        <h2 className="right-tagline">M@s <span>conectados</span>,<br />mejor servicio</h2>
                        <p className="right-sub">Atención multiagente 24/7</p>
                    </div>
                </div>

            </div>
        </>
    )
}

export default Login
