import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set) => ({
            token: null,
            usuario: null,
            setAuth: (token, usuario) => set({ token, usuario }),
            logout: () => set({ token: null, usuario: null }),
        }),
        { name: 'polleria-auth' }
    )
);

export default useAuthStore;
