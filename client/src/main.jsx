import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
        <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
                duration: 3500,
                style: {
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
                    maxWidth: 360,
                },
                success: {
                    iconTheme: { primary: '#22c55e', secondary: '#ffffff' },
                    style: {
                        background: '#ffffff',
                        color: '#111827',
                        borderLeft: '4px solid #22c55e',
                    },
                },
                error: {
                    iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
                    style: {
                        background: '#ffffff',
                        color: '#111827',
                        borderLeft: '4px solid #ef4444',
                    },
                },
                loading: {
                    iconTheme: { primary: '#FF6B2B', secondary: '#ffffff' },
                    style: {
                        background: '#ffffff',
                        color: '#111827',
                        borderLeft: '4px solid #FF6B2B',
                    },
                },
            }}
        />
    </React.StrictMode>,
)
