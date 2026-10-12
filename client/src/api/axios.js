import axios from 'axios';
import useAuthStore from '../store/authStore';

// En desarrollo VITE_API_URL queda vacío y Vite redirige /api al backend local (vite.config.js).
// En producción (Render) es la URL pública del backend, p. ej. https://polleria-api.onrender.com
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

/** URL absoluta de un archivo subido al backend (imágenes de productos en /uploads). */
export const urlArchivo = (ruta) => {
    if (!ruta) return ruta;
    if (/^(https?:|data:|blob:)/.test(ruta)) return ruta;
    return `${API_URL}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
};

const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default api;
