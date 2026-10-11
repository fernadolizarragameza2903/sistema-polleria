import { useState, useEffect } from 'react';
import { Plus, Eye, ShoppingBag, Search, Trash2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Compras() {
    const [compras, setCompras] = useState([]);
    const [productos, setProductos] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(false);
    const [detalle, setDetalle] = useState(null);

    // Formulario de nueva compra
    const [form, setForm] = useState({
        proveedor_id: '',
        numero_factura: '',
        fecha_compra: new Date().toISOString().split('T')[0],
        estado: 'recibida',
        observaciones: '',
    });
    const [items, setItems] = useState([{ producto_id: '', cantidad: 1, precio_unitario: 0 }]);

    const load = () => {
        api.get('/compras').then(r => setCompras(r.data.compras)).finally(() => setLoading(false));
        api.get('/productos').then(r => setProductos(r.data.productos));
        api.get('/proveedores').then(r => setProveedores(r.data.proveedores));
    };
    useEffect(() => { load(); }, []);

    // Items del detalle
    const addItem = () => setItems([...items, { producto_id: '', cantidad: 1, precio_unitario: 0 }]);
    const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
    const updateItem = (i, field, value) => {
        const copy = [...items];
        copy[i] = { ...copy[i], [field]: value };
        setItems(copy);
    };

    const subtotal = items.reduce((s, it) => s + (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0), 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (items.some(it => !it.producto_id || it.cantidad <= 0 || it.precio_unitario <= 0)) {
            toast.error('Completa todos los productos del detalle');
            return;
        }
        const detalles = items.map(it => ({
            producto_id: parseInt(it.producto_id),
            cantidad: parseFloat(it.cantidad),
            precio_unitario: parseFloat(it.precio_unitario),
            subtotal: parseFloat(it.cantidad) * parseFloat(it.precio_unitario),
        }));
        try {
            await api.post('/compras', {
                ...form,
                proveedor_id: form.proveedor_id ? parseInt(form.proveedor_id) : null,
                subtotal: parseFloat(subtotal.toFixed(2)),
                igv: parseFloat(igv.toFixed(2)),
                total: parseFloat(total.toFixed(2)),
                detalles,
            });
            toast.success('Compra registrada y stock actualizado');
            setModal(false);
            setForm({ proveedor_id: '', numero_factura: '', fecha_compra: new Date().toISOString().split('T')[0], estado: 'recibida', observaciones: '' });
            setItems([{ producto_id: '', cantidad: 1, precio_unitario: 0 }]);
            load();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al registrar compra');
        }
    };

    const filtered = compras.filter(c =>
        c.numero_factura?.toLowerCase().includes(search.toLowerCase()) ||
        c.proveedor?.nombre?.toLowerCase().includes(search.toLowerCase())
    );

    const estadoChip = (e) => ({
        recibida: 'chip-success',
        pendiente: 'chip-warning',
        cancelada: 'chip-error',
    }[e] || 'chip-info');

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Compras</div>
                    <div className="page-subtitle">{compras.length} compras registradas</div>
                </div>
                <button className="btn btn-primary" onClick={() => setModal(true)}>
                    <Plus size={14} /> Nueva Compra
                </button>
            </div>

            <div className="card">
                <div style={{ paddingBottom: 16 }}>
                    <div className="search-bar">
                        <Search size={14} />
                        <input placeholder="Buscar por factura o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr><th>#</th><th>N° Factura</th><th>Proveedor</th><th>Fecha</th><th>Estado</th><th>Subtotal</th><th>IGV</th><th>Total</th><th>Acc.</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9}><div className="loader-page"><div className="loader" /></div></td></tr>
                            ) : filtered.map(c => (
                                <tr key={c.id}>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.id}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--orange)' }}>{c.numero_factura || '—'}</td>
                                    <td>{c.proveedor?.nombre || 'Sin proveedor'}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {c.fecha_compra ? new Date(c.fecha_compra).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                    </td>
                                    <td><span className={`chip ${estadoChip(c.estado)}`}>{c.estado}</span></td>
                                    <td>S/. {parseFloat(c.subtotal || 0).toFixed(2)}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>S/. {parseFloat(c.igv || 0).toFixed(2)}</td>
                                    <td style={{ fontWeight: 700 }}>S/. {parseFloat(c.total || 0).toFixed(2)}</td>
                                    <td>
                                        <button className="btn btn-sm btn-secondary" onClick={() => setDetalle(c)}>
                                            <Eye size={12} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={9}><div className="empty-state"><ShoppingBag size={36} /><h3>Sin compras registradas</h3></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal nueva compra */}
            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
                    <div className="modal modal-lg" style={{ maxWidth: 760 }}>
                        <div className="modal-header">
                            <div className="modal-title">Nueva Compra</div>
                            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {/* Cabecera */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Proveedor</label>
                                        <select className="form-control" value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })}>
                                            <option value="">Sin proveedor</option>
                                            {proveedores.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">N° Factura</label>
                                        <input className="form-control" value={form.numero_factura} onChange={e => setForm({ ...form, numero_factura: e.target.value })} placeholder="F001-0001" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Fecha de Compra</label>
                                        <input className="form-control" type="date" value={form.fecha_compra} onChange={e => setForm({ ...form, fecha_compra: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Estado</label>
                                        <select className="form-control" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                                            <option value="recibida">Recibida</option>
                                            <option value="pendiente">Pendiente</option>
                                            <option value="cancelada">Cancelada</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Observaciones</label>
                                    <textarea className="form-control" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} />
                                </div>

                                {/* Detalle de productos */}
                                <div style={{ marginTop: 8, marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <div className="form-label" style={{ marginBottom: 0 }}>Detalle de Productos *</div>
                                        <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>
                                            <Plus size={11} /> Agregar producto
                                        </button>
                                    </div>
                                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                                        <table className="table" style={{ marginBottom: 0 }}>
                                            <thead>
                                                <tr>
                                                    <th>Producto</th>
                                                    <th style={{ width: 90 }}>Cantidad</th>
                                                    <th style={{ width: 110 }}>Precio Unit.</th>
                                                    <th style={{ width: 100 }}>Subtotal</th>
                                                    <th style={{ width: 40 }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((it, i) => (
                                                    <tr key={i}>
                                                        <td>
                                                            <select className="form-control" style={{ margin: 0 }} value={it.producto_id} onChange={e => updateItem(i, 'producto_id', e.target.value)} required>
                                                                <option value="">Seleccionar...</option>
                                                                {productos.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input className="form-control" style={{ margin: 0 }} type="number" min="0.01" step="0.01" value={it.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)} required />
                                                        </td>
                                                        <td>
                                                            <input className="form-control" style={{ margin: 0 }} type="number" min="0.01" step="0.01" value={it.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', e.target.value)} required />
                                                        </td>
                                                        <td style={{ fontWeight: 600, color: 'var(--orange)' }}>
                                                            S/. {((parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0)).toFixed(2)}
                                                        </td>
                                                        <td>
                                                            {items.length > 1 && (
                                                                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem(i)}>
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Totales */}
                                <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '14px 16px', marginTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <span>Subtotal (sin IGV)</span>
                                        <span>S/. {subtotal.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <span>IGV (18%)</span>
                                        <span>S/. {igv.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, color: 'var(--orange)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                                        <span>Total</span>
                                        <span>S/. {total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Registrar Compra</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal detalle */}
            {detalle && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
                    <div className="modal modal-lg">
                        <div className="modal-header">
                            <div className="modal-title">Detalle Compra — {detalle.numero_factura || `#${detalle.id}`}</div>
                            <button className="modal-close" onClick={() => setDetalle(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row" style={{ marginBottom: 16 }}>
                                <div><span className="form-label">Proveedor</span><div style={{ fontWeight: 600 }}>{detalle.proveedor?.nombre || '—'}</div></div>
                                <div><span className="form-label">Fecha</span><div>{detalle.fecha_compra ? new Date(detalle.fecha_compra).toLocaleDateString('es') : '—'}</div></div>
                                <div><span className="form-label">Estado</span><div><span className={`chip ${estadoChip(detalle.estado)}`}>{detalle.estado}</span></div></div>
                            </div>
                            {detalle.observaciones && <div style={{ marginBottom: 14, color: 'var(--text-muted)', fontSize: 13 }}>📝 {detalle.observaciones}</div>}
                            <div className="table-container">
                                <table className="table">
                                    <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>
                                    <tbody>
                                        {detalle.detalles?.map((d, i) => (
                                            <tr key={i}>
                                                <td>{d.producto?.nombre}</td>
                                                <td>{d.cantidad}</td>
                                                <td>S/. {parseFloat(d.precio_unitario).toFixed(2)}</td>
                                                <td style={{ fontWeight: 600 }}>S/. {parseFloat(d.subtotal).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>IGV: S/. {parseFloat(detalle.igv || 0).toFixed(2)}</div>
                                <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--orange)', marginTop: 4 }}>Total: S/. {parseFloat(detalle.total || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
