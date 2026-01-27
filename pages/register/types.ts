import { AuthError } from '../../src/services/auth-service';

export interface RegisterProps {
  loading?: boolean;
  error?: AuthError | null;
  onSignUp: (email: string, password: string, name: string) => Promise<boolean>;
  onClearError: () => void;
  onNavigateToLogin: () => void;
}
