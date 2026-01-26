import React from 'react';
import { LoginProps } from './types';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ id: 'u1', email: 'admin@coach.ai', name: 'Gestor de Atendimento' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800 animate-fade-in">
        <div className="p-10 space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Coach AI</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Plataforma de Auditoria</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="email" 
              defaultValue="admin@coach.ai" 
              placeholder="E-mail Administrativo" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all" 
              required 
            />
            <input 
              type="password" 
              defaultValue="password" 
              placeholder="Senha" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-all" 
              required 
            />
            <button 
              type="submit" 
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-xl transition-all active:scale-[0.98] tracking-widest text-sm"
            >
              ENTRAR
            </button>
          </form>

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
