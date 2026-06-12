// src/utils/sounds.js
let audio = null;

export const initAudio = () => {
    if (typeof window === 'undefined') return;
    if (!audio) {
        audio = new Audio('/sounds/mixkit-long-pop-2358.wav');
        audio.volume = 0.3;
        audio.preload = 'auto';
        console.log('🔊 Audio inicializado');
    }
};

export const playNotificationSound = () => {
    try {
        const sonidoActivo = localStorage.getItem('sonidoActivo') !== 'false';
        if (!sonidoActivo) {
            return;
        }
        
        if (!audio) {
            initAudio();
        }
        
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio error:', e));
            console.log('🔊 Reproduciendo sonido');
        }
    } catch (error) {
        console.log('Audio error:', error);
    }
};

// Sonido para nuevos chats (volumen más alto)
export const playNewChatSound = () => {
    try {
        const sonidoActivo = localStorage.getItem('sonidoActivo') !== 'false';
        if (!sonidoActivo) {
            return;
        }
        
        if (!audio) {
            initAudio();
        }
        
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio error:', e));
            console.log('🔊 Nuevo chat - sonido');
            // Restaurar volumen original después
            setTimeout(() => {
                audio.volume = 0.3;
            }, 500);
        }
    } catch (error) {
        console.log('Audio error:', error);
    }
};

// Sonido para mensajes internos (volumen más bajo)
export const playInternalMessageSound = () => {
    try {
        const sonidoActivo = localStorage.getItem('sonidoActivo') !== 'false';
        if (!sonidoActivo) {
            return;
        }
        
        if (!audio) {
            initAudio();
        }
        
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.2;
            audio.play().catch(e => console.log('Audio error:', e));
            console.log('🔊 Mensaje interno - sonido');
            // Restaurar volumen original después
            setTimeout(() => {
                audio.volume = 0.3;
            }, 500);
        }
    } catch (error) {
        console.log('Audio error:', error);
    }
};

// Sonido para cuando el agente envía un mensaje (feedback)
export const playSendMessageSound = () => {
    try {
        const sonidoActivo = localStorage.getItem('sonidoActivo') !== 'false';
        if (!sonidoActivo) {
            return;
        }
        
        if (!audio) {
            initAudio();
        }
        
        if (audio) {
            audio.currentTime = 0;
            audio.volume = 0.15;
            audio.play().catch(e => console.log('Audio error:', e));
            setTimeout(() => {
                audio.volume = 0.3;
            }, 500);
        }
    } catch (error) {
        console.log('Audio error:', error);
    }
};

// Probar sonido (útil para pruebas)
export const testSound = () => {
    playNotificationSound();
};

// Inicializar al cargar la página
if (typeof window !== 'undefined') {
    initAudio();
    
    document.addEventListener('click', () => {
        if (audio && audio.paused) {
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
            }).catch(e => console.log('Audio init click:', e));
        }
    }, { once: true });
}