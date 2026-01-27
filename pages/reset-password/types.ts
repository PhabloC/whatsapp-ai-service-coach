import { AuthError } from '../../src/services/auth-service';

export interface ResetPasswordProps {
  loading?: boolean;
  error?: AuthError | null;
  onResetPassword: (email: string) => Promise<boolean>;
  onClearError: () => void;
  onNavigateToLogin: () => void;
}
