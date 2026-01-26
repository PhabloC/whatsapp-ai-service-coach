import { User } from '@/types';

export interface LoginProps {
  onLogin: (user: User) => void;
}
