import React from 'react';
import { HeatmapAnalysis } from '../../types';

interface HeatmapScoreProps {
  analysis: HeatmapAnalysis;
}

const PILARES = [
  { key: 'estrutura', label: 'ESTRUTURA', emoji: '📋' },
  { key: 'spiced', label: 'SPICED', emoji: '🔍' },
  { key: 'solucao', label: 'SOLUÇÃO', emoji: '💡' },
  { key: 'objeções', label: 'OBJEÇÕES', emoji: '🛡️' },
  { key: 'rapport', label: 'RAPPORT', emoji: '🤝' },
] as const;

const getScoreColor = (nota: number): string => {
  if (nota >= 8) return 'bg-emerald-500';
  if (nota >= 6) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Destaque':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'Alerta':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  }
};

export const HeatmapScore: React.FC<HeatmapScoreProps> = ({ analysis }) => {
  const { analise, nota_final, performance_status } = analysis;

  return (
    <div className="space-y-6">
      {/* Header com Nota Final e Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
          <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nota Final</div>
          <div className="text-4xl font-black text-slate-800">{nota_final.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">Média dos 5 pilares</div>
        </div>
        <div className={`rounded-2xl p-6 border-2 ${getStatusColor(performance_status)}`}>
          <div className="text-xs font-black uppercase tracking-wider mb-2">Status</div>
          <div className="text-2xl font-black">{performance_status}</div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PILARES.map((pilar) => {
          const pilarData = analise[pilar.key];
          const nota = pilarData.nota;
          const intensidade = Math.min(100, (nota / 10) * 100);

          return (
            <div
              key={pilar.key}
              className="bg-white rounded-xl border-2 border-slate-200 p-5 hover:shadow-lg transition-all"
            >
              {/* Header do Pilar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pilar.emoji}</span>
                  <span className="font-black text-slate-800 text-sm">{pilar.label}</span>
                </div>
                <div className={`px-3 py-1 rounded-lg ${getScoreColor(nota)} text-white font-black text-sm`}>
                  {nota.toFixed(1)}
                </div>
              </div>

              {/* Barra de Progresso Visual */}
              <div className="mb-4">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreColor(nota)} transition-all duration-500`}
                    style={{ width: `${intensidade}%` }}
                  />
                </div>
              </div>

              {/* Justificativa */}
              <div className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {pilarData.justificativa}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visualização de Notas em Lista */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">Detalhamento por Pilar</h4>
        <div className="space-y-3">
          {PILARES.map((pilar) => {
            const pilarData = analise[pilar.key];
            return (
              <div key={pilar.key} className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{pilar.emoji}</span>
                    <span className="font-bold text-slate-700 text-sm">{pilar.label}</span>
                    <span className={`px-2 py-0.5 rounded ${getScoreColor(pilarData.nota)} text-white text-xs font-black`}>
                      {pilarData.nota.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{pilarData.justificativa}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
