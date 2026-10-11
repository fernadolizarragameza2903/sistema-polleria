import { useState, useEffect } from 'react';
import { Warehouse, AlertCircle, RefreshCw, Plus, Minus, History } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Inventario() {
    const [productos, setProductos] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('all');
    const [tab, setTab] = useState('stock'); // 'stock' | 'movimientos'

    // Modal ajuste
    const [modalAjuste, setModalAjuste] = useState(null); // producto seleccionado
    const [tipoAjuste, setTipoAjuste] = useState('entrada');
    const [cantidadAjuste, setCantidadAjuste] = useState('');
    const [motivoAjuste, setMotivoAjuste] = useState('');
    const [savingAjuste, setSavingAjuste] = useState(false);

    const load = () => {
        Promise.all([
            api.get('/productos'),
            api.get('/productos/movimientos'),
        ]).then(([p, m]) => {
            setProductos(p.data.productos);
            setMovimientos(m.data.movimientos);
            setLoading(false);
        });
    };

    useEffect(() => { load(); }, []);

    const filtered = filtro === 'bajo' ? productos.filter(p => p.stock <= p.stock_minimo) : productos;

    const abrirAjuste = (p) => {
        setModalAjuste(p);
        setTipoAjuste('entrada');
        setCantidadAjuste('');
        setMotivoAjuste('');
    };

    const guardarAjuste = async () => {
        if (!cantidadAjuste || parseFloat(cantidadAjuste) <= 0) return toast.error('Ingresa una cantidad válida');
        setSavingAjuste(true);
        try {
            const res = await api.put(`/productos/${modalAjuste.id}/ajustar-stock`, {
                tipo: tipoAjuste,
                cantidad: cantidadAjuste,
                motivo: motivoAjuste || 'Ajuste manual',
            });
            toast.success(`Stock actualizado: ${res.data.stock_anterior} → ${res.data.stock_nuevo}`);
            setModalAjuste(null);
            load();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al ajustar stock');
        } finally {
            setSavingAjuste(false);
        }
    };

    const tipoChip = (tipo) => {
        if (tipo === 'entrada') return 'chip-success';
        if (tipo === 'salida') return 'chip-error';
        return 'chip-info';
    };

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Inventario</div><div className="page-subtitle">Control de stock en tiempo real</div></div>
                <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Actualizar</button>
            </div>

            {/* Stats */}
            <div className="grid-3 mb-4">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-blue-light)' }}><Warehouse size={20} color="var(--accent-blue)" /></div>
                    <div className="stat-info"><div className="stat-label">Total Productos</div><div className="stat-value">{productos.length}</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(86,211,100,0.15)' }}><Warehouse size={20} color="var(--accent-green)" /></div>
                    <div className="stat-info"><div className="stat-label">Con Stock Normal</div><div className="stat-value">{productos.filter(p => p.stock > p.stock_minimo).length}</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(248,81,73,0.15)' }}><AlertCircle size={20} color="var(--accent-red)" /></div>
                    <div className="stat-info"><div className="stat-label">Bajo Stock / Agotado</div><div className="stat-value">{productos.filter(p => p.stock <= p.stock_minimo).length}</div></div>
                    <span className="stat-badge badge-red">alerta</span>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className={`btn btn-sm ${tab === 'stock' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('stock')}>
                    <Warehouse size={13} /> Stock Actual
                </button>
                <button className={`btn btn-sm ${tab === 'movimientos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('movimientos')}>
                    <History size={13} /> Historial Movimientos
                </button>
            </div>

            {/* Tab: Stock */}
            {tab === 'stock' && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Stock de Productos</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className={`btn btn-sm ${filtro === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltro('all')}>Todos</button>
                            <button className={`btn btn-sm ${filtro === 'bajo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltro('bajo')}>⚠ Bajo stock</button>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead><tr><th>Producto</th><th>Categoría</th><th>Unidad</th><th>Stock Min.</th><th>Stock Actual</th><th>Estado</th><th>Ajustar</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={7}><div className="loader-page"><div className="loader" /></div></td></tr>
                                    : filtered.map(p => {
                                        const pct = Math.min(100, Math.round((p.stock / (p.stock_minimo * 3 || 1)) * 100));
                                        const color = p.stock === 0 ? 'var(--accent-red)' : p.stock <= p.stock_minimo ? 'var(--accent-yellow)' : 'var(--accent-green)';
                                        return (
                                            <tr key={p.id}>
                                                <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                                                <td><span className="chip chip-info">{p.categoria?.nombre || '—'}</span></td>
                                                <td style={{ color: 'var(--text-muted)' }}>{p.unidad}</td>
                                                <td>{p.stock_minimo}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="progress-bar" style={{ flex: 1 }}>
                                                            <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                                                        </div>
                                                        <span style={{ fontWeight: 700, minWidth: 30, color }}>{p.stock}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`chip ${p.stock === 0 ? 'chip-error' : p.stock <= p.stock_minimo ? 'chip-warning' : 'chip-success'}`}>
                                                        {p.stock === 0 ? '🔴 Agotado' : p.stock <= p.stock_minimo ? '🟡 Bajo' : '🟢 Normal'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="btn btn-sm btn-secondary" onClick={() => abrirAjuste(p)}>
                                                        <RefreshCw size={12} /> Ajustar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Movimientos */}
            {tab === 'movimientos' && (
                <div className="card">
                    <div className="card-header"><div className="card-title">Historial de Movimientos de Stock</div></div>
                    <div className="table-container">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock Ant.</th><th>Stock Nuevo</th><th>Motivo</th></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan={7}><div className="loader-page"><div className="loader" /></div></td></tr>
                                    : movimientos.length === 0 ? (
                                        <tr><td colSpan={7}><div className="empty-state"><History size={32} /><p>Sin movimientos registrados</p></div></td></tr>
                                    ) : movimientos.map(m => (
                                        <tr key={m.id}>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleString('es')}</td>
                                            <td style={{ fontWeight: 600 }}>{m.producto?.nombre || '—'}</td>
                                            <td><span className={`chip ${tipoChip(m.tipo)}`}>{m.tipo}</span></td>
                                            <td style={{ fontWeight: 600 }}>{parseFloat(m.cantidad).toFixed(2)}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{parseFloat(m.stock_anterior || 0).toFixed(2)}</td>
                                            <td style={{ fontWeight: 600, color: m.tipo === 'salida' ? 'var(--accent-red)' : 'var(--accent-green)' }}>{parseFloat(m.stock_nuevo || 0).toFixed(2)}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.motivo}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal ajuste de stock */}
            {modalAjuste && (
                <div className="modal-overlay" onClick={() => setModalAjuste(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Ajustar Stock — {modalAjuste.nombre}</h3>
                            <button className="modal-close" onClick={() => setModalAjuste(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Stock actual:</span>
                                <span style={{ fontWeight: 700, fontSize: 15 }}>{parseFloat(modalAjuste.stock).toFixed(2)} {modalAjuste.unidad}</span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tipo de ajuste</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className={`btn btn-sm ${tipoAjuste === 'entrada' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTipoAjuste('entrada')}>
                                        <Plus size={13} /> Entrada (suma)
                                    </button>
                                    <button className={`btn btn-sm ${tipoAjuste === 'salida' ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setTipoAjuste('salida')}>
                                        <Minus size={13} /> Salida (resta)
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cantidad a ajustar</label>
                                <input className="form-control" type="number" min="0" step="0.01" value={cantidadAjuste} onChange={e => setCantidadAjuste(e.target.value)} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Motivo del ajuste</label>
                                <input className="form-control" value={motivoAjuste} onChange={e => setMotivoAjuste(e.target.value)} placeholder="Ej: Merma, conteo físico, devolución..." />
                            </div>
                            {cantidadAjuste > 0 && (
                                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13 }}>
                                    Nuevo stock estimado: <strong style={{ color: tipoAjuste === 'salida' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                        {Math.max(0, parseFloat(modalAjuste.stock) + (tipoAjuste === 'salida' ? -parseFloat(cantidadAjuste) : parseFloat(cantidadAjuste))).toFixed(2)}
                                    </strong>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModalAjuste(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={guardarAjuste} disabled={savingAjuste}>
                                {savingAjuste ? <div className="loader" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <RefreshCw size={14} />}
                                {savingAjuste ? 'Guardando...' : 'Aplicar Ajuste'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
