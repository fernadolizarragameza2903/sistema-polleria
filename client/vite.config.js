import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    // En Render (variable RENDER=true) el frontend está separado del backend:
    // sin VITE_API_URL el sitio se publicaría sin poder llegar al API, así que el build falla.
    if (command === 'build' && process.env.RENDER && !env.VITE_API_URL) {
        throw new Error('Falta VITE_API_URL: en Render > Static Site > Environment agrega VITE_API_URL=https://<tu-backend>.onrender.com y vuelve a desplegar.')
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
