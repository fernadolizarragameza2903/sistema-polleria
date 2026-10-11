import { useState, useEffect } from 'react';
import { Users, Award, Mail, Search, Eye, Filter, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function CRM() {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroSegmento, setFiltroSegmento] = useState('todos');
    const [modalEmail, setModalEmail] = useState(false);
    const [formEmail, setFormEmail] = useState({ titulo: '', mensaje: '', segmento: 'todos' });
    const [sending, setSending] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/clientes');
            setClientes(res.data.clientes || []);
        } catch (err) {
            toast.error('Error al cargar clientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleActualizarSegmentos = async () => {
        const toastId = toast.loading('Calculando segmentos...');
        try {
            const res = await api.post('/crm/actualizar-segmentos');
            toast.success(res.data.msg, { id: toastId });
            loadData();
        } catch (err) {
            toast.error('Error al actualizar segmentos', { id: toastId });
        }
    };

    const handleEnviarCampana = async (e) => {
        e.preventDefault();
        setSending(true);
        const toastId = toast.loading('Enviando campaña de email...');
        try {
            const res = await api.post('/crm/campana-email', formEmail);
            toast.success(res.data.msg, { id: toastId });
            setModalEmail(false);
            setFormEmail({ titulo: '', mensaje: '', segmento: 'todos' });
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error enviando campaña', { id: toastId });
        } finally {
            setSending(false);
        }
    };

    const filtered = clientes.filter(c => {
        const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase()) || (c.documento_numero && c.documento_numero.includes(search));
        const matchSegmento = filtroSegmento === 'todos' || c.segmento === filtroSegmento;
        return matchSearch && matchSegmento;
    });

    const getSegmentBadge = (seg) => {
        switch (seg) {
            case 'vip': return <span className="stat-badge badge-green">VIP</span>;
            case 'frecuente': return <span className="stat-badge badge-blue">Frecuente</span>;
            case 'inactivo': return <span className="stat-badge badge-orange">Inactivo</span>;
            default: return <span className="stat-badge" style={{ backgroundColor: '#f1f3f5', color: '#495057' }}>Nuevo</span>;
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">CRM & Fidelización</div>
                    <div className="page-subtitle">Gestiona la relación con tus clientes, fidelidad y campañas</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={handleActualizarSegmentos}>
                        <Filter size={14} /> Recalcular Segmentos
                    </button>
                    <button className="btn btn-primary" onClick={() => setModalEmail(true)}>
                        <Mail size={14} /> Enviar Campaña Email
                    </button>
                </div>
            </div>

            <div className="grid-4" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#e3fafc', color: '#0c8599' }}><Users size={24} /></div>
                    <div className="stat-details">
                        <div className="stat-title">Total Clientes</div>
                        <div className="stat-value">{clientes.length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#ebfbee', color: '#2b8a3e' }}><Award size={24} /></div>
                    <div className="stat-details">
                        <div className="stat-title">Clientes VIP</div>
                        <div className="stat-value">{clientes.filter(c => c.segmento === 'vip').length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fff5f5', color: '#e03131' }}><Filter size={24} /></div>
                    <div className="stat-details">
                        <div className="stat-title">Inactivos</div>
                        <div className="stat-value">{clientes.filter(c => c.segmento === 'inactivo').length}</div>
                    </div>
                </div>
            </div>

            <div className="card mb-4">
                <div style={{ display: 'flex', gap: 15, paddingBottom: 16 }}>
                    <div className="search-bar" style={{ flex: 1, margin: 0 }}>
                        <Search size={14} />
                        <input placeholder="Buscar por nombre o DNI..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-control" style={{ width: 200 }} value={filtroSegmento} onChange={e => setFiltroSegmento(e.target.value)}>
                        <option value="todos">Todos los segmentos</option>
                        <option value="nuevo">Nuevos</option>
                        <option value="frecuente">Frecuentes</option>
                        <option value="vip">VIP</option>
                        <option value="inactivo">Inactivos</option>
                    </select>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Contacto</th>
                                <th>Puntos</th>
                                <th>Segmento</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={5}><div className="loader-page"><div className="loader" /></div></td></tr> :
                                filtered.length === 0 ? <tr><td colSpan={5}><div className="empty-state">No hay clientes en este segmento</div></td></tr> :
                                    filtered.map(c => (
                                        <tr key={c.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.documento_numero || 'Sin Doc'}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13 }}>{c.telefono || '-'}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email || '-'}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 700, color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Award size={14} /> {c.puntos} pts
                                                </span>
                                            </td>
                                            <td>{getSegmentBadge(c.segmento)}</td>
                                            <td>
                                                <Link to={`/crm/cliente/${c.id}`} className="btn btn-sm btn-secondary" style={{ display: 'inline-flex', padding: '6px 12px' }}>
                                                    <Eye size={12} style={{ marginRight: 6 }} /> Perfil 360
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Mailing */}
            {modalEmail && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: 600 }}>
                        <div className="modal-header">
                            <div className="modal-title">Lanzar Campaña por Email</div>
                            <button className="modal-close" onClick={() => setModalEmail(false)} disabled={sending}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleEnviarCampana}>
                                <div className="form-group">
                                    <label className="form-label">Dirigido a (Segmento)</label>
                                    <select className="form-control" required value={formEmail.segmento} onChange={e => setFormEmail({ ...formEmail, segmento: e.target.value })} disabled={sending}>
                                        <option value="todos">Todos los clientes (con correo registrado)</option>
                                        <option value="nuevo">Nuevos</option>
                                        <option value="frecuente">Frecuentes</option>
                                        <option value="vip">VIP</option>
                                        <option value="inactivo">Inactivos (Recuperar cliente)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Asunto del Correo</label>
                                    <input className="form-control" required value={formEmail.titulo} onChange={e => setFormEmail({ ...formEmail, titulo: e.target.value })} placeholder="Ej: ¡Te extrañamos! 20% de Dscto" disabled={sending} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Cuerpo del Mensaje</label>
                                    <textarea className="form-control" required rows="6" value={formEmail.mensaje} onChange={e => setFormEmail({ ...formEmail, mensaje: e.target.value })} placeholder="Escribe el mensaje de la campaña aquí..." disabled={sending}></textarea>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setModalEmail(false)} disabled={sending}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" disabled={sending}>
                                        {sending ? <Loader size={14} className="spin" /> : <Mail size={14} />} Enviar Campaña
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
