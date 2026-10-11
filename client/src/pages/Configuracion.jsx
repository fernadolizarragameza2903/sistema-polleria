import { useState, useEffect, useRef } from 'react';
import { Save, Settings, Upload, X, ImageIcon, ChefHat, Printer, Mail } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import useConfigStore from '../store/configStore';

const campos = [
    { key: 'empresa_nombre', label: 'Nombre de la Empresa', type: 'text' },
    { key: 'empresa_ruc', label: 'RUC', type: 'text' },
    { key: 'empresa_direccion', label: 'Dirección', type: 'text' },
    { key: 'empresa_telefono', label: 'Teléfono', type: 'text' },
    { key: 'moneda_simbolo', label: 'Símbolo de Moneda', type: 'text' },
    { key: 'igv_porcentaje', label: 'IGV (%)', type: 'number' },
    { key: 'costo_delivery', label: 'Costo Delivery (S/.)', type: 'number' },
    { key: 'stock_alerta_minimo', label: 'Stock Mínimo de Alerta', type: 'number' },
];

const posFields = [
    { key: 'printer_path', label: 'Ruta Compartida (ej: \\\\localhost\\ImpresoraPOS)', type: 'text' },
];

const smtpFields = [
    { key: 'smtp_host', label: 'Servidor SMTP', type: 'text', placeholder: 'ej. smtp.gmail.com' },
    { key: 'smtp_port', label: 'Puerto', type: 'number', placeholder: '465 o 587' },
    { key: 'smtp_user', label: 'Usuario / Email de envío', type: 'text' },
    { key: 'smtp_pass', label: 'Contraseña (App Password)', type: 'password' },
    { key: 'email_notificaciones', label: 'Correo Destinatario', type: 'email' },
];

