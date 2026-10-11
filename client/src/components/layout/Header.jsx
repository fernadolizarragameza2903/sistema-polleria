import { Search, Bell, ChefHat, Menu } from 'lucide-react';
import useConfigStore from '../../store/configStore';

export default function Header({ onMenuToggle }) {
    const { config } = useConfigStore();

    return (
        <div className="header">

            {/* Botón hamburguesa — visible solo en tablet/móvil */}
            <button className="menu-toggle-btn" onClick={onMenuToggle} aria-label="Abrir menú">
                <Menu size={20} />
            </button>

            {/* Logo + Nombre empresa */}
            <div className="header-brand">
                {config.logo ? (
                    <img
                        src={config.logo}
                        alt="Logo"
                        style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }}
                    />
                ) : (
                    <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'var(--orange)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <ChefHat size={18} color="#fff" />
                    </div>
                )}
                <div className="header-brand-text">
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {config.empresa_nombre || 'Sistema Pollería'}
                    </div>
                    {config.empresa_ruc && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>RUC: {config.empresa_ruc}</div>
                    )}
                </div>
            </div>

            {/* Barra de búsqueda — oculta en móvil pequeño */}
            <div className="header-search">
                <Search size={14} />
                <input placeholder="Buscar..." />
            </div>

            {/* Acciones de la derecha */}
            <div className="header-actions">
                <div className="icon-btn">
                    <Bell size={15} />
                    <span className="notif-badge">3</span>
                </div>


            </div>
        </div>
    );
}
