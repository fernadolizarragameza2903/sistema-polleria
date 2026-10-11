import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('admin@polleria.com');
    const [password, setPassword] = useState('admin123');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setAuth(data.token, data.usuario);
            toast.success('¡Bienvenido!');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error de autenticación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Orbs decorativos */}
            <div className="login-bg-orb" style={{ width: 400, height: 400, background: 'rgba(233,30,140,0.12)', top: -100, left: -100 }} />
            <div className="login-bg-orb" style={{ width: 300, height: 300, background: 'rgba(79,142,247,0.1)', bottom: -80, right: -80 }} />

            <div className="login-card">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 64, height: 64, background: 'var(--grad-pink)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px', boxShadow: 'var(--shadow-pink)' }}>
                        🐔
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Sistema Pollería</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Ingresa con tu cuenta para continuar</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Correo electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="form-control"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@polleria.com"
                                style={{ paddingLeft: 36 }}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="form-control"
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ paddingLeft: 36, paddingRight: 36 }}
                                required
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? <><div className="loader" style={{ width: 16, height: 16, borderWidth: 2 }} /> Ingresando...</> : 'Ingresar al sistema'}
                    </button>
                </form>

                <div style={{ marginTop: 24, padding: 14, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>CREDENCIALES DE ACCESO</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📧 admin@polleria.com</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🔑 admin123</p>
                </div>
            </div>
        </div>
    );
}
