import { useState, useEffect } from 'react';
import { User } from '../../types';
import { authService, AuthError } from '../services/auth-service';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  isRecoveryMode: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  clearError: () => void;
  clearRecoveryMode: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    // Verificar sessão existente ao carregar
    const checkSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = authService.onAuthStateChange((authUser, event) => {
      // Detectar se é um evento de recuperação de senha
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setUser(authUser);
      } else {
        setUser(authUser);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const response = await authService.signIn(email, password);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return false;
    }

    setUser(response.user);
    setLoading(false);
    return true;
  };

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    const response = await authService.signUp(email, password, name);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return false;
    }

    setUser(response.user);
    setLoading(false);
    return true;
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    const response = await authService.signOut();
    
    if (response.error) {
      setError(response.error);
    }
    
    setUser(null);
    setLoading(false);
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setError(null);
    const response = await authService.resetPassword(email);
    
    if (response.error) {
      setError(response.error);
      return false;
    }
    
    return true;
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    const response = await authService.updatePassword(newPassword);
    
    if (response.error) {
      setError(response.error);
      setLoading(false);
      return false;
    }
    
    setIsRecoveryMode(false);
    setLoading(false);
    return true;
  };

  const clearError = () => setError(null);
  const clearRecoveryMode = () => setIsRecoveryMode(false);

  return {
    user,
    loading,
    error,
    isRecoveryMode,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
    clearRecoveryMode,
  };
}
