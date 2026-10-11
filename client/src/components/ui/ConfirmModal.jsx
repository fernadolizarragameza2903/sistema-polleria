import { AlertTriangle, Trash2, ToggleRight, Info } from 'lucide-react';

/**
 * Modal de confirmación profesional reutilizable.
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string
 *  - confirmLabel: string (default "Confirmar")
 *  - cancelLabel: string (default "Cancelar")
 *  - type: 'danger' | 'warning' | 'info' (default 'danger')
 *  - onConfirm: () => void
 *  - onCancel: () => void
 */
export default function ConfirmModal({
    open, title, message,
    confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
    type = 'danger', onConfirm, onCancel,
}) {
    if (!open) return null;

    const config = {
        danger: { icon: Trash2, bg: 'var(--red-light)', color: 'var(--red)', btn: 'btn-danger', iconBg: '#fee2e2' },
        warning: { icon: AlertTriangle, bg: 'var(--yellow-light)', color: '#b45309', btn: 'btn-warning', iconBg: '#fef3c7' },
        info: { icon: Info, bg: 'var(--blue-light)', color: 'var(--blue)', btn: 'btn-primary', iconBg: '#dbeafe' },
    }[type];

    const Icon = config.icon;

    return (
        <div
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(15, 17, 25, 0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2000, padding: 20,
                backdropFilter: 'blur(4px)',
                animation: 'fadeIn 0.15s ease',
            }}
            onClick={e => e.target === e.currentTarget && onCancel?.()}
        >
            <div style={{
                background: '#fff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 420,
                boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
                animation: 'slideUp 0.18s ease',
                overflow: 'hidden',
            }}>
                {/* Franja de color superior */}
                <div style={{ height: 4, background: config.color, width: '100%' }} />

                <div style={{ padding: '28px 28px 20px' }}>
                    {/* Ícono + Título */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                        <div style={{
                            width: 48, height: 48,
                            borderRadius: 12,
                            background: config.iconBg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Icon size={22} color={config.color} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#111827', lineHeight: 1.2 }}>{title}</div>
                            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Sistema Pollería</div>
                        </div>
                    </div>

                    {/* Mensaje */}
                    <div style={{
                        background: config.bg,
                        border: `1px solid ${config.color}22`,
                        borderRadius: 10,
                        padding: '12px 16px',
                        fontSize: 13.5,
                        color: '#374151',
                        lineHeight: 1.6,
                    }}>
                        {message}
                    </div>
                </div>

                {/* Footer botones */}
                <div style={{
                    display: 'flex', gap: 10, justifyContent: 'flex-end',
                    padding: '0 28px 22px',
                }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                        style={{ minWidth: 100 }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className={`btn ${config.btn}`}
                        onClick={onConfirm}
                        style={{ minWidth: 130, fontWeight: 700 }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
