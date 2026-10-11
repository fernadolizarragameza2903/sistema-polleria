import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Trash2, CreditCard, Smartphone, Banknote, Plus, Minus, Search, CheckCircle, Printer, Lock } from 'lucide-react';
import api from '../api/axios';
import useCartStore from '../store/cartStore';
import useConfigStore from '../store/configStore';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
    { value: 'efectivo', label: 'Efectivo', icon: Banknote },
    { value: 'yape', label: 'Yape', icon: Smartphone },
    { value: 'plin', label: 'Plin', icon: Smartphone },
    { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
];

const TIPO_VENTA = [
    { value: 'local', label: '🍽️ Local' },
    { value: 'llevar', label: '🥡 Para llevar' },
    { value: 'delivery', label: '🛵 Delivery' },
];

export default function POS() {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [clienteId, setClienteId] = useState('');
    const [clienteSearch, setClienteSearch] = useState('');
    const [showClienteList, setShowClienteList] = useState(false);
    const [catFilter, setCatFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [cajaActiva, setCajaActiva] = useState(null);
    const [cajaLoading, setCajaLoading] = useState(true);
    const [ultimaVenta, setUltimaVenta] = useState(null);
    const [promocionesActivas, setPromocionesActivas] = useState([]);
    const boletaRef = useRef(null);

    const { config } = useConfigStore();
    const { items, addItem, updateQty, removeItem, clear, tipoVenta, setTipoVenta, metodoPago, setMetodoPago, montoRecibido, setMontoRecibido, descuento, setDescuento } = useCartStore();

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

    // Calcular descuento automático por promociones
    let descuentoAut = 0;
    const promoGeneral = promocionesActivas.find(p => p.aplicacion === 'general');
    if (promoGeneral) {
        if (promoGeneral.tipo === 'porcentaje') descuentoAut = subtotal * (parseFloat(promoGeneral.valor) / 100);
        else descuentoAut = parseFloat(promoGeneral.valor);
    } else {
        items.forEach(item => {
            const prod = productos.find(p => p.id === item.producto_id);
            if (!prod) return;
            let promoAplicable = promocionesActivas.find(p => p.aplicacion === 'producto' && p.producto_id === item.producto_id);
            if (!promoAplicable) promoAplicable = promocionesActivas.find(p => p.aplicacion === 'categoria' && p.categoria_id === prod.categoria_id);
            if (promoAplicable) {
                if (promoAplicable.tipo === 'porcentaje') descuentoAut += item.subtotal * (parseFloat(promoAplicable.valor) / 100);
                else descuentoAut += parseFloat(promoAplicable.valor) * item.cantidad;
            }
        });
    }

    const descuentoFinal = parseFloat(descuento) + descuentoAut;
    const total = Math.max(0, subtotal - descuentoFinal);
    const vuelto = Math.max(0, montoRecibido - total);

    useEffect(() => {
        Promise.all([
            api.get('/productos?activo=1'),
            api.get('/categorias'),
            api.get('/caja/activa'),
            api.get('/clientes'),
            api.get('/promociones/activas'),
        ]).then(([p, c, caja, cli, promos]) => {
            setProductos(p.data.productos);
            setCategorias(c.data.categorias);
            setCajaActiva(caja.data.caja);
            setClientes(cli.data.clientes?.filter(c => c.activo) || []);
            setPromocionesActivas(promos.data.promociones || []);
            setCajaLoading(false);
        }).catch(() => setCajaLoading(false));
    }, []);

    const filtered = productos.filter(p => {
        const matchCat = catFilter === 'all' || p.categoria_id == catFilter;
        const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const procesarVenta = async () => {
        if (!cajaActiva) return toast.error('Debes abrir la caja antes de vender');
        if (items.length === 0) return toast.error('Agrega productos al carrito');
        if (!montoRecibido && metodoPago === 'efectivo') return toast.error('Ingresa el monto recibido');
        setLoading(true);
        try {
            const igv = total * 0.18;
            const sub = total - igv;
            const res = await api.post('/ventas', {
                tipo_venta: tipoVenta,
                tipo_comprobante: 'ticket',
                caja_id: cajaActiva.id,
                cliente_id: clienteId || null,
                subtotal: sub.toFixed(2),
                igv: igv.toFixed(2),
                descuento: descuentoFinal.toFixed(2),
                total: total.toFixed(2),
                metodo_pago: metodoPago,
                monto_recibido: montoRecibido,
                vuelto: vuelto.toFixed(2),
                detalles: items,
            });
            const ventaData = {
                ...res.data.venta,
                items: [...items],
                subtotal: sub,
                igv,
                descuento: descuentoFinal,
                total,
                metodoPago,
                montoRecibido,
                vuelto,
                tipoVenta,
            };
            setUltimaVenta(ventaData);
            toast.success('¡Venta registrada con éxito!');
            clear();
            setClienteId('');
            setClienteSearch('');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Error al procesar venta');
        } finally {
            setLoading(false);
        }
    };

    const imprimirBoleta = async () => {
        const v = ultimaVenta;
        if (!v) return;

        // Si la impresión directa está habilitada, mandar al backend
        if (config?.printer_enabled === 'true') {
            const toastId = toast.loading('Enviando a la impresora...');
            try {
                await api.post(`/ventas/${v.id}/imprimir`);
                toast.success('Ticket impreso correctamente', { id: toastId });
            } catch (error) {
                toast.error(error.response?.data?.msg || 'Error al conectar con la impresora', { id: toastId });
                console.error('Error impresión directa:', error);
            }
            return;
        }

        // Si no está habilitada, fallback a la ventana de impresión web
        const win = window.open('', '_blank', 'width=400,height=600');
        const empresa = config?.empresa_nombre || 'Sistema Pollería';
        const ruc = config?.empresa_ruc || '';
        const moneda = config?.moneda || 'S/.';
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Boleta ${v.numero_comprobante}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 12px; color: #000; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .line { border-top: 1px dashed #000; margin: 8px 0; }
                    .row { display: flex; justify-content: space-between; margin: 3px 0; }
                    .titulo { font-size: 16px; font-weight: bold; text-align: center; margin: 6px 0; }
                    .total-row { font-size: 14px; font-weight: bold; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="center bold" style="font-size:14px">${empresa}</div>
                ${ruc ? `<div class="center">RUC: ${ruc}</div>` : ''}
                <div class="line"></div>
                <div class="titulo">TICKET DE VENTA</div>
                <div class="center">${v.numero_comprobante}</div>
                <div class="center">${new Date().toLocaleString('es-PE')}</div>
                <div class="row"><span>Tipo:</span><span>${v.tipoVenta?.toUpperCase() || ''}</span></div>
                <div class="line"></div>
                <div class="bold" style="margin-bottom:4px">PRODUCTOS</div>
                ${v.items.map(i => `
                    <div class="row">
                        <span style="flex:1">${i.nombre}</span>
                    </div>
                    <div class="row">
                        <span>${i.cantidad} x ${moneda} ${parseFloat(i.precio_unitario).toFixed(2)}</span>
                        <span>${moneda} ${i.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="line"></div>
                <div class="row"><span>Subtotal:</span><span>${moneda} ${v.subtotal.toFixed(2)}</span></div>
                <div class="row"><span>IGV (18%):</span><span>${moneda} ${v.igv.toFixed(2)}</span></div>
                ${v.descuento > 0 ? `<div class="row"><span>Descuento:</span><span>- ${moneda} ${parseFloat(v.descuento).toFixed(2)}</span></div>` : ''}
                <div class="line"></div>
                <div class="row total-row"><span>TOTAL:</span><span>${moneda} ${v.total.toFixed(2)}</span></div>
                <div class="row"><span>Pago (${v.metodoPago}):</span><span>${moneda} ${parseFloat(v.montoRecibido || v.total).toFixed(2)}</span></div>
                ${v.vuelto > 0 ? `<div class="row"><span>Vuelto:</span><span>${moneda} ${parseFloat(v.vuelto).toFixed(2)}</span></div>` : ''}
                <div class="line"></div>
                <div class="center" style="margin-top:8px">¡Gracias por su compra!</div>
                <script>window.onload = () => { window.print(); window.close(); }<\/script>
            </body>
            </html>
        `);
        win.document.close();
    };

    // Pantalla de caja cerrada
    if (!cajaLoading && !cajaActiva) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 130px)', gap: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(248,81,73,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={32} color="var(--accent-red)" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>Caja Cerrada</h2>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 340 }}>
                    Debes abrir la caja antes de registrar ventas. Ve al módulo de <strong>Caja</strong> para abrirla.
                </p>
                <a href="#/caja" className="btn btn-primary" style={{ marginTop: 8 }}>
                    <Lock size={14} /> Ir a Caja
                </a>
            </div>
        );
    }

    return (
        <div>
            {/* Banner de boleta lista */}
            {ultimaVenta && (
                <div style={{ background: 'rgba(86,211,100,0.12)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle size={18} color="var(--accent-green)" />
                        <span style={{ fontWeight: 600, color: 'var(--accent-green)', fontSize: 13 }}>
                            Venta <strong>{ultimaVenta.numero_comprobante}</strong> registrada correctamente
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-secondary" onClick={imprimirBoleta}>
                            <Printer size={13} /> Imprimir Boleta
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setUltimaVenta(null)} style={{ padding: '4px 8px' }}>✕</button>
                    </div>
                </div>
            )}

            <div className="pos-grid" style={{ height: 'calc(100vh - 160px)' }}>
                {/* Panel productos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="search-bar" style={{ flex: 1 }}>
                            <Search size={14} />
                            <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className={`btn btn-sm ${catFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter('all')}>Todos</button>
                        {categorias.map(c => (
                            <button key={c.id} className={`btn btn-sm ${catFilter == c.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter(c.id)}>{c.nombre}</button>
                        ))}
                    </div>

                    {/* Grid de productos */}
                    <div className="product-grid" style={{ flex: 1, overflow: 'auto' }}>
                        {filtered.map(p => (
                            <div key={p.id} className="product-card" onClick={() => addItem(p)}>
                                <div className="product-card-img">{p.imagen ? <img src={p.imagen} alt={p.nombre} /> : '🍗'}</div>
                                <div className="product-card-name">{p.nombre}</div>
                                <div className="product-card-price">S/. {parseFloat(p.precio).toFixed(2)}</div>
                                {p.stock <= p.stock_minimo && <div style={{ fontSize: 10, color: 'var(--accent-red)', marginTop: 4 }}>⚠ Bajo stock</div>}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                                <ShoppingCart size={40} />
                                <p>No se encontraron productos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel carrito */}
                <div className="cart-panel">
                    <div className="cart-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShoppingCart size={16} /> Carrito
                                {items.length > 0 && <span className="nav-badge" style={{ position: 'static', background: 'var(--accent-pink)' }}>{items.length}</span>}
                            </h3>
                            {items.length > 0 && <button className="btn btn-sm btn-danger" onClick={clear}><Trash2 size={12} /> Limpiar</button>}
                        </div>

                        {/* Tipo de venta */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                            {TIPO_VENTA.map(t => (
                                <button key={t.value} className={`btn btn-sm ${tipoVenta === t.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTipoVenta(t.value)} style={{ flex: 1, fontSize: 11 }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selector de cliente */}
                    <div style={{ position: 'relative', marginTop: 10 }}>
                        <div className="search-bar" style={{ margin: 0 }}>
                            <Search size={13} />
                            <input
                                placeholder="Cliente (opcional)..."
                                value={clienteId
                                    ? clientes.find(c => c.id == clienteId)?.nombre || clienteSearch
                                    : clienteSearch}
                                onChange={e => { setClienteSearch(e.target.value); setClienteId(''); setShowClienteList(true); }}
                                onFocus={() => setShowClienteList(true)}
                                onBlur={() => setTimeout(() => setShowClienteList(false), 150)}
                            />
                            {clienteId && (
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', paddingRight: 4 }}
                                    onClick={() => { setClienteId(''); setClienteSearch(''); }}>
                                    ✕
                                </button>
                            )}
                        </div>
                        {showClienteList && clienteSearch && !clienteId && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 100, maxHeight: 160, overflow: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                                {clientes.filter(c => c.nombre.toLowerCase().includes(clienteSearch.toLowerCase())).slice(0, 8).map(c => (
                                    <div key={c.id}
                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                                        onMouseDown={() => { setClienteId(c.id); setClienteSearch(c.nombre); setShowClienteList(false); }}>
                                        <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.telefono}</div>
                                    </div>
                                ))}
                                {clientes.filter(c => c.nombre.toLowerCase().includes(clienteSearch.toLowerCase())).length === 0 && (
                                    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Sin resultados</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="cart-items">
                        {items.length === 0 ? (
                            <div className="empty-state">
                                <ShoppingCart size={36} />
                                <h3>Carrito vacío</h3>
                                <p style={{ fontSize: 12 }}>Selecciona productos para agregar</p>
                            </div>
                        ) : (
                            items.map(item => (
                                <div key={item.producto_id} className="cart-item">
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="cart-item-name truncate">{item.nombre}</div>
                                        <div style={{ fontSize: 12, color: 'var(--accent-pink)', fontWeight: 600 }}>S/. {item.subtotal.toFixed(2)}</div>
                                    </div>
                                    <div className="cart-item-qty">
                                        <button className="qty-btn" onClick={() => updateQty(item.producto_id, item.cantidad - 1)}><Minus size={12} /></button>
                                        <span className="qty-num">{item.cantidad}</span>
                                        <button className="qty-btn" onClick={() => updateQty(item.producto_id, item.cantidad + 1)}><Plus size={12} /></button>
                                    </div>
                                    <button onClick={() => removeItem(item.producto_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', marginLeft: 4 }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer pago */}
                    <div className="cart-footer">
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                                <span>Subtotal:</span><span>S/. {subtotal.toFixed(2)}</span>
                            </div>
                            {descuentoAut > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--accent-pink)', marginBottom: 4, fontWeight: 600 }}>
                                    <span>Promo Automática:</span><span>- S/. {descuentoAut.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <input className="form-control" style={{ fontSize: 12, flex: 1 }} placeholder="Descuento manual (S/.)" type="number" min="0" value={descuento || ''} onChange={e => setDescuento(parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="cart-total">
                                <span>Total:</span>
                                <span style={{ color: 'var(--accent-pink)' }}>S/. {total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Método de pago */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                            {PAYMENT_METHODS.map(m => {
                                const Icon = m.icon;
                                return (
                                    <button key={m.value} className={`btn btn-sm ${metodoPago === m.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMetodoPago(m.value)}>
                                        <Icon size={12} /> {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {metodoPago === 'efectivo' && (
                            <div style={{ marginBottom: 10 }}>
                                <input className="form-control" type="number" placeholder="Monto recibido..." value={montoRecibido || ''} onChange={e => setMontoRecibido(parseFloat(e.target.value) || 0)} />
                                {montoRecibido > 0 && (
                                    <div style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 600, marginTop: 6, textAlign: 'center' }}>
                                        Vuelto: S/. {vuelto.toFixed(2)}
                                    </div>
                                )}
                            </div>
                        )}

                        <button className="btn btn-primary btn-block btn-lg" onClick={procesarVenta} disabled={loading || items.length === 0}>
                            {loading ? <div className="loader" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <CheckCircle size={16} />}
                            {loading ? 'Procesando...' : 'Cobrar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
