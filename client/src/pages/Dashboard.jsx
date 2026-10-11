import { useEffect, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { ShoppingCart, Users, Package, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../api/axios';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1c2128', borderColor: '#30363d', borderWidth: 1, titleColor: '#e6edf3', bodyColor: '#8b949e', padding: 10 } },
    scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e7681', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6e7681', font: { size: 11 } } },
    },
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const desde = new Date(); desde.setDate(desde.getDate() - 7);
        const hasta = new Date();
        api.get(`/reportes/resumen?desde=${desde.toISOString().split('T')[0]}&hasta=${hasta.toISOString().split('T')[0]}`)
            .then(r => setData(r.data.data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    const dias = data?.ventasPorDia || [];
    const labels = dias.map(d => new Date(d.dia).toLocaleDateString('es', { weekday: 'short', day: 'numeric' }));
    const totales = dias.map(d => parseFloat(d.total || 0));

    const topProd = data?.topProductos || [];
    const metodoPago = data?.ventasPorMetodo || [];

    const lineData = {
        labels: labels.length ? labels : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [{
            label: 'Ventas S/.',
            data: totales.length ? totales : [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#e91e8c',
            backgroundColor: 'rgba(233,30,140,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#e91e8c',
            pointRadius: 4,
            fill: true,
            tension: 0.4,
        }],
    };

    const barData = {
        labels: topProd.length ? topProd.map(p => p.producto?.nombre || 'N/A') : ['Pollo Entero', '1/2 Pollo', 'Combo Fam.', '1/4 Pollo', 'Bebidas'],
        datasets: [{
            label: 'Unidades vendidas',
            data: topProd.length ? topProd.map(p => parseFloat(p.total_cantidad || 0)) : [0, 0, 0, 0, 0],
            backgroundColor: ['#e91e8c', '#4f8ef7', '#00d4ff', '#a78bfa', '#fb923c'],
            borderRadius: 6,
            borderSkipped: false,
        }],
    };

    const donutData = {
        labels: metodoPago.length ? metodoPago.map(m => m.metodo_pago) : ['Efectivo', 'Yape', 'Tarjeta'],
        datasets: [{
            data: metodoPago.length ? metodoPago.map(m => parseFloat(m.total || 0)) : [60, 25, 15],
            backgroundColor: ['#e91e8c', '#4f8ef7', '#00d4ff', '#a78bfa', '#fb923c'],
            borderWidth: 0,
            hoverOffset: 4,
        }],
    };

    const totalDia = parseFloat(data?.totalVentas?.total_sum || 0);
    const cantVentas = parseInt(data?.totalVentas?.count || 0);
    const totalClientes = data?.totalClientes || 0;

    return (
        <div>
            {/* STAT CARDS */}
            <div className="grid-4 mb-4">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-pink-light)' }}>
                        <ShoppingCart size={20} color="var(--accent-pink)" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Ventas (7 días)</div>
                        <div className="stat-value">S/. {totalDia.toFixed(2)}</div>
                    </div>
                    <span className="stat-badge badge-pink">{cantVentas} ventas</span>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-blue-light)' }}>
                        <Users size={20} color="var(--accent-blue)" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Total Clientes</div>
                        <div className="stat-value">{totalClientes}</div>
                    </div>
                    <span className="stat-badge badge-blue">activos</span>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-cyan-light)' }}>
                        <Package size={20} color="var(--accent-cyan)" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Top Producto</div>
                        <div className="stat-value" style={{ fontSize: 15 }}>{topProd[0]?.producto?.nombre || '—'}</div>
                    </div>
                    <span className="stat-badge badge-cyan">{parseFloat(topProd[0]?.total_cantidad || 0).toFixed(0)} uds.</span>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-purple-light)' }}>
                        <TrendingUp size={20} color="var(--accent-purple)" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Promedio/Venta</div>
                        <div className="stat-value">S/. {cantVentas > 0 ? (totalDia / cantVentas).toFixed(2) : '0.00'}</div>
                    </div>
                    <span className="stat-badge badge-purple">semanal</span>
                </div>
            </div>

            {/* CHARTS ROW 1 */}
            <div className="grid-2 mb-4">
                {/* Línea - Ventas por día */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Ventas últimos 7 días</div>
                            <div className="card-subtitle">Ingresos diarios en soles</div>
                        </div>
                        <span className="chip chip-success"><span className="chip-dot" style={{ background: 'var(--accent-green)' }} /> En vivo</span>
                    </div>
                    <div style={{ height: 200, position: 'relative', width: '100%', minWidth: 0 }}>
                        <Line data={lineData} options={{ ...chartDefaults }} />
                    </div>
                </div>

                {/* Dona - Métodos de pago */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Métodos de Pago</div>
                            <div className="card-subtitle">Distribución de ingresos</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ height: 180, flex: '1 1 200px', minWidth: 0, position: 'relative', width: '100%' }}>
                            <Doughnut data={donutData} options={{ ...chartDefaults, scales: undefined, plugins: { ...chartDefaults.plugins, legend: { display: false } }, cutout: '70%' }} />
                        </div>
                        <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                            {donutData.labels.map((l, i) => (
                                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: donutData.datasets[0].backgroundColor[i], flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{l}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        S/. {parseFloat(donutData.datasets[0].data[i]).toFixed(0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CHARTS ROW 2 */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Top Productos Vendidos</div>
                        <div className="card-subtitle">Por cantidad de unidades en los últimos 7 días</div>
                    </div>
                </div>
                <div style={{ height: 220, position: 'relative', width: '100%', minWidth: 0 }}>
                    <Bar data={barData} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: false } } }} />
                </div>
            </div>

            {/* PROGRESS BARS */}
            {topProd.length > 0 && (
                <div className="card mt-4">
                    <div className="card-header">
                        <div className="card-title">Rendimiento de Productos</div>
                    </div>
                    {topProd.slice(0, 5).map((p, i) => {
                        const maxQty = parseFloat(topProd[0]?.total_cantidad || 1);
                        const pct = Math.round((parseFloat(p.total_cantidad || 0) / maxQty) * 100);
                        const colors = ['var(--accent-pink)', 'var(--accent-blue)', 'var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-orange)'];
                        return (
                            <div key={i} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.producto?.nombre || 'N/A'}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{pct}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
