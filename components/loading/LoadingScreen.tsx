import React from 'react';
import { LoadingScreenProps } from './types';



export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Carregando...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-sm">{message}</p>
      </div>
    </div>
  );
};
