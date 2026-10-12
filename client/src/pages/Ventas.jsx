import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, XCircle, ClipboardList, Printer } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import useConfigStore from '../store/configStore';
import useDebounce from '../hooks/useDebounce';
import { fechaLocalRelativa, fechaLocalISO } from '../utils/fechas';
import { canalInfo, nombreContacto, telefonoContacto, METODOS_PAGO } from '../utils/delivery';

const FILTROS_INICIALES = { desde: fechaLocalRelativa(-6), hasta: fechaLocalISO(), estado: '', tipo_venta: '', metodo_pago: '' };

export default function Ventas() {
    const [ventas, setVentas] = useState([]);
    const [paginacion, setPaginacion] = useState({ page: 1, paginas: 1, total: 0 });
    const [resumen, setResumen] = useState({ monto_completadas: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filtros, setFiltros] = useState(FILTROS_INICIALES);
    const [search, setSearch] = useState('');
    const busqueda = useDebounce(search);
    const [detalle, setDetalle] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null, numero: '' });
    const { config } = useConfigStore();
    const moneda = config?.moneda || 'S/.';

    // Solo se pide la página visible; el servidor filtra, cuenta y pagina.
    const load = useCallback(() => {
        setLoading(true);
        const params = { ...filtros, q: busqueda, page, limit: 25 };
        api.get('/ventas', { params })
            .then(r => { setVentas(r.data.ventas); setPaginacion(r.data.paginacion); setResumen(r.data.resumen); })
            .catch(() => toast.error('Error al cargar ventas'))
            .finally(() => setLoading(false));
    }, [filtros, busqueda, page]);

    useEffect(() => { load(); }, [load]);

    // Al cambiar un filtro o la búsqueda se vuelve a la primera página.
    const setFiltro = (campo, valor) => { setFiltros(f => ({ ...f, [campo]: valor })); setPage(1); };
    const buscar = (texto) => { setSearch(texto); setPage(1); };

    /** El detalle (productos, pedido) se trae solo cuando se necesita. */
    const obtenerDetalle = async (id) => (await api.get(`/ventas/${id}`)).data.venta;

    const verDetalle = async (v) => {
        try { setDetalle(await obtenerDetalle(v.id)); }
        catch { toast.error('No se pudo cargar el detalle'); }
    };

    const anular = async () => {
        try {
            await api.put(`/ventas/${confirm.id}/anular`);
            toast.success(`Venta ${confirm.numero} anulada correctamente`);
            load();
        } catch (err) { toast.error(err.response?.data?.msg || 'Error al anular venta'); }
        setConfirm({ open: false, id: null, numero: '' });
    };

    const imprimirTicket = async (resumenVenta) => {
        if (config?.printer_enabled === 'true') {
            const toastId = toast.loading('Reimprimiendo ticket...');
            try {
                await api.post(`/ventas/${resumenVenta.id}/imprimir?reimpresion=true`);
                toast.success('Ticket enviado a impresora', { id: toastId });
            } catch (error) {
                toast.error(error.response?.data?.msg || 'Error al conectar con la impresora', { id: toastId });
            }
            return;
        }

        // Abrir la ventana antes del await para que el navegador no la bloquee como popup.
        const win = window.open('', '_blank', 'width=400,height=600');
        let v;
        try { v = await obtenerDetalle(resumenVenta.id); }
        catch { win.close(); return toast.error('No se pudo cargar la venta'); }

        const empresa = config?.empresa_nombre || 'Sistema Pollería';
        const ruc = config?.empresa_ruc || '';
        const igv = parseFloat(v.igv || 0);
        const sub = parseFloat(v.subtotal || 0);
        const descuento = parseFloat(v.descuento || 0);
        const total = parseFloat(v.total || 0);
        const monto = parseFloat(v.monto_recibido || total);
        const vuelto = parseFloat(v.vuelto || 0);
        const pedido = v.Pedido;

        win.document.write(`
            <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket ${v.numero_comprobante}</title>
            <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:12px;color:#000}.center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;margin:3px 0}.titulo{font-size:15px;font-weight:bold;text-align:center;margin:6px 0}.total-row{font-size:14px;font-weight:bold}@media print{body{margin:0}}</style>
            </head><body>
            <div class="center bold" style="font-size:14px">${empresa}</div>
            ${ruc ? `<div class="center">RUC: ${ruc}</div>` : ''}
            <div class="line"></div>
            <div class="titulo">TICKET DE VENTA</div>
            <div class="center">${v.numero_comprobante}</div>
            <div class="center">${new Date(v.created_at).toLocaleString('es-PE')}</div>
            <div class="row"><span>Tipo:</span><span>${(v.tipo_venta || '').toUpperCase()}</span></div>
            <div class="row"><span>Cajero:</span><span>${v.usuario?.nombre || ''}</span></div>
            ${v.cliente?.nombre ? `<div class="row"><span>Cliente:</span><span>${v.cliente.nombre}</span></div>` : ''}
            ${pedido ? `
                <div class="row"><span>Pedido:</span><span>${pedido.numero_pedido}</span></div>
                ${pedido.contacto_telefono ? `<div class="row"><span>Teléfono:</span><span>${pedido.contacto_telefono}</span></div>` : ''}
                ${pedido.direccion_entrega ? `<div>Dir: ${pedido.direccion_entrega}</div>` : ''}
                ${pedido.referencia ? `<div>Ref: ${pedido.referencia}</div>` : ''}` : ''}
            <div class="line"></div>
            <div class="bold" style="margin-bottom:4px">PRODUCTOS</div>
            ${(v.detalles || []).map(d => `
                <div class="row"><span style="flex:1">${d.producto?.nombre || ''}</span></div>
                <div class="row">
                    <span>${d.cantidad} x ${moneda} ${parseFloat(d.precio_unitario).toFixed(2)}</span>
                    <span>${moneda} ${parseFloat(d.subtotal).toFixed(2)}</span>
                </div>`).join('')}
            ${pedido && parseFloat(pedido.costo_delivery) > 0 ? `<div class="row"><span>Delivery</span><span>${moneda} ${parseFloat(pedido.costo_delivery).toFixed(2)}</span></div>` : ''}
            <div class="line"></div>
            <div class="row"><span>Subtotal:</span><span>${moneda} ${sub.toFixed(2)}</span></div>
            <div class="row"><span>IGV (18%):</span><span>${moneda} ${igv.toFixed(2)}</span></div>
            ${descuento > 0 ? `<div class="row"><span>Descuento:</span><span>- ${moneda} ${descuento.toFixed(2)}</span></div>` : ''}
            <div class="line"></div>
            <div class="row total-row"><span>TOTAL:</span><span>${moneda} ${total.toFixed(2)}</span></div>
            <div class="row"><span>Pago (${v.metodo_pago}):</span><span>${moneda} ${monto.toFixed(2)}</span></div>
            ${vuelto > 0 ? `<div class="row"><span>Vuelto:</span><span>${moneda} ${vuelto.toFixed(2)}</span></div>` : ''}
            <div class="line"></div>
            <div class="center" style="margin-top:8px">¡Gracias por su compra!</div>
            <script>window.onload=()=>{window.print();window.close()}<\/script>
            </body></html>
        `);
        win.document.close();
    };

    const estadoChip = (e) => ({ completada: 'chip-success', anulada: 'chip-error', pendiente: 'chip-warning' }[e] || 'chip-info');
    const tipoColor = (t) => ({ local: 'badge-orange', llevar: 'badge-blue', delivery: 'badge-cyan' }[t] || 'badge-blue');
    const nombreCliente = (v) => v.cliente?.nombre || (v.Pedido ? `${nombreContacto(v.Pedido)}${v.Pedido.contacto_telefono ? ` · ${v.Pedido.contacto_telefono}` : ''}` : 'General');

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Historial de Ventas</div>
                    <div className="page-subtitle">
                        {paginacion.total} ventas en el filtro · {moneda} {resumen.monto_completadas.toFixed(2)} completadas
                    </div>
                </div>
            </div>
            <div className="card">
                {/* Filtros: se aplican en el servidor */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', paddingBottom: 16 }}>
                    <div className="search-bar" style={{ flex: '1 1 240px', margin: 0 }}>
                        <Search size={14} />
                        <input placeholder="Buscar por comprobante o nombre..." value={search} onChange={e => buscar(e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">Desde</label>
                        <input className="form-control" type="date" value={filtros.desde} onChange={e => setFiltro('desde', e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">Hasta</label>
                        <input className="form-control" type="date" value={filtros.hasta} onChange={e => setFiltro('hasta', e.target.value)} />
                    </div>
                    <select className="form-control" style={{ width: 'auto' }} value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)}>
                        <option value="">Todos los estados</option>
                        <option value="completada">Completadas</option>
                        <option value="pendiente">Pendientes (delivery en curso)</option>
                        <option value="anulada">Anuladas</option>
                    </select>
                    <select className="form-control" style={{ width: 'auto' }} value={filtros.tipo_venta} onChange={e => setFiltro('tipo_venta', e.target.value)}>
                        <option value="">Todo tipo</option>
                        <option value="local">Local</option>
                        <option value="llevar">Para llevar</option>
                        <option value="delivery">Delivery</option>
                    </select>
                    <select className="form-control" style={{ width: 'auto' }} value={filtros.metodo_pago} onChange={e => setFiltro('metodo_pago', e.target.value)}>
                        <option value="">Todo pago</option>
                        {Object.entries(METODOS_PAGO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setFiltros(FILTROS_INICIALES); buscar(''); }}>Limpiar</button>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>Comprobante</th><th>Tipo</th><th>Cliente</th><th>Cajero</th><th>Pago</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Acc.</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={9}><div className="loader-page"><div className="loader" /></div></td></tr>
                                : ventas.map(v => (
                                    <tr key={v.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--orange)' }}>{v.numero_comprobante}</td>
                                        <td>
                                            <span className={`stat-badge ${tipoColor(v.tipo_venta)}`}>{v.tipo_venta}</span>
                                            {v.Pedido && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{canalInfo(v.Pedido.canal).emoji} {v.Pedido.numero_pedido}</div>}
                                        </td>
                                        <td>{nombreCliente(v)}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{v.usuario?.nombre}</td>
                                        <td><span className="chip chip-info">{v.metodo_pago}</span></td>
                                        <td style={{ fontWeight: 700 }}>{moneda} {parseFloat(v.total).toFixed(2)}</td>
                                        <td><span className={`chip ${estadoChip(v.estado)}`}>{v.estado}</span></td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(v.created_at).toLocaleDateString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-sm btn-secondary" title="Ver detalle" onClick={() => verDetalle(v)}><Eye size={12} /></button>
                                                {v.estado !== 'anulada' && (
                                                    <>
                                                        <button className="btn btn-sm btn-secondary" title="Reimprimir ticket" onClick={() => imprimirTicket(v)}>
                                                            <Printer size={12} />
                                                        </button>
                                                        <button className="btn btn-sm btn-danger" title="Anular venta" onClick={() => setConfirm({ open: true, id: v.id, numero: v.numero_comprobante })}>
                                                            <XCircle size={12} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            {!loading && ventas.length === 0 && <tr><td colSpan={9}><div className="empty-state"><ClipboardList size={36} /><h3>Sin ventas</h3><p style={{ fontSize: 12 }}>Prueba ampliando el rango de fechas</p></div></td></tr>}
                        </tbody>
                    </table>
                </div>
                <Pagination page={paginacion.page} paginas={paginacion.paginas} total={paginacion.total} onChange={setPage} disabled={loading} />
            </div>

            {/* Modal detalle */}
            {detalle && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
                    <div className="modal">
                        <div className="modal-header"><div className="modal-title">Detalle Venta — {detalle.numero_comprobante}</div><button className="modal-close" onClick={() => setDetalle(null)}>✕</button></div>
                        <div className="modal-body">
                            {detalle.Pedido && (
                                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 14, fontSize: 13 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{canalInfo(detalle.Pedido.canal).emoji} Delivery {detalle.Pedido.numero_pedido} · {detalle.Pedido.estado}</div>
                                    <div>{nombreContacto({ ...detalle.Pedido, cliente: detalle.cliente })} {telefonoContacto({ ...detalle.Pedido, cliente: detalle.cliente }) && `· ${telefonoContacto({ ...detalle.Pedido, cliente: detalle.cliente })}`}</div>
                                    {detalle.Pedido.direccion_entrega && <div style={{ color: 'var(--text-muted)' }}>{detalle.Pedido.direccion_entrega}{detalle.Pedido.referencia && ` — ${detalle.Pedido.referencia}`}</div>}
                                </div>
                            )}
                            <div className="table-container"><table className="table">
                                <thead><tr><th>Producto</th><th>Qty</th><th>Precio</th><th>Subtotal</th></tr></thead>
                                <tbody>{detalle.detalles?.map((d, i) => <tr key={i}><td>{d.producto?.nombre}</td><td>{d.cantidad}</td><td>{moneda} {parseFloat(d.precio_unitario).toFixed(2)}</td><td>{moneda} {parseFloat(d.subtotal).toFixed(2)}</td></tr>)}</tbody>
                            </table></div>
                            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12, textAlign: 'right' }}>
                                {detalle.Pedido && parseFloat(detalle.Pedido.costo_delivery) > 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Delivery: {moneda} {parseFloat(detalle.Pedido.costo_delivery).toFixed(2)}</div>}
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>IGV: {moneda} {parseFloat(detalle.igv || 0).toFixed(2)}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                    Pago: {METODOS_PAGO[detalle.metodo_pago] || detalle.metodo_pago}
                                    {detalle.metodo_pago === 'efectivo' && ` · con ${moneda} ${parseFloat(detalle.monto_recibido || 0).toFixed(2)} · vuelto ${moneda} ${parseFloat(detalle.vuelto || 0).toFixed(2)}`}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--orange)' }}>Total: {moneda} {parseFloat(detalle.total).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm anulación */}
            <ConfirmModal
                open={confirm.open}
                type="warning"
                title="Anular Venta"
                message={`¿Estás seguro que deseas anular la venta "${confirm.numero}"? El stock de los productos será restituido y, si es un delivery en curso, el pedido se cancelará. Esta acción no se puede revertir.`}
                confirmLabel="Sí, anular venta"
                onConfirm={anular}
                onCancel={() => setConfirm({ open: false, id: null, numero: '' })}
            />
        </div>
    );
}
