import { useState, useEffect } from 'react';
import { Search, Eye, XCircle, ClipboardList, Printer } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import useConfigStore from '../store/configStore';

export default function Ventas() {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [detalle, setDetalle] = useState(null);
    const [confirm, setConfirm] = useState({ open: false, id: null, numero: '' });
    const { config } = useConfigStore();
    const moneda = config?.moneda || 'S/.';

    const load = () => {
        api.get('/ventas').then(r => setVentas(r.data.ventas)).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const anular = async () => {
        try {
            await api.put(`/ventas/${confirm.id}/anular`);
            toast.success(`Venta ${confirm.numero} anulada correctamente`);
            load();
        } catch { toast.error('Error al anular venta'); }
        setConfirm({ open: false, id: null, numero: '' });
    };

    const imprimirTicket = async (v) => {
        if (config?.printer_enabled === 'true') {
            const toastId = toast.loading('Reimprimiendo ticket...');
            try {
                await api.post(`/ventas/${v.id}/imprimir?reimpresion=true`);
                toast.success('Ticket enviado a impresora', { id: toastId });
            } catch (error) {
                toast.error(error.response?.data?.msg || 'Error al conectar con la impresora', { id: toastId });
            }
            return;
        }

        const win = window.open('', '_blank', 'width=400,height=600');
        const empresa = config?.empresa_nombre || 'Sistema Pollería';
        const ruc = config?.empresa_ruc || '';
        const igv = parseFloat(v.igv || 0);
        const sub = parseFloat(v.subtotal || 0);
        const descuento = parseFloat(v.descuento || 0);
        const total = parseFloat(v.total || 0);
        const monto = parseFloat(v.monto_recibido || total);
        const vuelto = parseFloat(v.vuelto || 0);

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
            <div class="line"></div>
            <div class="bold" style="margin-bottom:4px">PRODUCTOS</div>
            ${(v.detalles || []).map(d => `
                <div class="row"><span style="flex:1">${d.producto?.nombre || ''}</span></div>
                <div class="row">
                    <span>${d.cantidad} x ${moneda} ${parseFloat(d.precio_unitario).toFixed(2)}</span>
                    <span>${moneda} ${parseFloat(d.subtotal).toFixed(2)}</span>
                </div>`).join('')}
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

    const filtered = ventas.filter(v =>
        v.numero_comprobante?.toLowerCase().includes(search.toLowerCase()) ||
        v.cliente?.nombre?.toLowerCase().includes(search.toLowerCase())
    );

    const estadoChip = (e) => ({ completada: 'chip-success', anulada: 'chip-error', pendiente: 'chip-warning' }[e] || 'chip-info');
    const tipoColor = (t) => ({ local: 'badge-orange', llevar: 'badge-blue', delivery: 'badge-cyan' }[t] || 'badge-blue');

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Historial de Ventas</div><div className="page-subtitle">{ventas.length} ventas registradas</div></div>
            </div>
            <div className="card">
                <div style={{ paddingBottom: 16 }}>
                    <div className="search-bar"><Search size={14} /><input placeholder="Buscar por comprobante o cliente..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead><tr><th>Comprobante</th><th>Tipo</th><th>Cliente</th><th>Cajero</th><th>Pago</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Acc.</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan={9}><div className="loader-page"><div className="loader" /></div></td></tr>
                                : filtered.map(v => (
                                    <tr key={v.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--orange)' }}>{v.numero_comprobante}</td>
                                        <td><span className={`stat-badge ${tipoColor(v.tipo_venta)}`}>{v.tipo_venta}</span></td>
                                        <td>{v.cliente?.nombre || 'General'}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{v.usuario?.nombre}</td>
                                        <td><span className="chip chip-info">{v.metodo_pago}</span></td>
                                        <td style={{ fontWeight: 700 }}>S/. {parseFloat(v.total).toFixed(2)}</td>
                                        <td><span className={`chip ${estadoChip(v.estado)}`}>{v.estado}</span></td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(v.created_at).toLocaleDateString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-sm btn-secondary" title="Ver detalle" onClick={() => setDetalle(v)}><Eye size={12} /></button>
                                                {v.estado === 'completada' && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            title="Reimprimir ticket"
                                                            onClick={() => imprimirTicket(v)}
                                                        >
                                                            <Printer size={12} />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            title="Anular venta"
                                                            onClick={() => setConfirm({ open: true, id: v.id, numero: v.numero_comprobante })}
                                                        >
                                                            <XCircle size={12} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            {!loading && filtered.length === 0 && <tr><td colSpan={9}><div className="empty-state"><ClipboardList size={36} /><h3>Sin ventas</h3></div></td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal detalle */}
            {detalle && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetalle(null)}>
                    <div className="modal">
                        <div className="modal-header"><div className="modal-title">Detalle Venta — {detalle.numero_comprobante}</div><button className="modal-close" onClick={() => setDetalle(null)}>✕</button></div>
                        <div className="modal-body">
                            <div className="table-container"><table className="table">
                                <thead><tr><th>Producto</th><th>Qty</th><th>Precio</th><th>Subtotal</th></tr></thead>
                                <tbody>{detalle.detalles?.map((d, i) => <tr key={i}><td>{d.producto?.nombre}</td><td>{d.cantidad}</td><td>S/. {parseFloat(d.precio_unitario).toFixed(2)}</td><td>S/. {parseFloat(d.subtotal).toFixed(2)}</td></tr>)}</tbody>
                            </table></div>
                            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12, textAlign: 'right' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>IGV: S/. {parseFloat(detalle.igv || 0).toFixed(2)}</div>
                                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--orange)' }}>Total: S/. {parseFloat(detalle.total).toFixed(2)}</div>
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
                message={`¿Estás seguro que deseas anular la venta "${confirm.numero}"? El stock de los productos será restituido y esta acción no se puede revertir.`}
                confirmLabel="Sí, anular venta"
                onConfirm={anular}
                onCancel={() => setConfirm({ open: false, id: null, numero: '' })}
            />
        </div>
    );
}
