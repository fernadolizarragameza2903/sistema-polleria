import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Package, Tag, Users, Truck,
    ClipboardList, BarChart2, Settings, LogOut, ChefHat, ShoppingBag,
    Warehouse, X, DollarSign, ShieldAlert, Gift, HeartHandshake
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['administrador'] },
    { to: '/pos', icon: ShoppingCart, label: 'Punto de Venta', roles: ['administrador', 'cajero'] },
    { to: '/ventas', icon: ClipboardList, label: 'Ventas', roles: ['administrador', 'cajero'] },
    { to: '/pedidos', icon: ChefHat, label: 'Pedidos', roles: ['administrador', 'cajero'] },
    { to: '/crm', icon: HeartHandshake, label: 'CRM & Fidelidad', roles: ['administrador'] },
    { to: '/productos', icon: Package, label: 'Productos', roles: ['administrador'] },
    { to: '/promociones', icon: Gift, label: 'Promociones', roles: ['administrador'] },
    { to: '/categorias', icon: Tag, label: 'Categorías', roles: ['administrador'] },
    { to: '/inventario', icon: Warehouse, label: 'Inventario', roles: ['administrador'] },
    { to: '/compras', icon: ShoppingBag, label: 'Compras', roles: ['administrador'] },
    { to: '/clientes', icon: Users, label: 'Clientes', roles: ['administrador', 'cajero'] },
    { to: '/proveedores', icon: Truck, label: 'Proveedores', roles: ['administrador'] },
    { to: '/caja', icon: DollarSign, label: 'Caja', roles: ['administrador', 'cajero'] },
    { to: '/reportes', icon: BarChart2, label: 'Reportes', roles: ['administrador'] },
    { to: '/logs', icon: ShieldAlert, label: 'Auditoría', roles: ['administrador'] },
    { to: '/configuracion', icon: Settings, label: 'Configuración', roles: ['administrador'] },
];

export default function Sidebar({ isOpen, onClose }) {
    const { usuario, logout } = useAuthStore();
    const navigate = useNavigate();
    const rol = usuario?.rol || 'cajero';

    const handleLogout = () => { logout(); navigate('/login'); };

    const itemsVisibles = navItems.filter(item =>
        !item.roles || item.roles.includes(rol)
    );

    return (
        <div className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
            {/* Botón cerrar — solo visible en móvil */}
            <button className="sidebar-close-btn" onClick={onClose} aria-label="Cerrar menú">
                <X size={18} />
            </button>

            {/* Avatar usuario arriba */}
            <div className="sidebar-user-top">
                <div className="sidebar-avatar">
                    {usuario?.nombre?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="sidebar-user-info">
                    <div className="sidebar-username">@{(usuario?.nombre || 'Admin').toLowerCase().replace(/\s+/g, '_')}</div>
                    <div className="sidebar-userrole">{rol}</div>
                </div>
            </div>

            {/* Navegación filtrada por rol */}
            <nav className="sidebar-nav">
                {itemsVisibles.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => { if (window.innerWidth <= 1024) onClose(); }}
                        title={label}
                    >
                        <Icon size={15} className="nav-icon" />
                        <span className="nav-label">{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="sidebar-logout">
                <button onClick={handleLogout}>
                    <LogOut size={15} />
                    <span className="nav-label">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}
