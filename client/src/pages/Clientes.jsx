import { useState, useEffect } from 'react';
import { Plus, Edit, ToggleLeft, ToggleRight, Search, Users } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ nombre: '', documento_tipo: 'DNI', documento_numero: '', telefono: '', email: '', direccion: '', tipo: 'regular' });
    const [confirm, setConfirm] = useState({ open: false, cliente: null });

    const load = () => api.get('/clientes').then(r => setClientes(r.data.clientes)).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const openModal = (c = null) => {
        setEditing(c);
        setForm(c ? { nombre: c.nombre, documento_tipo: c.documento_tipo, documento_numero: c.documento_numero || '', telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '', tipo: c.tipo } : { nombre: '', documento_tipo: 'DNI', documento_numero: '', telefono: '', email: '', direccion: '', tipo: 'regular' });
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/clientes/${editing.id}`, form); toast.success('Cliente actualizado'); }
            else { await api.post('/clientes', form); toast.success('Cliente creado'); }
            setModal(false); load();
        } catch (err) { toast.error(err.response?.data?.msg || 'Error'); }
    };

    const toggleActivo = async () => {
        const c = confirm.cliente;
        try {
            await api.put(`/clientes/${c.id}`, { activo: c.activo ? 0 : 1 });
            toast.success(`Cliente ${c.activo ? 'desactivado' : 'activado'} correctamente`);
            load();
        } catch { toast.error('Error al actualizar cliente'); }
        setConfirm({ open: false, cliente: null });
    };

    const tipoChip = (t) => ({ regular: 'chip-info', frecuente: 'chip-success', corporativo: 'chip-cyan' }[t] || 'chip-info');
    const filtered = clientes.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()) || (c.documento_numero || '').includes(search));

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Clientes</div><div className="page-subtitle">{clientes.length} clientes registrados</div></div>
                <button className="btn btn-primary" onClick={() => openModal()}><Plus size={14} /> Nuevo Cliente</button>
            </div>
            <div className="card">
                <div style={{ paddingBottom: 16 }}>
                    <div className="search-bar"><Search size={14} /><input placeholder="Buscar por nombre o documento..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                </div>
                <div className="table-container"><table className="table">
                    <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Email</th><th>Tipo</th><th>Puntos</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {loading ? <tr><td colSpan={8}><div className="loader-page"><div className="loader" /></div></td></tr>
                            : filtered.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.documento_tipo}: {c.documento_numero}</td>
                                    <td>{c.telefono || '—'}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.email || '—'}</td>
                                    <td><span className={`chip ${tipoChip(c.tipo)}`}>{c.tipo}</span></td>
                                    <td><span className="stat-badge badge-purple">{c.puntos} pts</span></td>
                                    <td><span className={`chip ${c.activo ? 'chip-success' : 'chip-error'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span></td>
                                    <td><div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-sm btn-secondary" onClick={() => openModal(c)}><Edit size={12} /></button>
                                        <button
                                            className={`btn btn-sm ${c.activo ? 'btn-danger' : 'btn-success'}`}
                                            onClick={() => setConfirm({ open: true, cliente: c })}
                                            title={c.activo ? 'Desactivar cliente' : 'Activar cliente'}
                                        >
                                            {c.activo ? <><ToggleRight size={12} /> Desactivar</> : <><ToggleLeft size={12} /> Activar</>}
                                        </button>
                                    </div></td>
                                </tr>
                            ))}
                        {!loading && filtered.length === 0 && <tr><td colSpan={8}><div className="empty-state"><Users size={36} /><h3>Sin clientes</h3></div></td></tr>}
                    </tbody>
                </table></div>
            </div>

            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal">
                        <div className="modal-header"><div className="modal-title">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</div><button className="modal-close" onClick={() => setModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Nombre *</label><input className="form-control" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Tipo Documento</label><select className="form-control" value={form.documento_tipo} onChange={e => setForm({ ...form, documento_tipo: e.target.value })}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option></select></div>
                                    <div className="form-group"><label className="form-label">N° Documento</label><input className="form-control" value={form.documento_numero} onChange={e => setForm({ ...form, documento_numero: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Teléfono</label><input className="form-control" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Dirección</label><textarea className="form-control" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Tipo de Cliente</label><select className="form-control" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="regular">Regular</option><option value="frecuente">Frecuente</option><option value="corporativo">Corporativo</option></select></div>
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
                type={confirm.cliente?.activo ? 'danger' : 'info'}
                title={confirm.cliente?.activo ? 'Desactivar Cliente' : 'Activar Cliente'}
                message={
                    confirm.cliente?.activo
                        ? `¿Estás seguro que deseas desactivar a "${confirm.cliente?.nombre}"? No aparecerá en el POS ni en reportes activos.`
                        : `¿Deseas activar nuevamente a "${confirm.cliente?.nombre}"?`
                }
                confirmLabel={confirm.cliente?.activo ? 'Sí, desactivar' : 'Sí, activar'}
                onConfirm={toggleActivo}
                onCancel={() => setConfirm({ open: false, cliente: null })}
            />
        </div>
    );
}
