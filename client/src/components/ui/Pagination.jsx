import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Paginador simple para listados paginados en el servidor. */
export default function Pagination({ page, paginas, total, onChange, disabled }) {
    if (!total) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Página {page} de {paginas} · {total} registros
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-secondary" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
                    <ChevronLeft size={13} /> Anterior
                </button>
                <button className="btn btn-sm btn-secondary" disabled={disabled || page >= paginas} onClick={() => onChange(page + 1)}>
                    Siguiente <ChevronRight size={13} />
                </button>
            </div>
        </div>
    );
}
