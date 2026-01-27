import React, { useState } from 'react';
import { LoginProps } from './types';

export const Login: React.FC<LoginProps> = ({ 
  loading = false, 
  error, 
  onSignIn, 
  onClearError,
  onNavigateToRegister,
  onNavigateToReset 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (!email || !password) {
      setLocalError('Preencha todos os campos');
      return;
    }
    
    await onSignIn(email, password);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Coach AI</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
              Acesse sua conta
            </p>
          </div>

          {/* Mensagem de erro */}
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm text-center">
              {displayError}
            </div>
          )}
          
          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                'ENTRAR'
              )}
            </button>
          </form>

          {/* Links de navegação */}
          <div className="space-y-3 text-center">
            <button 
              onClick={onNavigateToReset}
              className="text-sm text-slate-400 hover:text-emerald-500 transition-colors"
            >
              Esqueceu sua senha?
            </button>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Não tem uma conta?{' '}
                <button 
                  onClick={onNavigateToRegister}
                  className="text-emerald-500 font-bold hover:text-emerald-600 transition-colors"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
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
