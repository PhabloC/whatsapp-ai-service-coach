import { supabase } from '../lib/supabase';
import { User } from '../../types';

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export const authService = {
  /**
   * Cadastrar novo usuário
   */
  async signUp(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        return {
          user: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (data.user) {
        return {
          user: {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || name,
          },
          error: null,
        };
      }

      return {
        user: null,
        error: { message: 'Erro ao criar usuário' },
      };
    } catch (err: any) {
      return {
        user: null,
        error: { message: err.message || 'Erro desconhecido ao cadastrar' },
      };
    }
  },

  /**
   * Login com email e senha
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          user: null,
          error: { message: error.message, code: error.code },
        };
      }

      if (data.user) {
        return {
          user: {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || email.split('@')[0],
          },
          error: null,
        };
      }

      return {
        user: null,
        error: { message: 'Credenciais inválidas' },
      };
    } catch (err: any) {
      return {
        user: null,
        error: { message: err.message || 'Erro desconhecido ao fazer login' },
      };
    }
  },

  /**
   * Logout
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: { message: error.message } };
      }
      
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao fazer logout' } };
    }
  },

  /**
   * Obter usuário atual da sessão
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        return {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        };
      }
      
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Recuperar senha (envia email)
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao enviar email de recuperação' } };
    }
  },

  /**
   * Atualizar senha (após clicar no link do email)
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro ao atualizar senha' } };
    }
  },

  /**
   * Listener para mudanças de autenticação
   */
  onAuthStateChange(callback: (user: User | null, event: string) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
        }, event);
      } else {
        callback(null, event);
      }
    });
  },
};
