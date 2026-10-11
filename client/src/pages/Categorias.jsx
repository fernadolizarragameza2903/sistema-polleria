import { useState, useEffect } from 'react';
import { Plus, Edit, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Categorias() {
    const [cats, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ nombre: '', descripcion: '', color: '#FF6B2B' });
    const [confirm, setConfirm] = useState({ open: false, categoria: null });

    const load = () => api.get('/categorias').then(r => setCats(r.data.categorias)).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const openModal = (c = null) => {
        setEditing(c);
        setForm(c ? { nombre: c.nombre, descripcion: c.descripcion || '', color: c.color } : { nombre: '', descripcion: '', color: '#FF6B2B' });
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/categorias/${editing.id}`, form); toast.success('Categoría actualizada'); }
            else { await api.post('/categorias', form); toast.success('Categoría creada'); }
            setModal(false); load();
        } catch { toast.error('Error al guardar'); }
    };

    const toggleActivo = async () => {
        const c = confirm.categoria;
        try {
            await api.put(`/categorias/${c.id}`, { activo: c.activo ? 0 : 1 });
            toast.success(`Categoría ${c.activo ? 'desactivada' : 'activada'} correctamente`);
            load();
        } catch { toast.error('Error al actualizar categoría'); }
        setConfirm({ open: false, categoria: null });
    };

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Categorías</div><div className="page-subtitle">{cats.length} categorías</div></div>
                <button className="btn btn-primary" onClick={() => openModal()}><Plus size={14} /> Nueva Categoría</button>
            </div>
            <div className="grid-3">
                {loading ? <div className="loader-page"><div className="loader" /></div> : cats.map(c => (
                    <div key={c.id} className="card" style={{ borderLeft: `4px solid ${c.color}`, opacity: c.activo ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: 24, marginBottom: 8 }}>🏷️</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nombre}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{c.descripcion || 'Sin descripción'}</div>
                                <div style={{ marginTop: 8 }}>
                                    <span className={`chip ${c.activo ? 'chip-success' : 'chip-error'}`}>{c.activo ? 'Activa' : 'Inactiva'}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                                <button className="btn btn-sm btn-secondary" onClick={() => openModal(c)}><Edit size={12} /></button>
                                <button
                                    className={`btn btn-sm ${c.activo ? 'btn-danger' : 'btn-success'}`}
                                    onClick={() => setConfirm({ open: true, categoria: c })}
                                    title={c.activo ? 'Desactivar' : 'Activar'}
                                >
                                    {c.activo ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {!loading && cats.length === 0 && <div className="empty-state" style={{ gridColumn: '1/-1' }}><Tag size={36} /><h3>Sin categorías</h3></div>}
            </div>

            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal">
                        <div className="modal-header"><div className="modal-title">{editing ? 'Editar' : 'Nueva'} Categoría</div><button className="modal-close" onClick={() => setModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Nombre *</label><input className="form-control" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-control" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Color</label><input className="form-control" type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ height: 42 }} /></div>
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
                type={confirm.categoria?.activo ? 'danger' : 'info'}
                title={confirm.categoria?.activo ? 'Desactivar Categoría' : 'Activar Categoría'}
                message={
                    confirm.categoria?.activo
                        ? `¿Deseas desactivar la categoría "${confirm.categoria?.nombre}"? Los productos asociados quedarán sin categoría visible.`
                        : `¿Deseas activar la categoría "${confirm.categoria?.nombre}"?`
                }
                confirmLabel={confirm.categoria?.activo ? 'Sí, desactivar' : 'Sí, activar'}
                onConfirm={toggleActivo}
                onCancel={() => setConfirm({ open: false, categoria: null })}
            />
        </div>
    );
}
