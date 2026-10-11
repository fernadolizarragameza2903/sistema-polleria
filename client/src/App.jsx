import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Productos from './pages/Productos';
import Categorias from './pages/Categorias';
import Clientes from './pages/Clientes';
import Proveedores from './pages/Proveedores';
import Ventas from './pages/Ventas';
import Caja from './pages/Caja';
import Pedidos from './pages/Pedidos';
import Inventario from './pages/Inventario';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Usuarios from './pages/Usuarios';
import Compras from './pages/Compras';
import Logs from './pages/Logs';
import Promociones from './pages/Promociones';
import CRM from './pages/CRM';
import CRMPerfilCliente from './pages/CRMPerfilCliente';
import useAuthStore from './store/authStore';

function HomeRedirect() {
    const { usuario } = useAuthStore();
    return <Navigate to={usuario?.rol === 'administrador' ? '/dashboard' : '/pos'} replace />;
}

function RoleRoute({ roles, children }) {
    const { usuario } = useAuthStore();
    return roles.includes(usuario?.rol) ? children : <Navigate to="/" replace />;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route index element={<HomeRedirect />} />
                    <Route path="dashboard" element={<RoleRoute roles={['administrador']}><Dashboard /></RoleRoute>} />
                    <Route path="pos" element={<RoleRoute roles={['administrador', 'cajero']}><POS /></RoleRoute>} />
                    <Route path="ventas" element={<RoleRoute roles={['administrador', 'cajero']}><Ventas /></RoleRoute>} />
                    <Route path="pedidos" element={<RoleRoute roles={['administrador', 'cajero']}><Pedidos /></RoleRoute>} />
                    <Route path="productos" element={<RoleRoute roles={['administrador']}><Productos /></RoleRoute>} />
                    <Route path="categorias" element={<RoleRoute roles={['administrador']}><Categorias /></RoleRoute>} />
                    <Route path="inventario" element={<RoleRoute roles={['administrador']}><Inventario /></RoleRoute>} />
                    <Route path="compras" element={<RoleRoute roles={['administrador']}><Compras /></RoleRoute>} />
                    <Route path="promociones" element={<RoleRoute roles={['administrador']}><Promociones /></RoleRoute>} />
                    <Route path="crm" element={<RoleRoute roles={['administrador']}><CRM /></RoleRoute>} />
                    <Route path="crm/cliente/:id" element={<RoleRoute roles={['administrador']}><CRMPerfilCliente /></RoleRoute>} />
                    <Route path="clientes" element={<RoleRoute roles={['administrador', 'cajero']}><Clientes /></RoleRoute>} />
                    <Route path="proveedores" element={<RoleRoute roles={['administrador']}><Proveedores /></RoleRoute>} />
                    <Route path="caja" element={<RoleRoute roles={['administrador', 'cajero']}><Caja /></RoleRoute>} />
                    <Route path="reportes" element={<RoleRoute roles={['administrador']}><Reportes /></RoleRoute>} />
                    <Route path="configuracion" element={<RoleRoute roles={['administrador']}><Configuracion /></RoleRoute>} />
                    <Route path="usuarios" element={<RoleRoute roles={['administrador']}><Usuarios /></RoleRoute>} />
                    <Route path="logs" element={<RoleRoute roles={['administrador']}><Logs /></RoleRoute>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
