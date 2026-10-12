import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    // En Render (variable RENDER=true) el frontend está separado del backend:
    // sin VITE_API_URL el sitio se publicaría sin poder llegar al API, así que el build falla.
    if (command === 'build' && process.env.RENDER) {
        const valor = String(env.VITE_API_URL || '').trim()
        if (!valor) {
            throw new Error('Falta VITE_API_URL: en Render > Static Site > Environment agrega VITE_API_URL=https://<tu-backend>.onrender.com y vuelve a desplegar.')
        }
        // Debe ser una dirección pública completa. Un nombre suelto como "polleria-api"
        // (nombre del servicio) no existe en internet: el navegador da ERR_NAME_NOT_RESOLVED.
        const host = valor.replace(/^https?:\/\//i, '').split(/[/:]/)[0]
        if (!host.includes('.')) {
            throw new Error(`VITE_API_URL="${valor}" no es una URL pública. Copia la URL completa de tu Web Service en Render (arriba del panel), p. ej. https://polleria-api-xxxx.onrender.com`)
        }
    }

    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                },
                '/uploads': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                },
            },
        },
    }
})
