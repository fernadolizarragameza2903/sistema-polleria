import axios from 'axios';
import useAuthStore from '../store/authStore';

/**
 * URL del backend.
 * - Desarrollo: VITE_API_URL vacío -> Vite redirige /api al backend local (vite.config.js).
 * - Producción (Render): URL pública del backend, p. ej. https://polleria-api.onrender.com
 * Se normaliza para tolerar errores comunes al cargarla en Render:
 * sin "https://", con "/" final o con "/api" al final.
 */
const normalizarApiUrl = (valor) => {
    let url = String(valor || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) url = `${/^(localhost|127\.)/.test(url) ? 'http' : 'https'}://${url}`;
    return url.replace(/\/+$/, '').replace(/\/api$/i, '');
};

export const API_URL = normalizarApiUrl(import.meta.env.VITE_API_URL);

if (import.meta.env.PROD && !API_URL) {
    console.error('VITE_API_URL no está definida: el frontend no sabe dónde está el backend. Configúrala en Render y vuelve a desplegar.');
}

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
    (res) => {
        // El API siempre responde JSON. Si llega HTML, la petición la contestó el
        // Static Site (VITE_API_URL mal configurada), no el backend.
        const tipo = String(res.headers['content-type'] || '');
        if (tipo.includes('text/html')) {
            const err = new Error('No se pudo conectar con el servidor (revisa VITE_API_URL del frontend).');
            err.response = { status: 0, data: { ok: false, msg: err.message } };
            return Promise.reject(err);
        }
        return res;
    },
    (err) => {
        // Sesión vencida o inválida: solo si había sesión y no es el propio login.
        const esLogin = err.config?.url?.includes('/auth/login');
        if (err.response?.status === 401 && !esLogin && useAuthStore.getState().token) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        if (!err.response) {
            // Sin respuesta: backend dormido/caído (plan gratuito de Render) o bloqueo de CORS.
            err.response = { status: 0, data: { ok: false, msg: 'El servidor no responde. Si está en Render gratuito puede tardar ~1 minuto en despertar; inténtalo de nuevo.' } };
        }
        return Promise.reject(err);
    }
);

export default api;
