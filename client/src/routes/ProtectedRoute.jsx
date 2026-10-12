import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children }) {
    const { token, usuario } = useAuthStore();
    // Una sesión sin usuario/rol (p. ej. guardada por un login fallido) no es válida:
    // sin rol, el redireccionamiento por rol entraría en un bucle.
    return token && usuario?.rol ? children : <Navigate to="/login" replace />;
}
