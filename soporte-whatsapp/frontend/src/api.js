export const API_BASE = import.meta.env.VITE_API_URL || 'http://179.63.191.40:9020';

// Función para obtener el token
export const getToken = () => {
    return localStorage.getItem('token');
};

export const apiFetch = async (endpoint, options = {}) => {
    const token = getToken();
    
    // 🔥 IMPORTANTE: No establecer Content-Type si el body es FormData
    const headers = {
        ...options.headers,
    };
    
    // Solo agregar Content-Type: application/json si NO es FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('No autorizado');
    }
    
    return response;
};
