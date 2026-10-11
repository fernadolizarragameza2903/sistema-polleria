import { create } from 'zustand';

const useCartStore = create((set, get) => ({
    items: [],
    tipoVenta: 'local',
    metodoPago: 'efectivo',
    clienteId: null,
    descuento: 0,
    montoRecibido: 0,

    setTipoVenta: (t) => set({ tipoVenta: t }),
    setMetodoPago: (m) => set({ metodoPago: m }),
    setClienteId: (id) => set({ clienteId: id }),
    setDescuento: (d) => set({ descuento: d }),
    setMontoRecibido: (m) => set({ montoRecibido: m }),

    addItem: (producto) => {
        const items = get().items;
        const idx = items.findIndex(i => i.producto_id === producto.id);
        if (idx >= 0) {
            const updated = [...items];
            updated[idx].cantidad += 1;
            updated[idx].subtotal = updated[idx].cantidad * updated[idx].precio_unitario;
            set({ items: updated });
        } else {
            set({ items: [...items, { producto_id: producto.id, nombre: producto.nombre, precio_unitario: parseFloat(producto.precio), cantidad: 1, subtotal: parseFloat(producto.precio), descuento: 0 }] });
        }
    },

    updateQty: (id, qty) => {
        if (qty <= 0) { get().removeItem(id); return; }
        set({ items: get().items.map(i => i.producto_id === id ? { ...i, cantidad: qty, subtotal: qty * i.precio_unitario } : i) });
    },

    removeItem: (id) => set({ items: get().items.filter(i => i.producto_id !== id) }),

    clear: () => set({ items: [], tipoVenta: 'local', metodoPago: 'efectivo', clienteId: null, descuento: 0, montoRecibido: 0 }),

    get subtotal() { return get().items.reduce((s, i) => s + i.subtotal, 0); },
    get total() { return Math.max(0, get().items.reduce((s, i) => s + i.subtotal, 0) - get().descuento); },
    get vuelto() { return Math.max(0, get().montoRecibido - get().total); },
}));

export default useCartStore;
