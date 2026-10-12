import { useEffect, useState } from 'react';

/** Devuelve `value` recién cuando deja de cambiar durante `delay` ms (para búsquedas). */
export default function useDebounce(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}
