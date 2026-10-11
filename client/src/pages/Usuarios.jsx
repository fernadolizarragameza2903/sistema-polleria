import { useState, useEffect } from 'react';
import { Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ nombre: '', email: '', password: '', rol_id: 2, activo: 1 });
    const [confirm, setConfirm] = useState({ open: false, usuario: null });

    const load = () => {
        api.get('/usuarios').then(r => setUsuarios(r.data.usuarios)).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const openModal = (u = null) => {
        setEditing(u);
        setForm(u ? { nombre: u.nombre, email: u.email, password: '', rol_id: u.rol_id, activo: u.activo } : { nombre: '', email: '', password: '', rol_id: 2, activo: 1 });
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/usuarios/${editing.id}`, form); toast.success('Usuario actualizado'); }
            else { await api.post('/usuarios', form); toast.success('Usuario creado'); }
            setModal(false); load();
        } catch (err) { toast.error(err.response?.data?.msg || 'Error'); }
    };

    const toggleActivo = async () => {
        const u = confirm.usuario;
        try {
            await api.put(`/usuarios/${u.id}`, { activo: u.activo ? 0 : 1 });
            toast.success(`Usuario ${u.activo ? 'desactivado' : 'activado'} correctamente`);
            load();
        } catch { toast.error('Error al actualizar usuario'); }
        setConfirm({ open: false, usuario: null });
    };

    const ROL_COLORS = { administrador: 'badge-orange', cajero: 'badge-blue', cocinero: 'badge-yellow', repartidor: 'badge-cyan' };

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Usuarios</div><div className="page-subtitle">{usuarios.length} usuarios del sistema</div></div>
                <button className="btn btn-primary" onClick={() => openModal()}><Plus size={14} /> Nuevo Usuario</button>
            </div>
            <div className="card">
                <div className="table-container"><table className="table">
                    <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={5}><div className="loader-page"><div className="loader" /></div></td></tr>
                            : usuarios.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.activo ? 'var(--orange)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 14, flexShrink: 0 }}>
                                                {u.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{u.nombre}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.email}</td>
                                    <td><span className={`stat-badge ${ROL_COLORS[u.rol?.nombre] || 'badge-blue'}`}>{u.rol?.nombre}</span></td>
                                    <td><span className={`chip ${u.activo ? 'chip-success' : 'chip-error'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                                    <td><div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-sm btn-secondary" onClick={() => openModal(u)}><Edit size={12} /></button>
                                        <button
                                            className={`btn btn-sm ${u.activo ? 'btn-danger' : 'btn-success'}`}
                                            onClick={() => setConfirm({ open: true, usuario: u })}
                                            title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                                        >
                                            {u.activo ? <><ToggleRight size={12} /> Desactivar</> : <><ToggleLeft size={12} /> Activar</>}
                                        </button>
                                    </div></td>
                                </tr>
                            ))}
                    </tbody>
                </table></div>
            </div>

            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal">
                        <div className="modal-header"><div className="modal-title">{editing ? 'Editar' : 'Nuevo'} Usuario</div><button className="modal-close" onClick={() => setModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Nombre *</label><input className="form-control" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Email *</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">{editing ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label><input className="form-control" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} /></div>
                                <div className="form-group"><label className="form-label">Rol</label>
                                    <select className="form-control" value={form.rol_id} onChange={e => setForm({ ...form, rol_id: parseInt(e.target.value) })}>
                                        <option value={1}>Administrador</option>
                                        <option value={2}>Cajero</option>
                                        <option value={3}>Cocinero</option>
                                        <option value={4}>Repartidor</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={confirm.open}
                type={confirm.usuario?.activo ? 'warning' : 'info'}
                title={confirm.usuario?.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
                message={
                    confirm.usuario?.activo
                        ? `¿Estás seguro que deseas desactivar a "${confirm.usuario?.nombre}"? Ya no podrá acceder al sistema.`
                        : `¿Deseas activar nuevamente a "${confirm.usuario?.nombre}"? Recuperará su acceso al sistema.`
                }
                confirmLabel={confirm.usuario?.activo ? 'Sí, desactivar' : 'Sí, activar'}
                onConfirm={toggleActivo}
                onCancel={() => setConfirm({ open: false, usuario: null })}
            />
        </div>
    );
}