export default function Configuracion() {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef();
    const fetchConfig = useConfigStore(s => s.fetchConfig);

    useEffect(() => {
        api.get('/configuracion').then(r => setConfig(r.data.configuracion)).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        try {
            await api.put('/configuracion', { configuracion: config });
            toast.success('Configuración guardada');
            fetchConfig(); // Actualiza el Header inmediatamente
        } catch { toast.error('Error al guardar'); }
    };

    // Convierte el archivo a base64 y lo guarda en el config
    const handleLogoFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
        if (file.size > 500 * 1024) { toast.error('El logo debe pesar menos de 500 KB'); return; }
        const reader = new FileReader();
        reader.onload = (e) => setConfig(c => ({ ...c, logo: e.target.result }));
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDragging(false);
        handleLogoFile(e.dataTransfer.files[0]);
    };

    const removeLogo = () => setConfig(c => ({ ...c, logo: '' }));

    return (
        <div>
            <div className="page-header">
                <div><div className="page-title">Configuración</div><div className="page-subtitle">Ajustes del sistema</div></div>
                <button className="btn btn-primary" onClick={handleSave}><Save size={14} /> Guardar cambios</button>
            </div>
            {loading ? <div className="loader-page"><div className="loader" /></div> : (
                <div className="grid-2">
                    {/* — Datos de la Empresa — */}
                    <div className="card">
                        <div className="card-header"><div className="card-title"><Settings size={16} style={{ display: 'inline', marginRight: 8 }} />Datos de la Empresa</div></div>

                        {/* Logo upload */}
                        <div className="form-group">
                            <label className="form-label">Logo de la Empresa</label>
                            {config.logo ? (
                                /* Vista del logo cargado */
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 80, height: 80, borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={config.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => fileRef.current.click()}>
                                            <Upload size={12} /> Cambiar logo
                                        </button>
                                        <button type="button" className="btn btn-sm btn-danger" onClick={removeLogo}>
                                            <X size={12} /> Quitar logo
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Zona de drop */
                                <div
                                    onClick={() => fileRef.current.click()}
                                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={handleDrop}
                                    style={{
                                        border: `2px dashed ${dragging ? 'var(--orange)' : 'var(--border)'}`,
                                        borderRadius: 12,
                                        padding: '28px 20px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: dragging ? '#fff5f0' : 'var(--bg-input)',
                                        transition: 'all 0.18s',
                                    }}
                                >
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--orange)20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <ImageIcon size={22} color="var(--orange)" />
                                    </div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Haz clic o arrastra tu logo aquí</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG, SVG — Máx. 500 KB</div>
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleLogoFile(e.target.files[0])} />
                        </div>

                        {/* Campos de texto */}
                        {campos.map(c => (
                            <div key={c.key} className="form-group">
                                <label className="form-label">{c.label}</label>
                                <input className="form-control" type={c.type} value={config[c.key] || ''} onChange={e => setConfig({ ...config, [c.key]: e.target.value })} />
                            </div>
                        ))}
                    </div>

                    {/* — Impresora POS — */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-header"><div className="card-title"><Printer size={16} style={{ display: 'inline', marginRight: 8 }} />Impresión de Boletas (Tickets POS)</div></div>
                        <div className="grid-2">
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={config.printer_enabled === 'true'}
                                        onChange={e => setConfig({ ...config, printer_enabled: e.target.checked ? 'true' : 'false' })}
                                        style={{ accentColor: 'var(--orange)', width: 16, height: 16 }}
                                    />
                                    Habilitar impresión directa (Enviar comprobantes directo a la máquina sin abrir ventana del navegador)
                                </label>
                            </div>

                            {config.printer_enabled === 'true' && (
                                <>
                                    {posFields.map(c => (
                                        <div key={c.key} className="form-group">
                                            <label className="form-label">{c.label}</label>
                                            <input className="form-control" type={c.type} value={config[c.key] || ''} onChange={e => setConfig({ ...config, [c.key]: e.target.value })} />
                                        </div>
                                    ))}
                                    <div className="form-group">
                                        <label className="form-label">Ancho de papel (Térmico)</label>
                                        <select className="form-control" value={config.printer_width || '58'} onChange={e => setConfig({ ...config, printer_width: e.target.value })}>
                                            <option value="58">58 mm (Pequeña)</option>
                                            <option value="80">80 mm (Grande)</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* — Correo Alertas SMTP — */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div className="card-header"><div className="card-title"><Mail size={16} style={{ display: 'inline', marginRight: 8 }} />Envío de Alertas por Correo (SMTP)</div></div>
                        <div className="grid-2">
                            <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 5 }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={config.smtp_secure === 'true'}
                                        onChange={e => setConfig({ ...config, smtp_secure: e.target.checked ? 'true' : 'false' })}
                                        style={{ accentColor: 'var(--orange)', width: 16, height: 16 }}
                                    />
                                    Usar conexión segura (SSL/TLS recomendado para Gmail/Outlook)
                                </label>
                            </div>

                            {smtpFields.map(c => (
                                <div key={c.key} className="form-group">
                                    <label className="form-label">{c.label}</label>
                                    <input className="form-control" type={c.type} placeholder={c.placeholder || ''} value={config[c.key] || ''} onChange={e => setConfig({ ...config, [c.key]: e.target.value })} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* — Vista Previa — */}
                    <div className="card">
                        <div className="card-header"><div className="card-title">Vista Previa</div></div>

                        {/* Preview del header */}
                        <div style={{ marginBottom: 20 }}>
                            <div className="form-label" style={{ marginBottom: 10 }}>Cómo se verá en el Header</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                                {config.logo ? (
                                    <img src={config.logo} alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }} />
                                ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ChefHat size={18} color="#fff" />
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.2 }}>{config.empresa_nombre || 'Sistema Pollería'}</div>
                                    {config.empresa_ruc && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>RUC: {config.empresa_ruc}</div>}
                                </div>
                            </div>
                        </div>

                        {/* Preview general */}
                        <div className="form-label" style={{ marginBottom: 10 }}>Vista general</div>
                        <div style={{ padding: 20, background: 'var(--bg-input)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                            {config.logo ? (
                                <img src={config.logo} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 12, marginBottom: 12, border: '1px solid var(--border)' }} />
                            ) : (
                                <div style={{ fontSize: 40, marginBottom: 12 }}>🐔</div>
                            )}
                            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{config.empresa_nombre || 'Mi Pollería'}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>RUC: {config.empresa_ruc || '—'}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{config.empresa_direccion || '—'}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{config.empresa_telefono || '—'}</div>
                            <div style={{ marginTop: 16, padding: '8px 16px', background: '#fff3e0', borderRadius: 8, display: 'inline-flex', gap: 16 }}>
                                <span style={{ color: 'var(--orange)', fontWeight: 600 }}>Moneda: {config.moneda_simbolo || 'S/.'}</span>
                                <span style={{ color: 'var(--orange)', fontWeight: 600 }}>IGV: {config.igv_porcentaje || 18}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
