import React, { useState, useEffect } from 'react';
import { CriteriaConfig } from '../../types';
import { CriteriaConfigProps } from './types';



const DEFAULT_CRITERIA: CriteriaConfig = {
  estrutura: 'Abertura adequada, apresentação profissional, identificação de necessidade, fechamento claro.',
  spiced: 'Situação, Problema, Impacto, Consequência, Emoção, Decisão identificados corretamente.',
  solucao: 'Apresentação clara da solução, benefícios destacados, valor percebido pelo cliente.',
  objeções: 'Identificação de objeções, tratamento adequado, transformação em oportunidade.',
  rapport: 'Conexão empática, comunicação clara, engajamento mantido, tom profissional e amigável.'
};

export const CriteriaConfigComponent: React.FC<CriteriaConfigProps> = ({ criteria, onSave, onCancel }) => {
  const [formData, setFormData] = useState<CriteriaConfig>(criteria || DEFAULT_CRITERIA);

  // Bloquear scroll e interação do body quando o modal está aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'none';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, []);

  const handleChange = (field: keyof CriteriaConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleReset = () => {
    setFormData(DEFAULT_CRITERIA);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      style={{ pointerEvents: 'auto' }}
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Configurar Critérios de Avaliação</h2>
              <p className="text-sm text-slate-500 mt-1">Defina os critérios para cada pilar do Heatmap Score</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ESTRUTURA */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              📋 ESTRUTURA
            </label>
            <textarea
              value={formData.estrutura}
              onChange={(e) => handleChange('estrutura', e.target.value)}
              placeholder="Ex: Abertura adequada, apresentação profissional, identificação de necessidade, fechamento claro."
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none min-h-[100px] text-sm"
            />
          </div>

          {/* SPICED */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              🔍 SPICED
            </label>
            <textarea
              value={formData.spiced}
              onChange={(e) => handleChange('spiced', e.target.value)}
              placeholder="Ex: Situação, Problema, Impacto, Consequência, Emoção, Decisão identificados corretamente."
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none min-h-[100px] text-sm"
            />
          </div>

          {/* SOLUÇÃO */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              💡 SOLUÇÃO
            </label>
            <textarea
              value={formData.solucao}
              onChange={(e) => handleChange('solucao', e.target.value)}
              placeholder="Ex: Apresentação clara da solução, benefícios destacados, valor percebido pelo cliente."
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none min-h-[100px] text-sm"
            />
          </div>

          {/* OBJEÇÕES */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              🛡️ OBJEÇÕES
            </label>
            <textarea
              value={formData.objeções}
              onChange={(e) => handleChange('objeções', e.target.value)}
              placeholder="Ex: Identificação de objeções, tratamento adequado, transformação em oportunidade."
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none min-h-[100px] text-sm"
            />
          </div>

          {/* RAPPORT */}
          <div className="space-y-2">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              🤝 RAPPORT
            </label>
            <textarea
              value={formData.rapport}
              onChange={(e) => handleChange('rapport', e.target.value)}
              placeholder="Ex: Conexão empática, comunicação clara, engajamento mantido, tom profissional e amigável."
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none min-h-[100px] text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={handleReset}
            className="px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Restaurar Padrão
          </button>
          <div className="flex-1" />
          <button
            onClick={onCancel}
            className="px-6 py-3 border border-slate-300 text-slate-400 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            SALVAR CRITÉRIOS
          </button>
        </div>
      </div>
    </div>
  );
};
