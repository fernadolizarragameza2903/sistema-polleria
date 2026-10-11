import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Award, Calendar, FileText, Plus, MessageCircle, MessageSquare, Tag } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function CRMPerfilCliente() {
    const { id } = useParams();
    const [cliente, setCliente] = useState(null);
    const [ventas, setVentas] = useState([]);
    const [interacciones, setInteracciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('resumen');

    // Nueva interacción
    const [modalInt, setModalInt] = useState(false);
    const [formInt, setFormInt] = useState({ tipo: 'nota', observacion: '' });

    const loadData = async () => {
        try {
            const [resCli, resInt, resVentas] = await Promise.all([
                api.get(`/clientes/${id}`),
                api.get(`/crm/interacciones/${id}`),
                // Reutilizamos el endpoint general filtrando en frontend o idealmente un queryero,
                // Pero como es prueba, traemos todas las ventas y filtramos (o usamos el API correcto si existe).
                // Vamos a intentar obtenerlas usando el getOne del cliente que ya incluye compras si el backend lo soporta, o traemos de /ventas.
                api.get('/ventas')
            ]);
            setCliente(resCli.data.cliente);
            setInteracciones(resInt.data.interacciones);
            // Filtramos las ventas de este cliente específico
            const ventasFiltradas = resVentas.data.ventas.filter(v => v.cliente_id == id);
            setVentas(ventasFiltradas);
        } catch (err) {
            toast.error('Error al cargar perfil 360');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [id]);

    const handleCrearInteraccion = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Guardando...');
        try {
            await api.post('/crm/interacciones', { ...formInt, cliente_id: id });
            toast.success('Interacción registrada', { id: toastId });
            setModalInt(false);
            setFormInt({ tipo: 'nota', observacion: '' });
            loadData(); // recargar
        } catch (err) {
            toast.error('Error al guardar', { id: toastId });
        }
    };

    if (loading) return <div className="loader-page"><div className="loader" /></div>;
    if (!cliente) return <div className="empty-state">Cliente no encontrado</div>;

    const totalGastado = ventas.reduce((s, v) => s + parseFloat(v.total), 0);

    return (
        <div>
            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <Link to="/crm" className="btn btn-sm btn-secondary" style={{ padding: 6 }}><ArrowLeft size={16} /></Link>
                        <div className="page-title" style={{ margin: 0 }}>Perfil 360</div>
                    </div>
                </div>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: 24, alignItems: 'start' }}>

                {/* Panel Izquierdo: Info Cliente */}
                <div className="card">
                    <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: 32, fontWeight: 700 }}>
                            {cliente.nombre.charAt(0).toUpperCase()}
                        </div>
                        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>{cliente.nombre}</h2>
                        <div style={{ marginTop: 8, display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'var(--bg-main)', color: 'var(--text-muted)' }}>
                            Segmento: <span style={{ textTransform: 'uppercase', color: 'var(--accent-pink)' }}>{cliente.segmento}</span>
                        </div>
                    </div>

                    <div style={{ padding: '20px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                            <Phone size={16} color="var(--text-muted)" />
                            <span style={{ fontSize: 14 }}>{cliente.telefono || 'Sin teléfono'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                            <Mail size={16} color="var(--text-muted)" />
                            <span style={{ fontSize: 14 }}>{cliente.email || 'Sin correo'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                            <FileText size={16} color="var(--text-muted)" />
                            <span style={{ fontSize: 14 }}>{cliente.documento_tipo}: {cliente.documento_numero || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Calendar size={16} color="var(--text-muted)" />
                            <span style={{ fontSize: 14 }}>Inscrito: {new Date(cliente.createdAt || cliente.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div style={{ background: '#fff5f5', padding: 20, borderRadius: 12, border: '1px solid #ffe3e3', textAlign: 'center' }}>
                        <Award size={32} color="#fa5252" style={{ marginBottom: 10 }} />
                        <div style={{ fontSize: 13, color: '#e03131', fontWeight: 600 }}>Puntos Acumulados</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#c92a2a' }}>{cliente.puntos} pts</div>
                    </div>
                </div>

                {/* Panel Derecho: Tabs */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                        <button className={`btn-tab ${tab === 'resumen' ? 'active' : ''}`} style={{ flex: 1, padding: 16, border: 'none', borderBottom: tab === 'resumen' ? '3px solid var(--orange)' : '3px solid transparent', background: tab === 'resumen' ? '#fff' : 'transparent', fontWeight: 600, cursor: 'pointer' }} onClick={() => setTab('resumen')}>Historial de Compras</button>
                        <button className={`btn-tab ${tab === 'bitacora' ? 'active' : ''}`} style={{ flex: 1, padding: 16, border: 'none', borderBottom: tab === 'bitacora' ? '3px solid var(--orange)' : '3px solid transparent', background: tab === 'bitacora' ? '#fff' : 'transparent', fontWeight: 600, cursor: 'pointer' }} onClick={() => setTab('bitacora')}>Bitácora / Notas</button>
                    </div>

                    <div style={{ padding: 24 }}>
                        {tab === 'resumen' && (
                            <div>
                                <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                                    <div style={{ flex: 1, background: 'var(--bg-main)', padding: 15, borderRadius: 8 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Total Gastado</div>
                                        <div style={{ fontSize: 18, fontWeight: 700 }}>S/. {totalGastado.toFixed(2)}</div>
                                    </div>
                                    <div style={{ flex: 1, background: 'var(--bg-main)', padding: 15, borderRadius: 8 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Visitas / Pedidos</div>
                                        <div style={{ fontSize: 18, fontWeight: 700 }}>{ventas.length}</div>
                                    </div>
                                    <div style={{ flex: 1, background: 'var(--bg-main)', padding: 15, borderRadius: 8 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Ticket Promedio</div>
                                        <div style={{ fontSize: 18, fontWeight: 700 }}>S/. {ventas.length > 0 ? (totalGastado / ventas.length).toFixed(2) : '0.00'}</div>
                                    </div>
                                </div>

                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Comprobante</th>
                                            <th>Total</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ventas.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin compras registradas</td></tr> :
                                            ventas.slice(0, 5).map(v => (
                                                <tr key={v.id}>
                                                    <td>{new Date(v.created_at).toLocaleString()}</td>
                                                    <td style={{ fontWeight: 600 }}>{v.numero_comprobante}</td>
                                                    <td style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>S/. {parseFloat(v.total).toFixed(2)}</td>
                                                    <td>
                                                        <span className={`stat-badge ${v.estado === 'completada' ? 'badge-green' : 'badge-orange'}`}>{v.estado}</span>
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {tab === 'bitacora' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h3 style={{ margin: 0, fontSize: 16 }}>Interacciones con {cliente.nombre}</h3>
                                    <button className="btn btn-sm btn-primary" onClick={() => setModalInt(true)}><Plus size={14} /> Nueva Nota</button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                    {interacciones.length === 0 ? (
                                        <div className="empty-state" style={{ padding: '40px 0' }}>
                                            <MessageCircle size={36} />
                                            <p>No hay interacciones registradas</p>
                                        </div>
                                    ) : (
                                        interacciones.map(int => (
                                            <div key={int.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 15, background: 'var(--bg-main)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
                                                        {int.tipo === 'llamada' && <Phone size={14} color="var(--accent-blue)" />}
                                                        {int.tipo === 'email' && <Mail size={14} color="var(--accent-pink)" />}
                                                        {int.tipo === 'whatsapp' && <MessageCircle size={14} color="var(--accent-green)" />}
                                                        {int.tipo === 'nota' && <Tag size={14} color="var(--orange)" />}
                                                        <span style={{ textTransform: 'capitalize' }}>{int.tipo}</span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {new Date(int.fecha).toLocaleString()} por {int.usuario?.nombre}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                                    {int.observacion}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Nueva Interacción */}
            {modalInt && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: 400 }}>
                        <div className="modal-header">
                            <div className="modal-title">Registrar Interacción</div>
                            <button className="modal-close" onClick={() => setModalInt(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCrearInteraccion}>
                                <div className="form-group">
                                    <label className="form-label">Tipo de Contacto/Nota</label>
                                    <select className="form-control" value={formInt.tipo} onChange={e => setFormInt({ ...formInt, tipo: e.target.value })}>
                                        <option value="nota">Nota Interna</option>
                                        <option value="llamada">Llamada Telefónica</option>
                                        <option value="whatsapp">Mensaje WhatsApp</option>
                                        <option value="email">Correo Electrónico</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Observación o Resumen</label>
                                    <textarea className="form-control" required rows="4" value={formInt.observacion} onChange={e => setFormInt({ ...formInt, observacion: e.target.value })} placeholder="Ej: Cliente llamó para quejarse de su último pedido..."></textarea>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setModalInt(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
