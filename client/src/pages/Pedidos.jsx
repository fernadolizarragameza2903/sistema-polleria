import { useState, useEffect } from 'react';
import { ChefHat, Clock, UserCheck } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ESTADOS = [
    { value: 'pendiente', label: '⏳ Pendiente', chip: 'chip-warning' },
    { value: 'preparando', label: '🔥 Preparando', chip: 'chip-info' },
    { value: 'en_camino', label: '🛵 En Camino', chip: 'chip-info' },
    { value: 'entregado', label: '✅ Entregado', chip: 'chip-success' },
    { value: 'cancelado', label: '❌ Cancelado', chip: 'chip-error' },
];

export default function Pedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [repartidores, setRepartidores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('');

    const load = () => {
        const q = filtroEstado ? `?estado=${filtroEstado}` : '';
        Promise.all([
            api.get(`/pedidos${q}`),
            api.get('/usuarios'),
        ]).then(([p, u]) => {
            setPedidos(p.data.pedidos);
            // Solo usuarios activos como posibles repartidores
            setRepartidores((u.data.usuarios || []).filter(u => u.activo));
        }).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [filtroEstado]);

    const cambiarEstado = async (id, estado) => {
        try {
            await api.put(`/pedidos/${id}/estado`, { estado });
            toast.success('Estado actualizado');
            load();
        } catch { toast.error('Error al actualizar estado'); }
    };

    const asignarRepartidor = async (id, repartidor_id) => {
        try {
            await api.put(`/pedidos/${id}/estado`, { repartidor_id: repartidor_id || null });
            toast.success('Repartidor asignado');
            load();
        } catch { toast.error('Error al asignar repartidor'); }
    };

    // Contadores por estado para el resumen
    const conteos = ESTADOS.reduce((acc, e) => {
        acc[e.value] = pedidos.filter(p => p.estado === e.value).length;
        return acc;
    }, {});

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Pedidos Delivery</div>
                    <div className="page-subtitle">{pedidos.length} pedidos en total</div>
                </div>
            </div>

            {/* Resumen de estados */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {ESTADOS.map(e => (
                    <div key={e.value} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', outline: filtroEstado === e.value ? '2px solid var(--accent-pink)' : 'none' }}
                        onClick={() => setFiltroEstado(filtroEstado === e.value ? '' : e.value)}>
                        <span style={{ fontSize: 12 }}>{e.label}</span>
                        <span style={{ background: 'var(--accent-pink)', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{conteos[e.value] || 0}</span>
                    </div>
                ))}
                {filtroEstado && (
                    <button className="btn btn-sm btn-secondary" onClick={() => setFiltroEstado('')}>✕ Ver todos</button>
                )}
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Dirección</th>
                            <th>Estado</th>
                            <th>T. Estimado</th>
                            <th>Repartidor</th>
                            <th>Cambiar Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7}><div className="loader-page"><div className="loader" /></div></td></tr>
                        ) : pedidos.map(p => {
                            const estadoObj = ESTADOS.find(e => e.value === p.estado) || ESTADOS[0];
                            return (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-pink)' }}>{p.numero_pedido}</td>
                                    <td>
                                        <div>{p.cliente?.nombre || 'Sin cliente'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.cliente?.telefono}</div>
                                    </td>
                                    <td style={{ fontSize: 12, maxWidth: 180 }}>
                                        <div className="truncate">{p.direccion_entrega || '—'}</div>
                                    </td>
                                    <td><span className={`chip ${estadoObj.chip}`}>{estadoObj.label}</span></td>
                                    <td>
                                        {p.tiempo_estimado
                                            ? <span className="chip chip-info"><Clock size={10} /> {p.tiempo_estimado} min</span>
                                            : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                    </td>
                                    <td>
                                        {/* Selector de repartidor */}
                                        <select
                                            className="form-control"
                                            style={{ fontSize: 12, padding: '4px 8px', width: 150 }}
                                            value={p.repartidor_id || ''}
                                            onChange={e => asignarRepartidor(p.id, e.target.value)}
                                            title="Asignar repartidor"
                                        >
                                            <option value="">— Sin asignar —</option>
                                            {repartidores.map(r => (
                                                <option key={r.id} value={r.id}>{r.nombre}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            className="form-control"
                                            style={{ fontSize: 12, padding: '5px 8px', width: 145 }}
                                            value={p.estado}
                                            onChange={e => cambiarEstado(p.id, e.target.value)}
                                        >
                                            {ESTADOS.map(e => (
                                                <option key={e.value} value={e.value}>{e.label}</option>
                                            ))}
                                        </select>
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
                                        {filtroEstado ? `No hay pedidos con estado "${filtroEstado}"` : 'Aún no hay pedidos registrados'}
                                    </p>
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
