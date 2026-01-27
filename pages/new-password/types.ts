import { AuthError } from '../../src/services/auth-service';

export interface NewPasswordProps {
  loading?: boolean;
  error?: AuthError | null;
  onUpdatePassword: (password: string) => Promise<boolean>;
  onClearError: () => void;
  onNavigateToLogin: () => void;
}
