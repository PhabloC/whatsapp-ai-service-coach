import { AuthError } from '../../src/services/auth-service';

export interface LoginProps {
  loading?: boolean;
  error?: AuthError | null;
  onSignIn: (email: string, password: string) => Promise<boolean>;
  onClearError: () => void;
  onNavigateToRegister: () => void;
  onNavigateToReset: () => void;
}
