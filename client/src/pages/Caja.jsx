import { useState, useEffect } from 'react';
import { Plus, Lock, Unlock, DollarSign, TrendingDown, Printer } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useConfigStore from '../store/configStore';
import { METODOS_PAGO } from '../utils/delivery';

export default function Caja() {
    const [cajaActiva, setCajaActiva] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saldoInicial, setSaldoInicial] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [montoContado, setMontoContado] = useState('');
    const [conceptoEgreso, setConceptoEgreso] = useState('');
    const [montoEgreso, setMontoEgreso] = useState('');
    const [tab, setTab] = useState('estado'); // 'estado' | 'egresos' | 'historial'

    const { config } = useConfigStore();
    const moneda = config?.moneda || 'S/.';

    const load = async () => {
        const [activa, hist, egr] = await Promise.all([
            api.get('/caja/activa'),
            api.get('/caja'),
            api.get('/caja/egresos'),
        ]);
        setCajaActiva(activa.data.caja);
        setHistorial(hist.data.cajas);
        setEgresos(egr.data.egresos);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const abrir = async () => {
        if (!saldoInicial) return toast.error('Ingresa el saldo inicial');
        try { await api.post('/caja/abrir', { saldo_inicial: saldoInicial }); toast.success('Caja abierta'); load(); }
        catch (err) { toast.error(err.response?.data?.msg || 'Error'); }
    };

    const cerrar = async () => {
        if (porCobrar.cantidad > 0) return toast.error(`Hay ${porCobrar.cantidad} delivery en curso. Entrégalos o cancélalos en Pedidos antes de cerrar.`);
        if (montoContado === '' && !window.confirm('No ingresaste el efectivo contado. ¿Cerrar la caja sin arqueo?')) return;
        if (montoContado !== '' && !window.confirm(`¿Cerrar caja con ${moneda} ${parseFloat(montoContado).toFixed(2)} contados (diferencia ${moneda} ${diferencia.toFixed(2)})?`)) return;
        try {
            await api.put(`/caja/${cajaActiva.id}/cerrar`, { observaciones, monto_contado: montoContado });
            toast.success('Caja cerrada');
            setMontoContado('');
            setObservaciones('');
            load();
        } catch (err) { toast.error(err.response?.data?.msg || 'Error'); }
    };

    const registrarEgreso = async () => {
        if (!conceptoEgreso || !montoEgreso) return toast.error('Completa concepto y monto');
        if (!cajaActiva) return toast.error('No hay caja abierta');
        try {
            await api.post('/caja/egresos', { concepto: conceptoEgreso, monto: montoEgreso });
            toast.success('Egreso registrado');
            setConceptoEgreso('');
            setMontoEgreso('');
            load();
        } catch (err) { toast.error(err.response?.data?.msg || 'Error'); }
    };

    // Los montos vienen calculados del servidor. Solo el efectivo queda en el cajón:
    // Yape/Plin/tarjeta se muestran como referencia pero no suman al saldo esperado.
    const totalEgresos = parseFloat(cajaActiva?.total_egresos || 0);
    const ventasDelDia = parseFloat(cajaActiva?.total_ventas || 0);
    const ventasEfectivo = parseFloat(cajaActiva?.ventas_efectivo || 0);
    const saldoEsperado = parseFloat(cajaActiva?.efectivo_esperado || 0);
    const porCobrar = cajaActiva?.delivery_por_cobrar || { cantidad: 0, total: 0 };
    const porMetodo = cajaActiva?.por_metodo || [];
    const diferencia = montoContado === '' ? 0 : parseFloat(montoContado || 0) - saldoEsperado;

    const imprimirCierre = () => {
        if (!cajaActiva) return;
        const win = window.open('', '_blank', 'width=400,height=600');
        win.document.write(`
            <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cierre de Caja</title>
            <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:12px;color:#000}.center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;margin:3px 0}@media print{body{margin:0}}</style>
            </head><body>
            <div class="center bold" style="font-size:14px">${config?.empresa_nombre || 'Sistema Pollería'}</div>
            <div class="center bold" style="font-size:13px;margin:6px 0">RESUMEN DE CAJA</div>
            <div class="center">${new Date().toLocaleString('es-PE')}</div>
            <div class="line"></div>
            <div class="row"><span>Saldo inicial:</span><span>${moneda} ${parseFloat(cajaActiva.saldo_inicial).toFixed(2)}</span></div>
            ${porMetodo.map(m => `<div class="row"><span>Ventas ${METODOS_PAGO[m.metodo_pago] || m.metodo_pago} (${m.cantidad}):</span><span>${moneda} ${m.total.toFixed(2)}</span></div>`).join('')}
            <div class="row bold"><span>Total ventas:</span><span>${moneda} ${ventasDelDia.toFixed(2)}</span></div>
            <div class="line"></div>
            <div class="row"><span>Ventas en efectivo:</span><span>${moneda} ${ventasEfectivo.toFixed(2)}</span></div>
            <div class="row"><span>Total egresos:</span><span>- ${moneda} ${totalEgresos.toFixed(2)}</span></div>
            <div class="row bold"><span>Efectivo esperado:</span><span>${moneda} ${saldoEsperado.toFixed(2)}</span></div>
            ${montoContado !== '' ? `<div class="row"><span>Efectivo contado:</span><span>${moneda} ${parseFloat(montoContado).toFixed(2)}</span></div>
            <div class="row bold"><span>Diferencia:</span><span>${moneda} ${diferencia.toFixed(2)}</span></div>` : ''}
            ${porCobrar.cantidad > 0 ? `<div class="row"><span>Delivery por cobrar (${porCobrar.cantidad}):</span><span>${moneda} ${porCobrar.total.toFixed(2)}</span></div>` : ''}
            ${egresos.length > 0 ? `
                <div class="line"></div>
                <div class="bold" style="margin-bottom:4px">DETALLE EGRESOS</div>
                ${egresos.map(e => `<div class="row"><span>${e.concepto}</span><span>${moneda} ${parseFloat(e.monto).toFixed(2)}</span></div>`).join('')}
            ` : ''}
            <script>window.onload=()=>{window.print();window.close()}<\/script>
            </body></html>
        `);
        win.document.close();
    };

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Control de Caja</div></div>
                {cajaActiva && (
                    <button className="btn btn-secondary" onClick={imprimirCierre}>
                        <Printer size={14} /> Imprimir Resumen
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[['estado', 'Estado'], ['egresos', 'Egresos/Retiros'], ['historial', 'Historial']].map(([k, l]) => (
                    <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(k)}>{l}</button>
                ))}
            </div>

            {/* Tab: Estado */}
            {tab === 'estado' && (
                <div className="grid-2 mb-4">
                    {/* Estado caja */}
                    <div className="card">
                        <div className="card-header"><div className="card-title">Estado Actual de Caja</div></div>
                        {cajaActiva ? (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(86,211,100,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Unlock size={22} color="var(--accent-green)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-green)' }}>Caja ABIERTA</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Desde: {new Date(cajaActiva.fecha_apertura).toLocaleString('es')}</div>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Saldo inicial:</span>
                                        <span style={{ fontWeight: 600 }}>{moneda} {parseFloat(cajaActiva.saldo_inicial).toFixed(2)}</span>
                                    </div>
                                    {porMetodo.map(m => (
                                        <div key={m.metodo_pago} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                                {METODOS_PAGO[m.metodo_pago] || m.metodo_pago} ({m.cantidad}){m.metodo_pago !== 'efectivo' && ' · no entra al cajón'}:
                                            </span>
                                            <span style={{ fontWeight: 600, color: m.metodo_pago === 'efectivo' ? 'var(--accent-green)' : 'var(--text-muted)' }}>{moneda} {m.total.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Total ventas del turno:</span>
                                        <span style={{ fontWeight: 600 }}>{moneda} {ventasDelDia.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Egresos:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>- {moneda} {totalEgresos.toFixed(2)}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 700, fontSize: 14 }}>Efectivo esperado en caja:</span>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-pink)' }}>{moneda} {saldoEsperado.toFixed(2)}</span>
                                    </div>
                                </div>
                                {porCobrar.cantidad > 0 && (
                                    <div style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid var(--accent-orange, #fb923c)', borderRadius: 'var(--radius)', padding: 10, marginBottom: 14, fontSize: 12 }}>
                                        🛵 {porCobrar.cantidad} delivery en curso por {moneda} {porCobrar.total.toFixed(2)}. Se suman a la caja cuando se marcan como entregados.
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Efectivo contado (arqueo)</label>
                                    <input className="form-control" type="number" step="0.10" min="0" placeholder={saldoEsperado.toFixed(2)} value={montoContado} onChange={e => setMontoContado(e.target.value)} />
                                    {montoContado !== '' && (
                                        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: Math.abs(diferencia) < 0.05 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                            {Math.abs(diferencia) < 0.05 ? '✔ Cuadra exacto' : diferencia > 0 ? `Sobrante: ${moneda} ${diferencia.toFixed(2)}` : `Faltante: ${moneda} ${Math.abs(diferencia).toFixed(2)}`}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group"><label className="form-label">Observaciones de cierre</label><textarea className="form-control" rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} /></div>
                                <button className="btn btn-primary btn-block" onClick={cerrar}><Lock size={14} /> Cerrar Caja</button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(248,81,73,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Lock size={22} color="var(--accent-red)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-red)' }}>Caja CERRADA</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Abre la caja para registrar ventas</div>
                                    </div>
                                </div>
                                <div className="form-group"><label className="form-label">Saldo inicial ({moneda})</label><input className="form-control" type="number" step="0.01" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} placeholder="0.00" /></div>
                                <button className="btn btn-primary btn-block" onClick={abrir}><Unlock size={14} /> Abrir Caja</button>
                            </div>
                        )}
                    </div>

                    {/* Mini historial */}
                    <div className="card">
                        <div className="card-header"><div className="card-title">Último historial</div></div>
                        <div style={{ overflow: 'auto', maxHeight: 340 }}>
                            {historial.slice(0, 10).map(c => (
                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(c.fecha_apertura).toLocaleDateString('es')}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Inicial: {moneda} {parseFloat(c.saldo_inicial).toFixed(2)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className={`chip ${c.estado === 'abierta' ? 'chip-success' : 'chip-info'}`}>{c.estado}</span>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)', marginTop: 4 }}>{moneda} {parseFloat(c.total_ventas || 0).toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Egresos */}
            {tab === 'egresos' && (
                <div>
                    {!cajaActiva && (
                        <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 16, color: 'var(--accent-red)', fontSize: 13, fontWeight: 600 }}>
                            ⚠ Debes abrir la caja para registrar egresos
                        </div>
                    )}
                    <div className="grid-2 mb-4">
                        <div className="card">
                            <div className="card-header"><div className="card-title">Registrar Egreso / Retiro</div></div>
                            <div className="form-group">
                                <label className="form-label">Concepto</label>
                                <input className="form-control" placeholder="Ej: Pago a proveedor, Gastos de limpieza..." value={conceptoEgreso} onChange={e => setConceptoEgreso(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Monto ({moneda})</label>
                                <input className="form-control" type="number" step="0.01" min="0" placeholder="0.00" value={montoEgreso} onChange={e => setMontoEgreso(e.target.value)} />
                            </div>
                            <button className="btn btn-primary btn-block" onClick={registrarEgreso} disabled={!cajaActiva}>
                                <TrendingDown size={14} /> Registrar Egreso
                            </button>
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Total Egresos del Turno</div>
                                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-red)' }}>{moneda} {totalEgresos.toFixed(2)}</span>
                            </div>
                            <div style={{ overflow: 'auto', maxHeight: 280 }}>
                                {egresos.length === 0 ? (
                                    <div className="empty-state"><TrendingDown size={30} /><p>Sin egresos registrados</p></div>
                                ) : egresos.map(e => (
                                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{e.concepto}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleString('es')}</div>
                                        </div>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-red)' }}>- {moneda} {parseFloat(e.monto).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Historial completo */}
            {tab === 'historial' && (
                <div className="card">
                    <div className="card-header"><div className="card-title">Historial de Cajas</div></div>
                    <div className="table-container">
                        <table className="table">
                            <thead><tr><th>Fecha apertura</th><th>Saldo inicial</th><th>Ventas</th><th>Efectivo esperado</th><th>Contado</th><th>Diferencia</th><th>Estado</th></tr></thead>
                            <tbody>
                                {historial.map(c => (
                                    <tr key={c.id}>
                                        <td>{new Date(c.fecha_apertura).toLocaleString('es')}</td>
                                        <td>{moneda} {parseFloat(c.saldo_inicial).toFixed(2)}</td>
                                        <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{moneda} {parseFloat(c.total_ventas || 0).toFixed(2)}</td>
                                        <td style={{ fontWeight: 700 }}>{moneda} {parseFloat(c.saldo_final || 0).toFixed(2)}</td>
                                        <td>{c.monto_contado != null ? `${moneda} ${parseFloat(c.monto_contado).toFixed(2)}` : '—'}</td>
                                        <td style={{ fontWeight: 600, color: c.diferencia == null ? 'var(--text-muted)' : Math.abs(c.diferencia) < 0.05 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                            {c.diferencia != null ? `${moneda} ${parseFloat(c.diferencia).toFixed(2)}` : '—'}
                                        </td>
                                        <td><span className={`chip ${c.estado === 'abierta' ? 'chip-success' : 'chip-info'}`}>{c.estado}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
