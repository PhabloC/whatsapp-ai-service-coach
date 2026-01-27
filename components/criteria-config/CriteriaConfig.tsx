import React, { useState, useEffect } from 'react';
import { CriteriaConfig } from '../../types';
import { CriteriaConfigProps } from './types';
import { promptService } from '../../src/services/prompt-service';
import { generateCustomPrompt } from '../../geminiService';

const DEFAULT_CRITERIA: CriteriaConfig = {
  estrutura: 'Abertura adequada, apresentação profissional, identificação de necessidade, fechamento claro.',
  spiced: 'Situação, Problema, Impacto, Consequência, Emoção, Decisão identificados corretamente.',
  solucao: 'Apresentação clara da solução, benefícios destacados, valor percebido pelo cliente.',
  objeções: 'Identificação de objeções, tratamento adequado, transformação em oportunidade.',
  rapport: 'Conexão empática, comunicação clara, engajamento mantido, tom profissional e amigável.'
};

export const CriteriaConfigComponent: React.FC<CriteriaConfigProps> = ({ criteria, userId, onSave, onCancel }) => {
  const [formData, setFormData] = useState<CriteriaConfig>(criteria || DEFAULT_CRITERIA);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    // Limpar prompt gerado quando critérios mudam
    setGeneratedPrompt(null);
    setShowPromptPreview(false);
  };

  const handleGeneratePrompt = async () => {
    setIsGeneratingPrompt(true);
    setSaveError(null);
    
    try {
      const result = await generateCustomPrompt(formData);
      setGeneratedPrompt(result.prompt);
      setShowPromptPreview(true);
    } catch (error) {
      console.error('Erro ao gerar prompt:', error);
      setSaveError('Erro ao gerar prompt. Verifique a configuração da API.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Se não tem prompt gerado ainda, gerar antes de salvar
      let promptToSave = generatedPrompt;
      
      if (!promptToSave) {
        setIsGeneratingPrompt(true);
        const result = await generateCustomPrompt(formData);
        promptToSave = result.prompt;
        setGeneratedPrompt(promptToSave);
        setIsGeneratingPrompt(false);
      }

      // Salvar no Supabase se tiver userId
      if (userId) {
        const response = await promptService.saveCriteria(userId, formData, promptToSave);
        
        if (response.error) {
          throw new Error(response.error.message);
        }
      }

      // Chamar callback do pai com o prompt gerado
      onSave(formData, promptToSave || undefined);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setSaveError(error instanceof Error ? error.message : 'Erro ao salvar critérios');
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(DEFAULT_CRITERIA);
    setGeneratedPrompt(null);
    setShowPromptPreview(false);
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

          {/* Seção de Preview do Prompt Gerado */}
          {showPromptPreview && generatedPrompt && (
            <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Prompt Gerado pela IA
                </h4>
                <button
                  onClick={() => setShowPromptPreview(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200 max-h-48 overflow-y-auto">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{generatedPrompt}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Este prompt será usado automaticamente para avaliar as conversas.
              </p>
            </div>
          )}

          {/* Mensagem de Erro */}
          {saveError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {saveError}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={isSaving || isGeneratingPrompt}
              className="px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Restaurar Padrão
            </button>
            
            <button
              onClick={handleGeneratePrompt}
              disabled={isSaving || isGeneratingPrompt}
              className="px-6 py-3 border-2 border-emerald-500 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isGeneratingPrompt ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Gerar Prompt
                </>
              )}
            </button>
            
            <div className="flex-1" />
            
            <button
              onClick={onCancel}
              disabled={isSaving || isGeneratingPrompt}
              className="px-6 py-3 border border-slate-300 text-slate-400 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving || isGeneratingPrompt}
              className="px-6 py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </>
              ) : (
                'SALVAR CRITÉRIOS'
              )}
            </button>
          </div>
          
          {!generatedPrompt && (
            <p className="mt-3 text-xs text-slate-500 text-center">
              Ao salvar, um prompt personalizado será gerado automaticamente com base nos seus critérios.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
