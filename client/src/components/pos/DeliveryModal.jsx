import { useEffect, useState } from 'react';
import { Phone, Bike, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { CANALES } from '../../utils/delivery';

const METODOS = [
    { value: 'efectivo', label: 'Efectivo', icon: Banknote },
    { value: 'yape', label: 'Yape', icon: Smartphone },
    { value: 'plin', label: 'Plin', icon: Smartphone },
    { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
];
const BILLETES = [20, 50, 100, 200];

const formularioVacio = (cliente, costoDelivery) => ({
    canal: 'whatsapp',
    contacto_nombre: cliente && cliente.nombre !== 'Cliente General' ? cliente.nombre : '',
    contacto_telefono: cliente?.telefono || '',
    direccion_entrega: cliente?.direccion || '',
    referencia: '',
    costo_delivery: costoDelivery,
    tiempo_estimado: 30,
    notas: '',
    metodo_pago: 'efectivo',
    paga_con: '',
});

/**
 * Datos de un pedido delivery tomado por WhatsApp o llamada.
 * Solo el teléfono es obligatorio: quien pide puede no dar su nombre.
 */
export default function DeliveryModal({ open, totalProductos, cliente, costoDeliveryPorDefecto = 0, moneda = 'S/.', loading, onCancel, onConfirm }) {
    const [form, setForm] = useState(() => formularioVacio(cliente, costoDeliveryPorDefecto));

    // Cada vez que se abre, partir de los datos del cliente seleccionado (si hay).
    useEffect(() => {
        if (open) setForm(formularioVacio(cliente, costoDeliveryPorDefecto));
    }, [open, cliente, costoDeliveryPorDefecto]);

    if (!open) return null;

    const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));
    const costo = Math.max(0, parseFloat(form.costo_delivery) || 0);
    const total = totalProductos + costo;
    const pagaCon = parseFloat(form.paga_con) || 0;
    const esEfectivo = form.metodo_pago === 'efectivo';
    const vuelto = esEfectivo && pagaCon > 0 ? pagaCon - total : 0;

    // El teléfono identifica el pedido; el nombre y la dirección son opcionales
    // (la ubicación la envía el cliente al celular de la empresa que lleva el repartidor).
    const sinTelefono = form.contacto_telefono.replace(/\D/g, '').length < 6;
    const pagoInsuficiente = esEfectivo && pagaCon > 0 && pagaCon < total;

    const confirmar = (e) => {
        e.preventDefault();
        if (sinTelefono || pagoInsuficiente) return;
        onConfirm({
            pedido: {
                canal: form.canal,
                contacto_nombre: form.contacto_nombre,
                contacto_telefono: form.contacto_telefono,
                direccion_entrega: form.direccion_entrega,
                referencia: form.referencia,
                costo_delivery: costo,
                tiempo_estimado: form.tiempo_estimado,
                notas: form.notas,
            },
            metodoPago: form.metodo_pago,
            // Sin monto = paga exacto
            montoRecibido: esEfectivo ? (pagaCon || total) : total,
            costoDelivery: costo,
        });
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="modal modal-lg">
                <div className="modal-header">
                    <div className="modal-title"><Bike size={16} /> Pedido delivery</div>
                    <button className="modal-close" onClick={onCancel}>✕</button>
                </div>
                <form onSubmit={confirmar}>
                    <div className="modal-body">
                        {/* Canal */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                            {CANALES.filter(c => c.value !== 'web').map(c => (
                                <button type="button" key={c.value} className={`btn btn-sm ${form.canal === c.value ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setForm(f => ({ ...f, canal: c.value }))}>
                                    {c.emoji} {c.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label"><Phone size={11} /> Teléfono / WhatsApp *</label>
                                <input className="form-control" inputMode="tel" placeholder="987 654 321" value={form.contacto_telefono} onChange={set('contacto_telefono')} autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nombre <span style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
                                <input className="form-control" placeholder="Si no lo dice, se deja vacío" value={form.contacto_nombre} onChange={set('contacto_nombre')} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Dirección de entrega</label>
                            <input className="form-control" placeholder="Av. / Jr. / Calle, número, Mz, Lt" value={form.direccion_entrega} onChange={set('direccion_entrega')} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Referencia</label>
                            <input className="form-control" placeholder="Frente al parque, puerta verde..." value={form.referencia} onChange={set('referencia')} />
                        </div>
                        {sinTelefono && (
                            <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: -6, marginBottom: 10 }}>
                                Ingresa el número de teléfono de quien hace el pedido.
                            </div>
                        )}

                        {/* Pago */}
                        <div className="form-label" style={{ marginTop: 4 }}>¿Cómo va a pagar?</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                            {METODOS.map(m => {
                                const Icon = m.icon;
                                return (
                                    <button type="button" key={m.value} className={`btn btn-sm ${form.metodo_pago === m.value ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setForm(f => ({ ...f, metodo_pago: m.value }))}>
                                        <Icon size={12} /> {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {esEfectivo && (
                            <div className="form-group">
                                <label className="form-label">¿Con cuánto paga? <span style={{ color: 'var(--text-muted)' }}>(vacío = exacto)</span></label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <input className="form-control" style={{ flex: '1 1 120px' }} type="number" min="0" step="0.10" placeholder={total.toFixed(2)} value={form.paga_con} onChange={set('paga_con')} />
                                    {BILLETES.filter(b => b >= total).slice(0, 3).map(b => (
                                        <button type="button" key={b} className="btn btn-sm btn-secondary" onClick={() => setForm(f => ({ ...f, paga_con: String(b) }))}>{moneda} {b}</button>
                                    ))}
                                </div>
                                {vuelto > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-green)', marginTop: 6 }}>El repartidor lleva vuelto: {moneda} {vuelto.toFixed(2)}</div>}
                                {pagoInsuficiente && <div style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 6 }}>El monto no cubre el total.</div>}
                            </div>
                        )}
                        {form.metodo_pago === 'tarjeta' && <div style={{ fontSize: 12, color: 'var(--accent-orange, var(--orange))', marginBottom: 10 }}>💳 El repartidor debe llevar el POS.</div>}
                        {['yape', 'plin'].includes(form.metodo_pago) && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Confirma la captura del pago antes de despachar.</div>}

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Costo delivery ({moneda})</label>
                                <input className="form-control" type="number" min="0" step="0.50" value={form.costo_delivery} onChange={set('costo_delivery')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tiempo estimado (min)</label>
                                <input className="form-control" type="number" min="5" max="240" value={form.tiempo_estimado} onChange={set('tiempo_estimado')} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notas para cocina / repartidor</label>
                            <textarea className="form-control" rows={2} placeholder="Sin ensalada, cremas aparte, tocar timbre..." value={form.notas} onChange={set('notas')} />
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Productos {moneda} {totalProductos.toFixed(2)} + delivery {moneda} {costo.toFixed(2)}</span>
                            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-pink)' }}>Total {moneda} {total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || sinTelefono || pagoInsuficiente}>
                            {loading ? 'Registrando...' : 'Registrar pedido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
