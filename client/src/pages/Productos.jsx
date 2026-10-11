import { useState, useEffect } from 'react';
import { Plus, Edit, ToggleLeft, ToggleRight, Search, Package } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Productos() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', precio_costo: '', stock: '', stock_minimo: 5, unidad: 'unidad', categoria_id: '', codigo: '', activo: 1, featured: 0 });
    const [confirm, setConfirm] = useState({ open: false, producto: null });

    const load = () => {
        api.get('/productos').then(r => setProductos(r.data.productos)).finally(() => setLoading(false));
        api.get('/categorias').then(r => setCategorias(r.data.categorias));
    };

    useEffect(() => { load(); }, []);

    const openModal = (p = null) => {
        setEditing(p);
        setForm(p ? { nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, precio_costo: p.precio_costo, stock: p.stock, stock_minimo: p.stock_minimo, unidad: p.unidad, categoria_id: p.categoria_id || '', codigo: p.codigo || '', activo: p.activo, featured: p.featured } : { nombre: '', descripcion: '', precio: '', precio_costo: '', stock: '', stock_minimo: 5, unidad: 'unidad', categoria_id: '', codigo: '', activo: 1, featured: 0 });
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        const file = e.target.imagen?.files[0];
        if (file) fd.append('imagen', file);
        try {
            if (editing) { await api.put(`/productos/${editing.id}`, fd); toast.success('Producto actualizado'); }
            else { await api.post('/productos', fd); toast.success('Producto creado'); }
            setModal(false);
            load();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al guardar');
        }
    };

    const toggleActivo = async (p) => {
        try {
            await api.put(`/productos/${p.id}`, { activo: p.activo ? 0 : 1 });
            toast.success(`Producto ${p.activo ? 'desactivado' : 'activado'} correctamente`);
            load();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al actualizar');
        }
        setConfirm({ open: false, producto: null });
    };

    const filtered = productos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Productos</div>
                    <div className="page-subtitle">{productos.length} productos registrados</div>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}><Plus size={14} /> Nuevo Producto</button>
            </div>

            <div className="card">
                <div style={{ padding: '0 0 16px', display: 'flex', gap: 12 }}>
                    <div className="search-bar" style={{ flex: 1 }}>
                        <Search size={14} />
                        <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>#</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8}><div className="loader-page"><div className="loader" /></div></td></tr>
                            ) : filtered.map(p => (
                                <tr key={p.id}>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.id}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 36, height: 36, background: 'var(--bg-input)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
                                                {p.imagen ? <img src={p.imagen} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🍗'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.codigo}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="chip chip-info">{p.categoria?.nombre || '—'}</span></td>
                                    <td style={{ fontWeight: 600, color: 'var(--orange)' }}>S/. {parseFloat(p.precio).toFixed(2)}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>S/. {parseFloat(p.precio_costo || 0).toFixed(2)}</td>
                                    <td>
                                        <span className={p.stock <= p.stock_minimo ? 'chip chip-error' : 'chip chip-success'}>
                                            {p.stock} {p.unidad}
                                        </span>
                                    </td>
                                    <td><span className={p.activo ? 'chip chip-success' : 'chip chip-error'}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => openModal(p)}><Edit size={12} /></button>
                                            <button
                                                className={`btn btn-sm ${p.activo ? 'btn-danger' : 'btn-success'}`}
                                                onClick={() => setConfirm({ open: true, producto: p })}
                                                title={p.activo ? 'Desactivar producto' : 'Activar producto'}
                                            >
                                                {p.activo ? <><ToggleRight size={12} /> Desactivar</> : <><ToggleLeft size={12} /> Activar</>}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={8}><div className="empty-state"><Package size={36} /><h3>Sin productos</h3></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal CRUD */}
            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Editar Producto' : 'Nuevo Producto'}</div>
                            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Nombre *</label><input className="form-control" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">Código</label><input className="form-control" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-control" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
                                <div className="form-row-3">
                                    <div className="form-group"><label className="form-label">Precio Venta *</label><input className="form-control" type="number" step="0.01" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">Precio Costo</label><input className="form-control" type="number" step="0.01" value={form.precio_costo} onChange={e => setForm({ ...form, precio_costo: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Categoría</label>
                                        <select className="form-control" value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                                            <option value="">Sin categoría</option>
                                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Stock</label><input className="form-control" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">Stock Mínimo</label><input className="form-control" type="number" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Unidad</label>
                                        <select className="form-control" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
                                            {['unidad', 'kg', 'porción', 'combo', 'presa'].map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Imagen</label><input className="form-control" type="file" name="imagen" accept="image/*" /></div>
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

            {/* Confirm Modal profesional */}
            <ConfirmModal
                open={confirm.open}
                type={confirm.producto?.activo ? 'danger' : 'info'}
                title={confirm.producto?.activo ? 'Desactivar Producto' : 'Activar Producto'}
                message={
                    confirm.producto?.activo
                        ? `¿Estás seguro que deseas desactivar el producto "${confirm.producto?.nombre}"? No estará disponible en el POS.`
                        : `¿Deseas activar el producto "${confirm.producto?.nombre}"? Estará disponible nuevamente en el POS.`
                }
                confirmLabel={confirm.producto?.activo ? 'Sí, desactivar' : 'Sí, activar'}
                onConfirm={() => toggleActivo(confirm.producto)}
                onCancel={() => setConfirm({ open: false, producto: null })}
            />
        </div>
    );
}
