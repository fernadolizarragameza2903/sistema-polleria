import { useState, useEffect, useRef } from 'react';
import { BarChart2, TrendingUp, Download, FileText, Printer, DollarSign, Users } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip } from 'chart.js';
import api from '../api/axios';
import useConfigStore from '../store/configStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

export default function Reportes() {
    const [data, setData] = useState(null);
    const [rentData, setRentData] = useState(null);
    const [clientesTop, setClientesTop] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rentLoading, setRentLoading] = useState(false);
    const [clientesLoading, setClientesLoading] = useState(false);
    const [tab, setTab] = useState('ventas'); // 'ventas' | 'rentabilidad' | 'clientes'
    const [desde, setDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
    const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0]);
    const { config } = useConfigStore();
    const moneda = config?.moneda || 'S/.';

    const load = () => {
        setLoading(true);
        api.get(`/reportes/resumen?desde=${desde}&hasta=${hasta}`)
            .then(r => setData(r.data.data))
            .finally(() => setLoading(false));
        setRentLoading(true);
        api.get(`/reportes/rentabilidad?desde=${desde}&hasta=${hasta}`)
            .then(r => setRentData(r.data.data))
            .catch(() => { })
            .finally(() => setRentLoading(false));

        setClientesLoading(true);
        api.get(`/reportes/clientes-top?desde=${desde}&hasta=${hasta}`)
            .then(r => setClientesTop(r.data.data))
            .catch(() => { })
            .finally(() => setClientesLoading(false));
    };

    useEffect(() => { load(); }, []);

    const ventasPorDia = data?.ventasPorDia || [];
    const totalVentas = parseFloat(data?.totalVentas?.total_sum || 0);
    const numTransacciones = parseInt(data?.totalVentas?.count || 0);
    const ticketPromedio = numTransacciones > 0 ? (totalVentas / numTransacciones) : 0;

    const barData = {
        labels: ventasPorDia.map(d => new Date(d.dia).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })),
        datasets: [{ label: `Ventas ${moneda}`, data: ventasPorDia.map(d => parseFloat(d.total || 0)), backgroundColor: '#e91e8c', borderRadius: 6, borderSkipped: false }],
    };

    const ventasPorMetodo = data?.ventasPorMetodo || [];
    const topProductos = data?.topProductos || [];

    const exportarPDF = () => {
        const win = window.open('', '_blank', 'width=900,height=700');
        const empresa = config?.empresa_nombre || 'Sistema Pollería';
        const ruc = config?.empresa_ruc ? `RUC: ${config.empresa_ruc}` : '';

        const filasPorDia = ventasPorDia.map((d, i) => `
            <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
                <td>${new Date(d.dia).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td style="text-align:center">${d.count || 0}</td>
                <td style="text-align:right;font-weight:600">${moneda} ${parseFloat(d.total || 0).toFixed(2)}</td>
            </tr>`).join('');

        const filasTop = topProductos.map((p, i) => `
            <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
                <td style="text-align:center">#${i + 1}</td>
                <td>${p.producto?.nombre || 'N/A'}</td>
                <td style="text-align:center">${parseFloat(p.total_cantidad || 0).toFixed(0)} uds.</td>
                <td style="text-align:right;font-weight:600;color:#16a34a">${moneda} ${parseFloat(p.total_ventas || 0).toFixed(2)}</td>
            </tr>`).join('');

        const filasMetodo = ventasPorMetodo.map(m => `
            <tr>
                <td>${m.metodo_pago}</td>
                <td style="text-align:center">${m.count || 0}</td>
                <td style="text-align:right;font-weight:600">${moneda} ${parseFloat(m.total || 0).toFixed(2)}</td>
            </tr>`).join('');

        win.document.write(`
            <!DOCTYPE html><html><head><meta charset="UTF-8">
            <title>Reporte de Ventas</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 30px; }
                .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e91e8c; padding-bottom: 16px; }
                .header h1 { font-size: 22px; color: #e91e8c; }
                .header p { color: #666; font-size: 12px; margin-top: 4px; }
                .periodo { background: #fff5f9; border: 1px solid #f9d0e5; border-radius: 6px; padding: 10px 16px; margin-bottom: 20px; font-size: 13px; }
                .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 24px; }
                .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
                .stat-val { font-size: 22px; font-weight: 700; color: #e91e8c; }
                .stat-lbl { font-size: 11px; color: #666; margin-top: 4px; }
                h2 { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 8px; border-left: 4px solid #e91e8c; padding-left: 10px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
                th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: left; }
                td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
                .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
                @media print { body { padding: 15px; } }
            </style>
            </head><body>
            <div class="header">
                <h1>${empresa}</h1>
                ${ruc ? `<p>${ruc}</p>` : ''}
                <p style="font-size:15px;font-weight:700;margin-top:8px">REPORTE DE VENTAS</p>
            </div>
            <div class="periodo">
                📅 Período: <strong>${new Date(desde).toLocaleDateString('es-PE')} — ${new Date(hasta).toLocaleDateString('es-PE')}</strong>
                &nbsp;&nbsp; | &nbsp;&nbsp; Generado: ${new Date().toLocaleString('es-PE')}
            </div>
            <div class="stats">
                <div class="stat"><div class="stat-val">${moneda} ${totalVentas.toFixed(2)}</div><div class="stat-lbl">Total Ventas</div></div>
                <div class="stat"><div class="stat-val">${numTransacciones}</div><div class="stat-lbl">Transacciones</div></div>
                <div class="stat"><div class="stat-val">${moneda} ${ticketPromedio.toFixed(2)}</div><div class="stat-lbl">Ticket Promedio</div></div>
            </div>

            ${ventasPorDia.length > 0 ? `
            <h2>Ventas por Día</h2>
            <table><thead><tr><th>Fecha</th><th style="text-align:center">Transacciones</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${filasPorDia}</tbody></table>` : ''}

            ${ventasPorMetodo.length > 0 ? `
            <h2>Ventas por Método de Pago</h2>
            <table><thead><tr><th>Método</th><th style="text-align:center">Transacciones</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${filasMetodo}</tbody></table>` : ''}

            ${topProductos.length > 0 ? `
            <h2>Top Productos Vendidos</h2>
            <table><thead><tr><th style="text-align:center">#</th><th>Producto</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Ingresos</th></tr></thead>
            <tbody>${filasTop}</tbody></table>` : ''}

            <div class="footer">Reporte generado por ${empresa} — ${new Date().getFullYear()}</div>
            <script>window.onload=()=>{window.print()}<\/script>
            </body></html>
        `);
        win.document.close();
    };

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Reportes</div><div className="page-subtitle">Análisis financiero por período</div></div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {tab === 'ventas' && data && (
                        <button className="btn btn-secondary" onClick={exportarPDF}>
                            <Printer size={14} /> Exportar PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button className={`btn btn-sm ${tab === 'ventas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('ventas')}>
                    <BarChart2 size={13} /> Ventas
                </button>
                <button className={`btn btn-sm ${tab === 'rentabilidad' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('rentabilidad')}>
                    <DollarSign size={13} /> Rentabilidad
                </button>
                <button className={`btn btn-sm ${tab === 'clientes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('clientes')}>
                    <Users size={13} /> Clientes Top
                </button>
            </div>

            {/* Filtros */}
            <div className="card mb-4">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Desde</label>
                        <input className="form-control" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Hasta</label>
                        <input className="form-control" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={load}><TrendingUp size={14} /> Generar</button>
                </div>
            </div>

            {loading ? <div className="loader-page"><div className="loader" /></div> : (
                <>
                    {/* ===== TAB: VENTAS ===== */}
                    {tab === 'ventas' && (<>
                        <div className="grid-3 mb-4">
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'var(--accent-pink-light)' }}><BarChart2 size={20} color="var(--accent-pink)" /></div>
                                <div className="stat-info"><div className="stat-label">Total Ventas</div><div className="stat-value">{moneda} {totalVentas.toFixed(2)}</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'var(--accent-blue-light)' }}><FileText size={20} color="var(--accent-blue)" /></div>
                                <div className="stat-info"><div className="stat-label">N° Transacciones</div><div className="stat-value">{numTransacciones}</div></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'var(--accent-cyan-light)' }}><TrendingUp size={20} color="var(--accent-cyan)" /></div>
                                <div className="stat-info"><div className="stat-label">Ticket Promedio</div><div className="stat-value">{moneda} {ticketPromedio.toFixed(2)}</div></div>
                            </div>
                        </div>

                        {/* Gráfico ventas */}
                        <div className="card mb-4">
                            <div className="card-header"><div className="card-title">Ventas por Día</div></div>
                            <div style={{ height: 250 }}>
                                <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e7681', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e7681' } } } }} />
                            </div>
                        </div>

                        {/* Métodos de pago + top productos */}
                        <div className="grid-2 mb-4">
                            {/* Métodos de pago */}
                            <div className="card">
                                <div className="card-header"><div className="card-title">Por Método de Pago</div></div>
                                <div className="table-container">
                                    <table className="table">
                                        <thead><tr><th>Método</th><th>Transacciones</th><th>Total</th></tr></thead>
                                        <tbody>
                                            {ventasPorMetodo.length === 0 ? (
                                                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin datos</td></tr>
                                            ) : ventasPorMetodo.map((m, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{m.metodo_pago}</td>
                                                    <td>{m.count || 0}</td>
                                                    <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{moneda} {parseFloat(m.total || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Top productos */}
                            <div className="card">
                                <div className="card-header"><div className="card-title">Top Productos</div></div>
                                <div className="table-container">
                                    <table className="table">
                                        <thead><tr><th>#</th><th>Producto</th><th>Cant.</th><th>Ingresos</th></tr></thead>
                                        <tbody>{topProductos.map((p, i) => (
                                            <tr key={i}>
                                                <td><span className="stat-badge badge-pink">#{i + 1}</span></td>
                                                <td style={{ fontWeight: 600 }}>{p.producto?.nombre || 'N/A'}</td>
                                                <td>{parseFloat(p.total_cantidad || 0).toFixed(0)} uds.</td>
                                                <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{moneda} {parseFloat(p.total_ventas || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>)}

                    {/* ===== TAB: RENTABILIDAD ===== */}
                    {tab === 'rentabilidad' && (
                        rentLoading ? <div className="loader-page"><div className="loader" /></div> : (
                            <>
                                {/* Stats rentabilidad */}
                                <div className="grid-3 mb-4">
                                    <div className="stat-card">
                                        <div className="stat-icon" style={{ background: 'var(--accent-green-light)' }}><DollarSign size={20} color="var(--accent-green)" /></div>
                                        <div className="stat-info">
                                            <div className="stat-label">Total Ventas</div>
                                            <div className="stat-value">{moneda} {parseFloat(rentData?.ventas?.total || 0).toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon" style={{ background: 'rgba(248,81,73,0.15)' }}><TrendingUp size={20} color="var(--accent-red)" /></div>
                                        <div className="stat-info">
                                            <div className="stat-label">Total Compras</div>
                                            <div className="stat-value">{moneda} {parseFloat(rentData?.compras?.total || 0).toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon" style={{ background: 'var(--accent-pink-light)' }}><BarChart2 size={20} color="var(--accent-pink)" /></div>
                                        <div className="stat-info">
                                            <div className="stat-label">Margen Bruto</div>
                                            <div className="stat-value" style={{ color: parseFloat(rentData?.margen_bruto || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                {moneda} {parseFloat(rentData?.margen_bruto || 0).toFixed(2)}
                                            </div>
                                        </div>
                                        <span className="stat-badge badge-pink">{rentData?.margen_pct || 0}%</span>
                                    </div>
                                </div>

                                {/* Comparativa visual */}
                                <div className="card mb-4">
                                    <div className="card-header"><div className="card-title">Ventas vs Compras — Margen Bruto</div></div>
                                    <div style={{ padding: '8px 0' }}>
                                        {(() => {
                                            const tv = parseFloat(rentData?.ventas?.total || 0);
                                            const tc = parseFloat(rentData?.compras?.total || 0);
                                            const max = Math.max(tv, tc, 1);
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                            <span style={{ fontWeight: 600 }}>Ventas</span>
                                                            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{moneda} {tv.toFixed(2)}</span>
                                                        </div>
                                                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(tv / max) * 100}%`, background: 'var(--accent-green)' }} /></div>
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                            <span style={{ fontWeight: 600 }}>Compras</span>
                                                            <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{moneda} {tc.toFixed(2)}</span>
                                                        </div>
                                                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(tc / max) * 100}%`, background: 'var(--accent-red)' }} /></div>
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                            <span style={{ fontWeight: 700 }}>Margen Bruto</span>
                                                            <span style={{ color: 'var(--accent-pink)', fontWeight: 700 }}>{moneda} {parseFloat(rentData?.margen_bruto || 0).toFixed(2)} ({rentData?.margen_pct || 0}%)</span>
                                                        </div>
                                                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(Math.max(0, parseFloat(rentData?.margen_bruto || 0)) / max) * 100}%`, background: 'var(--accent-pink)' }} /></div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Margen por producto */}
                                <div className="card">
                                    <div className="card-header"><div className="card-title">Margen por Producto (Top 10)</div></div>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead><tr><th>Producto</th><th>Cant. Vendida</th><th>Ingreso Venta</th><th>Costo Total</th><th>Margen</th><th>% Margen</th></tr></thead>
                                            <tbody>
                                                {(rentData?.productosMargen || []).length === 0 ? (
                                                    <tr><td colSpan={6}><div className="empty-state"><BarChart2 size={30} /><p>Sin datos en el período</p></div></td></tr>
                                                ) : (rentData?.productosMargen || []).map((p, i) => (
                                                    <tr key={i}>
                                                        <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                                                        <td>{parseFloat(p.cantidad_vendida).toFixed(0)} uds.</td>
                                                        <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{moneda} {parseFloat(p.ingreso_venta).toFixed(2)}</td>
                                                        <td style={{ color: 'var(--accent-red)' }}>{moneda} {parseFloat(p.costo_total).toFixed(2)}</td>
                                                        <td style={{ fontWeight: 700, color: parseFloat(p.margen) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{moneda} {parseFloat(p.margen).toFixed(2)}</td>
                                                        <td>
                                                            <span className={`chip ${parseFloat(p.margen_pct) >= 20 ? 'chip-success' : parseFloat(p.margen_pct) >= 0 ? 'chip-warning' : 'chip-error'}`}>
                                                                {p.margen_pct}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )
                    )}

                    {/* ===== TAB: CLIENTES TOP ===== */}
                    {tab === 'clientes' && (
                        clientesLoading ? <div className="loader-page"><div className="loader" /></div> : (
                            <div className="card">
                                <div className="card-header"><div className="card-title">Ranking de Clientes (Top Compradores)</div></div>
                                <div className="table-container">
                                    <table className="table">
                                        <thead><tr><th>#</th><th>Cliente</th><th>Teléfono / Email</th><th style={{ textAlign: 'center' }}>N° Pedidos</th><th style={{ textAlign: 'right' }}>Total Comprado</th></tr></thead>
                                        <tbody>
                                            {clientesTop.length === 0 ? (
                                                <tr><td colSpan={5}><div className="empty-state"><Users size={30} /><p>No hay clientes con compras en este período</p></div></td></tr>
                                            ) : clientesTop.map((c, i) => (
                                                <tr key={i}>
                                                    <td><span className="stat-badge badge-orange">#{i + 1}</span></td>
                                                    <td style={{ fontWeight: 600 }}>{c.cliente?.nombre || 'Desconocido'}</td>
                                                    <td style={{ color: 'var(--text-muted)' }}>
                                                        {c.cliente?.telefono || '-'} {c.cliente?.email ? ` | ${c.cliente.email}` : ''}
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.total_pedidos}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-green)' }}>{moneda} {parseFloat(c.total_comprado).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
}
