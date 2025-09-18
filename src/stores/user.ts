import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';
import type { Profile } from '@/types';

export const useUserStore = defineStore('user', {
  state: () => ({
    session: null as any | null,
    profile: null as Profile | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.session,
    isAdmin: (state) => state.profile?.role === 'admin',
    user: (state) => state.session?.user,
  },

  actions: {
    async fetchSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Erro ao buscar sessão:', error);
        return;
      }
      this.session = data.session;
      if (this.session) {
        await this.fetchProfile();
      }
    },

    async fetchProfile() {
      if (!this.session?.user) return;
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*, allowed_regions, gestao_click_id, store_id')
          .eq('id', this.session.user.id)
          .single();

        if (error) throw error;
        this.profile = profileData;
      } catch (e) {
        console.error('Erro ao buscar perfil do usuário:', e);
        this.profile = null;
      }
    },

    // ===== INÍCIO DA CORREÇÃO =====
    async signOut() {
        const { error } = await supabase.auth.signOut();

        // Se houver um erro, registre-o, mas não impeça o logout do frontend.
        if (error) {
            console.error('Erro no logout do Supabase:', error.message);
        }

        // Limpa o estado local de qualquer maneira para garantir que o usuário seja deslogado da interface.
        this.session = null;
        this.profile = null;
    },
    // ===== FIM DA CORREÇÃO =====
  },
});
