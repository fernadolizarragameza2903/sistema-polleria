import { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, Check, X, Search } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Promociones() {
    const [promociones, setPromociones] = useState([]);
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ id: null, nombre: '', tipo: 'porcentaje', valor: '', aplicacion: 'general', producto_id: '', categoria_id: '', fecha_inicio: '', fecha_fin: '', dias_semana: '0,1,2,3,4,5,6', activo: true });
    const [confirm, setConfirm] = useState({ open: false, id: null, nombre: '' });

    const loadData = async () => {
        setLoading(true);
        try {
            const [resP, resProd, resCat] = await Promise.all([
                api.get('/promociones'),
                api.get('/productos'),
                api.get('/categorias')
            ]);
            setPromociones(resP.data.promociones);
            setProductos(resProd.data.productos.filter(p => p.activo));
            setCategorias(resCat.data.categorias.filter(c => c.activo));
        } catch (err) {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...form };
        if (payload.aplicacion !== 'producto') payload.producto_id = null;
        if (payload.aplicacion !== 'categoria') payload.categoria_id = null;
        if (!payload.fecha_inicio) payload.fecha_inicio = null;
        if (!payload.fecha_fin) payload.fecha_fin = null;

        const toastId = toast.loading('Guardando...');
        try {
            if (form.id) await api.put(`/promociones/${form.id}`, payload);
            else await api.post('/promociones', payload);
            toast.success('Promoción guardada', { id: toastId });
            setModal(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al guardar', { id: toastId });
        }
    };

    const handleDelete = async () => {
        const toastId = toast.loading('Eliminando...');
        try {
            await api.delete(`/promociones/${confirm.id}`);
            toast.success('Promoción eliminada', { id: toastId });
            loadData();
        } catch (err) {
            toast.error('Error al eliminar', { id: toastId });
        } finally {
            setConfirm({ open: false, id: null, nombre: '' });
        }
    };

    const toggleEstado = async (p) => {
        try {
            await api.put(`/promociones/${p.id}`, { activo: !p.activo });
            toast.success(`Promoción ${p.activo ? 'desactivada' : 'activada'}`);
            loadData();
        } catch (err) {
            toast.error('Error al cambiar estado');
        }
    };

    const openModal = (p = null) => {
        if (p) {
            setForm({
                id: p.id, nombre: p.nombre, tipo: p.tipo, valor: p.valor, aplicacion: p.aplicacion,
                producto_id: p.producto_id || '', categoria_id: p.categoria_id || '',
                fecha_inicio: p.fecha_inicio || '', fecha_fin: p.fecha_fin || '',
                dias_semana: p.dias_semana || '0,1,2,3,4,5,6', activo: p.activo
            });
        } else {
            setForm({ id: null, nombre: '', tipo: 'porcentaje', valor: '', aplicacion: 'general', producto_id: '', categoria_id: '', fecha_inicio: '', fecha_fin: '', dias_semana: '0,1,2,3,4,5,6', activo: true });
        }
        setModal(true);
    };

    const filtered = promociones.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));

    const handleDiasChange = (dia) => {
        let dias = form.dias_semana ? form.dias_semana.split(',') : [];
        if (dias.includes(dia)) dias = dias.filter(d => d !== dia);
        else dias.push(dia);
        setForm({ ...form, dias_semana: dias.join(',') });
    };

    const diasNombres = [{ v: '1', n: 'L' }, { v: '2', n: 'M' }, { v: '3', n: 'M' }, { v: '4', n: 'J' }, { v: '5', n: 'V' }, { v: '6', n: 'S' }, { v: '0', n: 'D' }];

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Promociones y Descuentos</div>
                    <div className="page-subtitle">Gestiona campañas y precios especiales automáticos</div>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}><Plus size={14} /> Nueva Promoción</button>
            </div>

            <div className="card mb-4">
                <div style={{ paddingBottom: 16 }}>
                    <div className="search-bar"><Search size={14} /><input placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Descuento</th>
                                <th>Aplica A</th>
                                <th>Vigencia</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={6}><div className="loader-page"><div className="loader" /></div></td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><Tag size={36} /><h3>No hay promociones registradas</h3></div></td></tr> :
                                    filtered.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent-pink)' }}>
                                                {p.tipo === 'porcentaje' ? `${parseFloat(p.valor)}%` : `S/. ${parseFloat(p.valor).toFixed(2)}`}
                                            </td>
                                            <td>
                                                {p.aplicacion === 'general' && <span className="stat-badge badge-blue">Todo el pedido</span>}
                                                {p.aplicacion === 'producto' && <span className="stat-badge badge-cyan">{p.producto?.nombre}</span>}
                                                {p.aplicacion === 'categoria' && <span className="stat-badge badge-orange">{p.categoria?.nombre}</span>}
                                            </td>
                                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                {p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString() : 'Siempre'} - {p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString() : 'Siempre'}
                                            </td>
                                            <td>
                                                <button className={`btn-status ${p.activo ? 'active' : 'inactive'}`} onClick={() => toggleEstado(p)}>
                                                    {p.activo ? 'Activo' : 'Inactivo'}
                                                </button>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-sm btn-secondary" onClick={() => openModal(p)}><Edit size={12} /></button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ open: true, id: p.id, nombre: p.nombre })}><Trash2 size={12} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: 600 }}>
                        <div className="modal-header">
                            <div className="modal-title">{form.id ? 'Editar Promoción' : 'Nueva Promoción'}</div>
                            <button className="modal-close" onClick={() => setModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit}>
                                <div className="grid-2">
                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Nombre de la campaña</label>
                                        <input className="form-control" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Cyber Days 20%" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tipo de Descuento</label>
                                        <select className="form-control" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                                            <option value="porcentaje">Porcentaje (%)</option>
                                            <option value="monto_fijo">Monto Fijo (S/.)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Valor del Descuento</label>
                                        <input type="number" step="0.01" min="0" required className="form-control" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
                                    </div>

                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Aplicar descuento a</label>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="radio" value="general" checked={form.aplicacion === 'general'} onChange={e => setForm({ ...form, aplicacion: e.target.value })} /> Todo el pedido
                                            </label>
                                            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="radio" value="categoria" checked={form.aplicacion === 'categoria'} onChange={e => setForm({ ...form, aplicacion: e.target.value })} /> Una categoría
                                            </label>
                                            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="radio" value="producto" checked={form.aplicacion === 'producto'} onChange={e => setForm({ ...form, aplicacion: e.target.value })} /> Un producto específico
                                            </label>
                                        </div>
                                    </div>

                                    {form.aplicacion === 'categoria' && (
                                        <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                            <label className="form-label">Categoría a descontar</label>
                                            <select className="form-control" required value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                                                <option value="">Selecciona una categoría...</option>
                                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {form.aplicacion === 'producto' && (
                                        <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                            <label className="form-label">Producto a descontar</label>
                                            <select className="form-control" required value={form.producto_id} onChange={e => setForm({ ...form, producto_id: e.target.value })}>
                                                <option value="">Selecciona un producto...</option>
                                                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (S/. {p.precio})</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label className="form-label">Fecha Inicio (opcional)</label>
                                        <input type="date" className="form-control" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Fecha Fin (opcional)</label>
                                        <input type="date" className="form-control" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
                                    </div>

                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Días de la semana activos</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {diasNombres.map(d => {
                                                const isActive = form.dias_semana && form.dias_semana.split(',').includes(d.v);
                                                return (
                                                    <button type="button" key={d.v} onClick={() => handleDiasChange(d.v)} style={{
                                                        width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                                                        border: isActive ? 'none' : '1px solid var(--border)',
                                                        background: isActive ? 'var(--orange)' : 'transparent',
                                                        color: isActive ? '#fff' : 'var(--text-muted)'
                                                    }}>
                                                        {d.n}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary"><Check size={14} /> Guardar Promoción</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={confirm.open}
                type="danger"
                title="Eliminar Promoción"
                message={`¿Eliminar permanentemente la promoción "${confirm.nombre}"?`}
                onConfirm={handleDelete}
                onCancel={() => setConfirm({ open: false, id: null, nombre: '' })}
            />
        </div>
    );
}
