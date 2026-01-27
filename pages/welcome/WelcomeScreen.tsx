import React from 'react';
import { WelcomeScreenProps } from './types';



export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  userName, 
  onLogout, 
  onConnect 
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6">
      <div className="w-full max-w-lg bg-white p-12 rounded-3xl shadow-xl text-center space-y-8 border border-slate-100 animate-fade-in">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800">Bem-vindo, {userName}!</h2>
          <p className="text-slate-500 text-sm">Conecte sua primeira instância do WhatsApp para começar a monitorar atendimentos.</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-slate-700 text-sm">O que você pode fazer:</h3>
          <ul className="text-sm text-slate-500 space-y-2 text-left">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Monitorar conversas em tempo real
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Auditar qualidade de atendimento com IA
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Acompanhar evolução dos atendentes
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Personalizar prompts por departamento
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onLogout} 
            className="flex-1 py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
          >
            Sair
          </button>
          <button 
            onClick={onConnect}
            className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            CONECTAR WHATSAPP
          </button>
        </div>
      </div>
    </div>
  );
};
