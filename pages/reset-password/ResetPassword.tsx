import React, { useState } from 'react';
import { ResetPasswordProps } from './types';

export const ResetPassword: React.FC<ResetPasswordProps> = ({ 
  loading = false, 
  error, 
  onResetPassword, 
  onClearError,
  onNavigateToLogin 
}) => {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    onClearError();

    if (!email) {
      setLocalError('Informe seu email');
      return;
    }
    
    const success = await onResetPassword(email);
    if (success) {
      setSuccessMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Coach AI</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
              Recuperar senha
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

          {/* Descrição */}
          <p className="text-sm text-slate-500 text-center">
            Digite seu email e enviaremos um link para você redefinir sua senha.
          </p>
          
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
                'ENVIAR EMAIL'
              )}
            </button>
          </form>

          {/* Link para login */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <button 
              onClick={onNavigateToLogin}
              className="text-sm text-emerald-500 font-bold hover:text-emerald-600 transition-colors"
            >
              Voltar ao login
            </button>
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
