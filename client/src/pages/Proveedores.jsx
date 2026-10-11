import { useState, useEffect } from 'react';
import { Plus, Edit, ToggleLeft, ToggleRight, Truck } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Proveedores() {
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ nombre: '', ruc: '', contacto: '', telefono: '', email: '', direccion: '', productos_suministra: '' });
    const [confirm, setConfirm] = useState({ open: false, proveedor: null });

    const load = () => api.get('/proveedores').then(r => setProveedores(r.data.proveedores)).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const openModal = (p = null) => {
        setEditing(p);
        setForm(p ? { nombre: p.nombre, ruc: p.ruc || '', contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', direccion: p.direccion || '', productos_suministra: p.productos_suministra || '' } : { nombre: '', ruc: '', contacto: '', telefono: '', email: '', direccion: '', productos_suministra: '' });
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/proveedores/${editing.id}`, form); toast.success('Proveedor actualizado'); }
            else { await api.post('/proveedores', form); toast.success('Proveedor creado'); }
            setModal(false); load();
        } catch { toast.error('Error al guardar'); }
    };

    const toggleActivo = async () => {
        const p = confirm.proveedor;
        try {
            await api.put(`/proveedores/${p.id}`, { activo: p.activo ? 0 : 1 });
            toast.success(`Proveedor ${p.activo ? 'desactivado' : 'activado'} correctamente`);
            load();
        } catch { toast.error('Error al actualizar proveedor'); }
        setConfirm({ open: false, proveedor: null });
    };

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Proveedores</div><div className="page-subtitle">{proveedores.length} proveedores</div></div>
                <button className="btn btn-primary" onClick={() => openModal()}><Plus size={14} /> Nuevo Proveedor</button>
            </div>
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>Proveedor</th><th>RUC</th><th>Contacto</th><th>Teléfono</th><th>Suministra</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7}><div className="loader-page"><div className="loader" /></div></td></tr>
                                : proveedores.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.ruc || '—'}</td>
                                        <td>{p.contacto || '—'}</td>
                                        <td>{p.telefono || '—'}</td>
                                        <td style={{ fontSize: 12, maxWidth: 180 }}><div className="truncate" title={p.productos_suministra}>{p.productos_suministra || '—'}</div></td>
                                        <td><span className={`chip ${p.activo ? 'chip-success' : 'chip-error'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                                        <td><div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => openModal(p)}><Edit size={12} /></button>
                                            <button
                                                className={`btn btn-sm ${p.activo ? 'btn-danger' : 'btn-success'}`}
                                                onClick={() => setConfirm({ open: true, proveedor: p })}
                                                title={p.activo ? 'Desactivar proveedor' : 'Activar proveedor'}
                                            >
                                                {p.activo ? <><ToggleRight size={12} /> Desactivar</> : <><ToggleLeft size={12} /> Activar</>}
                                            </button>
                                        </div></td>
                                    </tr>
                                ))}
                            {!loading && proveedores.length === 0 && <tr><td colSpan={7}><div className="empty-state"><Truck size={36} /><h3>Sin proveedores</h3></div></td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal modal-lg">
                        <div className="modal-header"><div className="modal-title">{editing ? 'Editar' : 'Nuevo'} Proveedor</div><button className="modal-close" onClick={() => setModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Nombre *</label><input className="form-control" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">RUC</label><input className="form-control" value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Contacto</label><input className="form-control" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Teléfono</label><input className="form-control" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Productos que suministra</label><textarea className="form-control" value={form.productos_suministra} onChange={e => setForm({ ...form, productos_suministra: e.target.value })} /></div>
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
                type={confirm.proveedor?.activo ? 'danger' : 'info'}
                title={confirm.proveedor?.activo ? 'Desactivar Proveedor' : 'Activar Proveedor'}
                message={
                    confirm.proveedor?.activo
                        ? `¿Estás seguro que deseas desactivar al proveedor "${confirm.proveedor?.nombre}"?`
                        : `¿Deseas activar nuevamente al proveedor "${confirm.proveedor?.nombre}"?`
                }
                confirmLabel={confirm.proveedor?.activo ? 'Sí, desactivar' : 'Sí, activar'}
                onConfirm={toggleActivo}
                onCancel={() => setConfirm({ open: false, proveedor: null })}
            />
        </div>
    );
}
