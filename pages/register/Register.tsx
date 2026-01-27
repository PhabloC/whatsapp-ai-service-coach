import React, { useState } from 'react';
import { RegisterProps } from './types';

export const Register: React.FC<RegisterProps> = ({ 
  loading = false, 
  error, 
  onSignUp, 
  onClearError,
  onNavigateToLogin 
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    onClearError();

    if (!name || !email || !password || !confirmPassword) {
      setLocalError('Preencha todos os campos');
      return;
    }
    
    if (password !== confirmPassword) {
      setLocalError('As senhas não coincidem');
      return;
    }
    
    if (password.length < 6) {
      setLocalError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    const success = await onSignUp(email, password, name);
    if (success) {
      setSuccessMessage('Conta criada! Verifique seu email para confirmar.');
    }
  };

  const displayError = localError || error?.message;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800 animate-fade-in">
        <div className="p-10 space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Coach AI</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
              Crie sua conta
            </p>
          </div>

          {/* Mensagens de erro/sucesso */}
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm text-center">
              {displayError}
            </div>
          )}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-600 text-sm text-center">
              {successMessage}
            </div>
          )}
          
          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all" 
              disabled={loading}
            />

            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all" 
              disabled={loading}
            />

            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all" 
              disabled={loading}
            />

            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar senha" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all" 
              disabled={loading}
            />

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-xl transition-all active:scale-[0.98] tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AGUARDE...
                </span>
              ) : (
                'CRIAR CONTA'
              )}
            </button>
          </form>

          {/* Link para login */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Já tem uma conta?{' '}
              <button 
                onClick={onNavigateToLogin}
                className="text-emerald-500 font-bold hover:text-emerald-600 transition-colors"
              >
                Entrar
              </button>
            </p>
          </div>

          {/* Versão */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center">
              Versão 1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
