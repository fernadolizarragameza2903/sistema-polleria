import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useConfigStore from '../../store/configStore';

export default function MainLayout() {
    const fetchConfig = useConfigStore(s => s.fetchConfig);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Cargar configuración de empresa al montar el layout (una sola vez)
    useEffect(() => { fetchConfig(); }, []);

    // Cerrar sidebar al cambiar de tamaño a desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024) setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="app-layout">
            {/* Overlay para cerrar sidebar en móvil */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="main-content">
                <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
                <div className="page-content">
                    <div className="fade-in">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}
