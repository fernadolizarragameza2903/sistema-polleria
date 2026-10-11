import { create } from 'zustand';
import api from '../api/axios';

const useConfigStore = create((set) => ({
    config: {},
    loaded: false,
    fetchConfig: async () => {
        try {
            const r = await api.get('/configuracion');
            set({ config: r.data.configuracion, loaded: true });
        } catch {
            set({ loaded: true });
        }
    },
}));

export default useConfigStore;
