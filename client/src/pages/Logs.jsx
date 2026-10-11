import { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Filter } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Logs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [moduloFilter, setModuloFilter] = useState('all');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/logs');
            setLogs(res.data.logs);
        } catch (err) {
            toast.error('Error al obtener los logs de auditoría');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    const filtered = logs.filter(l => {
        const matchSearch =
            (l.usuario?.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
            l.accion.toLowerCase().includes(search.toLowerCase()) ||
            (l.descripcion || '').toLowerCase().includes(search.toLowerCase());
        const matchModulo = moduloFilter === 'all' || l.modulo === moduloFilter;
        return matchSearch && matchModulo;
    });

    const modulos = [...new Set(logs.map(l => l.modulo))];

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Log de Auditoría</div>
                    <div className="page-subtitle">Historial de acciones del sistema</div>
                </div>
                <button className="btn btn-secondary" onClick={fetchLogs}><RefreshCw size={14} /> Actualizar</button>
            </div>

            <div className="card mb-4" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="search-bar" style={{ flex: 1, margin: 0 }}>
                    <Search size={16} />
                    <input placeholder="Buscar por usuario, acción o descripción..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Filter size={16} color="var(--text-muted)" />
                    <select className="form-control" value={moduloFilter} onChange={e => setModuloFilter(e.target.value)} style={{ width: 140 }}>
                        <option value="all">Todos los módulos</option>
                        {modulos.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Usuario</th>
                                <th>Acción</th>
                                <th>Módulo</th>
                                <th>Descripción</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0' }}><div className="loader" style={{ margin: '0 auto' }} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <ShieldAlert size={40} />
                                            <p>No se encontraron registros de auditoría</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(log => (
                                <tr key={log.id}>
                                    <td style={{ whiteSpace: 'nowrap', fontSize: 13, color: 'var(--text-muted)' }}>
                                        {new Date(log.created_at).toLocaleString('es-PE')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div className="sidebar-avatar" style={{ width: 24, height: 24, fontSize: 11 }}>
                                                {log.usuario?.nombre?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{log.usuario?.nombre || 'SISTEMA'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`chip ${log.resultado === 'error' ? 'chip-error' : 'chip-success'}`}>
                                            {log.accion}
                                        </span>
                                    </td>
                                    <td style={{ textTransform: 'capitalize' }}>{log.modulo}</td>
                                    <td style={{ fontSize: 13 }}>{log.descripcion || '-'}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.ip || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
