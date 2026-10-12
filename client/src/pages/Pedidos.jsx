import { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, Search, Eye, RefreshCw, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import useConfigStore from '../store/configStore';
import useDebounce from '../hooks/useDebounce';
import { fechaLocalISO } from '../utils/fechas';
import { canalInfo, nombreContacto, telefonoContacto, linkWhatsApp, METODOS_PAGO } from '../utils/delivery';

const ESTADOS = [
    { value: 'pendiente', label: '⏳ Pendiente', chip: 'chip-warning' },
    { value: 'preparando', label: '🔥 Preparando', chip: 'chip-info' },
    { value: 'en_camino', label: '🛵 En Camino', chip: 'chip-info' },
    { value: 'entregado', label: '✅ Entregado', chip: 'chip-success' },
    { value: 'cancelado', label: '❌ Cancelado', chip: 'chip-error' },
];
const ACTIVOS = ['pendiente', 'preparando', 'en_camino'];
// Siguiente paso natural de cada estado (botón principal de la fila)
const SIGUIENTE = { pendiente: 'preparando', preparando: 'en_camino', en_camino: 'entregado' };
const REFRESCO_MS = 30000;

const minutosDesde = (fecha) => Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 60000));

export default function Pedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [conteos, setConteos] = useState({});
    const [paginacion, setPaginacion] = useState({ page: 1, paginas: 1, total: 0 });
    const [repartidores, setRepartidores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('activos');
    const [fecha, setFecha] = useState({ desde: fechaLocalISO(), hasta: fechaLocalISO() });
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const busqueda = useDebounce(search);
    const [detalle, setDetalle] = useState(null);
    const [confirmCancel, setConfirmCancel] = useState(null);
    const { config } = useConfigStore();
    const moneda = config?.moneda || 'S/.';

    const load = useCallback((silencioso = false) => {
        if (!silencioso) setLoading(true);
        // Los activos se muestran siempre (aunque sean de ayer); el historial respeta las fechas.
        const params = { estado: filtroEstado, q: busqueda, page, limit: 25, ...(filtroEstado === 'activos' ? {} : fecha) };
        return api.get('/pedidos', { params })
            .then(r => { setPedidos(r.data.pedidos); setConteos(r.data.conteos); setPaginacion(r.data.paginacion); })
            .catch(() => !silencioso && toast.error('Error al cargar pedidos'))
            .finally(() => setLoading(false));
    }, [filtroEstado, busqueda, page, fecha]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        api.get('/usuarios').then(u => setRepartidores((u.data.usuarios || []).filter(x => x.activo))).catch(() => {});
    }, []);
    // Refresco automático para ver los pedidos que entran por WhatsApp/llamada desde otra caja.
    useEffect(() => {
        const id = setInterval(() => load(true), REFRESCO_MS);
        return () => clearInterval(id);
    }, [load]);

    const cambiarFiltro = (estado) => { setFiltroEstado(estado); setPage(1); };

    const cambiarEstado = async (pedido, estado) => {
        try {
            await api.put(`/pedidos/${pedido.id}/estado`, { estado });
            toast.success(estado === 'entregado' ? `${pedido.numero_pedido} entregado y cobrado` : `${pedido.numero_pedido}: ${ESTADOS.find(e => e.value === estado)?.label}`);
            load(true);
        } catch (err) { toast.error(err.response?.data?.msg || 'Error al actualizar estado'); }
    };

    const asignarRepartidor = async (id, repartidor_id) => {
        try {
            await api.put(`/pedidos/${id}/estado`, { repartidor_id: repartidor_id || null });
            toast.success('Repartidor asignado');
            load(true);
        } catch { toast.error('Error al asignar repartidor'); }
    };

    const verDetalle = async (id) => {
        try { setDetalle((await api.get(`/pedidos/${id}`)).data.pedido); }
        catch { toast.error('No se pudo cargar el pedido'); }
    };

    const totalActivos = ACTIVOS.reduce((s, e) => s + (conteos[e] || 0), 0);

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Pedidos Delivery</div>
                    <div className="page-subtitle">Se crean desde Punto de Venta → 🛵 Delivery · se actualiza cada 30 s</div>
                </div>
                <button className="btn btn-secondary" onClick={() => load()}><RefreshCw size={14} /> Actualizar</button>
            </div>

            {/* Filtros por estado */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                {[{ value: 'activos', label: '🔔 En curso', cantidad: filtroEstado === 'activos' ? paginacion.total : totalActivos }, { value: '', label: 'Todos' }, ...ESTADOS].map(e => (
                    <div key={e.value} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', outline: filtroEstado === e.value ? '2px solid var(--accent-pink)' : 'none' }}
                        onClick={() => cambiarFiltro(e.value)}>
                        <span style={{ fontSize: 12 }}>{e.label}</span>
                        {(e.cantidad ?? conteos[e.value]) !== undefined && (filtroEstado !== 'activos' || e.value === 'activos' || ACTIVOS.includes(e.value)) && (
                            <span style={{ background: 'var(--accent-pink)', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{e.cantidad ?? conteos[e.value] ?? 0}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="card">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', paddingBottom: 14 }}>
                    <div className="search-bar" style={{ flex: '1 1 240px', margin: 0 }}>
                        <Search size={14} />
                        <input placeholder="Teléfono, nombre, dirección o N° de pedido..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    {filtroEstado !== 'activos' && (
                        <>
                            <div><label className="form-label">Desde</label><input className="form-control" type="date" value={fecha.desde} onChange={e => { setFecha(f => ({ ...f, desde: e.target.value })); setPage(1); }} /></div>
                            <div><label className="form-label">Hasta</label><input className="form-control" type="date" value={fecha.hasta} onChange={e => { setFecha(f => ({ ...f, hasta: e.target.value })); setPage(1); }} /></div>
                        </>
                    )}
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Pedido</th>
                                <th>Contacto</th>
                                <th>Entrega</th>
                                <th>Pago</th>
                                <th>Estado</th>
                                <th>Repartidor</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7}><div className="loader-page"><div className="loader" /></div></td></tr>
                            ) : pedidos.map(p => {
                                const estadoObj = ESTADOS.find(e => e.value === p.estado) || ESTADOS[0];
                                const activo = ACTIVOS.includes(p.estado);
                                const minutos = minutosDesde(p.created_at);
                                const atrasado = activo && minutos > (p.tiempo_estimado || 30);
                                const telefono = telefonoContacto(p);
                                const venta = p.venta;
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--accent-pink)' }}>{p.numero_pedido}</div>
                                            <div style={{ fontSize: 11, color: atrasado ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                                                {new Date(p.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                                {activo && <> · <Clock size={10} /> {minutos}/{p.tiempo_estimado} min{atrasado && ' ⚠'}</>}
                                            </div>
                                        </td>
                                        <td>
                                            <div>{canalInfo(p.canal).emoji} {nombreContacto(p)}</div>
                                            {telefono && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {telefono}{' '}
                                                    {linkWhatsApp(telefono) && <a href={linkWhatsApp(telefono)} target="_blank" rel="noreferrer" title="Escribir por WhatsApp"><MessageCircle size={11} /></a>}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 12, maxWidth: 220 }}>
                                            <div className="truncate">{p.direccion_entrega || '—'}</div>
                                            {p.referencia && <div className="truncate" style={{ color: 'var(--text-muted)' }}>{p.referencia}</div>}
                                        </td>
                                        <td style={{ fontSize: 12 }}>
                                            {venta ? (
                                                <>
                                                    <div style={{ fontWeight: 700 }}>{moneda} {parseFloat(venta.total).toFixed(2)}</div>
                                                    <div style={{ color: 'var(--text-muted)' }}>{METODOS_PAGO[venta.metodo_pago] || venta.metodo_pago}</div>
                                                    {venta.metodo_pago === 'efectivo' && parseFloat(venta.vuelto) > 0 && (
                                                        <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Paga con {parseFloat(venta.monto_recibido).toFixed(2)} · vuelto {parseFloat(venta.vuelto).toFixed(2)}</div>
                                                    )}
                                                    {venta.metodo_pago === 'tarjeta' && activo && <div style={{ color: 'var(--text-muted)' }}>💳 Llevar POS</div>}
                                                </>
                                            ) : '—'}
                                        </td>
                                        <td><span className={`chip ${estadoObj.chip}`}>{estadoObj.label}</span></td>
                                        <td>
                                            <select className="form-control" style={{ fontSize: 12, padding: '4px 8px', width: 140 }}
                                                value={p.repartidor_id || ''} disabled={!activo}
                                                onChange={e => asignarRepartidor(p.id, e.target.value)} title="Asignar repartidor">
                                                <option value="">— Sin asignar —</option>
                                                {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-sm btn-secondary" title="Ver detalle" onClick={() => verDetalle(p.id)}><Eye size={12} /></button>
                                                {SIGUIENTE[p.estado] && (
                                                    <button className="btn btn-sm btn-primary" onClick={() => cambiarEstado(p, SIGUIENTE[p.estado])}>
                                                        {ESTADOS.find(e => e.value === SIGUIENTE[p.estado]).label}
                                                    </button>
                                                )}
                                                {activo && (
                                                    <button className="btn btn-sm btn-danger" title="Cancelar pedido" onClick={() => setConfirmCancel(p)}>✕</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && pedidos.length === 0 && (
                                <tr><td colSpan={7}>
                                    <div className="empty-state">
                                        <ChefHat size={36} />
                                        <h3>Sin pedidos</h3>
                                        <p style={{ fontSize: 12 }}>
                                            {filtroEstado === 'activos' ? 'No hay pedidos en curso. Regístralos desde Punto de Venta → 🛵 Delivery.' : 'No hay pedidos con estos filtros.'}
                                        </p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination page={paginacion.page} paginas={paginacion.paginas} total={paginacion.total} onChange={setPage} disabled={loading} />
            </div>

            {/* Detalle del pedido */}
            {detalle && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">{canalInfo(detalle.canal).emoji} {detalle.numero_pedido}</div>
                            <button className="modal-close" onClick={() => setDetalle(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ fontSize: 13 }}>
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontWeight: 700 }}>{nombreContacto(detalle)} {telefonoContacto(detalle) && `· ${telefonoContacto(detalle)}`}</div>
                                <div>{detalle.direccion_entrega || 'Sin dirección'}{detalle.referencia && ` — ${detalle.referencia}`}</div>
                                {detalle.notas && <div style={{ marginTop: 6, color: 'var(--accent-orange, var(--orange))' }}>📝 {detalle.notas}</div>}
                                <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                                    Tomado por {detalle.usuario?.nombre || '—'} · {new Date(detalle.created_at).toLocaleString('es-PE')}
                                    {detalle.fecha_entrega && ` · entregado ${new Date(detalle.fecha_entrega).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`}
                                </div>
                            </div>
                            <div className="table-container"><table className="table">
                                <thead><tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                                <tbody>
                                    {detalle.venta?.detalles?.map(d => <tr key={d.id}><td>{d.producto?.nombre}</td><td>{d.cantidad}</td><td>{moneda} {parseFloat(d.subtotal).toFixed(2)}</td></tr>)}
                                    {parseFloat(detalle.costo_delivery) > 0 && <tr><td>Delivery</td><td>1</td><td>{moneda} {parseFloat(detalle.costo_delivery).toFixed(2)}</td></tr>}
                                </tbody>
                            </table></div>
                            {detalle.venta && (
                                <div style={{ textAlign: 'right', marginTop: 12 }}>
                                    <div style={{ color: 'var(--text-muted)' }}>
                                        {METODOS_PAGO[detalle.venta.metodo_pago]} · venta {detalle.venta.numero_comprobante} ({detalle.venta.estado})
                                    </div>
                                    {detalle.venta.metodo_pago === 'efectivo' && <div>Paga con {moneda} {parseFloat(detalle.venta.monto_recibido).toFixed(2)} · vuelto {moneda} {parseFloat(detalle.venta.vuelto).toFixed(2)}</div>}
                                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--orange)' }}>Total: {moneda} {parseFloat(detalle.venta.total).toFixed(2)}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!confirmCancel}
                type="danger"
                title="Cancelar pedido"
                message={`¿Cancelar el pedido ${confirmCancel?.numero_pedido}? La venta asociada se anulará y el stock se devolverá.`}
                confirmLabel="Sí, cancelar pedido"
                onConfirm={async () => { await cambiarEstado(confirmCancel, 'cancelado'); setConfirmCancel(null); }}
                onCancel={() => setConfirmCancel(null)}
            />
        </div>
    );
}
