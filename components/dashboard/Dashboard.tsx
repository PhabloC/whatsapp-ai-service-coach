import React, { useMemo } from 'react';
import { ChatSession, HeatmapAnalysis, ConnectionInstance } from '../../types';

interface DashboardProps {
  sessions: ChatSession[];
  connections: ConnectionInstance[];
}

interface SourceStats {
  sourceId: string;
  sourceName: string;
  totalSessions: number;
  totalAnalyses: number;
  averageScore: number;
  heatmaps: HeatmapAnalysis[];
  averageHeatmap: {
    estrutura: number;
    spiced: number;
    solucao: number;
    objeções: number;
    rapport: number;
    nota_final: number;
  };
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

export const Dashboard: React.FC<DashboardProps> = ({ sessions, connections }) => {
  // Agrupar sessões por fonte (instância)
  const sourceStats = useMemo(() => {
    const statsMap = new Map<string, SourceStats>();

    sessions.forEach(session => {
      // Extrair sourceId do sessionId (formato: instanceId-contactJid)
      // O sessionId é criado como `${instanceId}-${clientJid}`, então precisamos pegar tudo antes do último '-'
      // Mas pode ter múltiplos '-' no clientJid, então vamos usar uma abordagem diferente
      // Vamos procurar o instanceId nas connections que corresponde ao início do sessionId
      let sourceId = '';
      let sourceName = 'Fonte Desconhecida';
      
      // Tentar encontrar a conexão que corresponde ao início do sessionId
      for (const conn of connections) {
        if (session.id.startsWith(conn.id + '-')) {
          sourceId = conn.id;
          sourceName = conn.name;
          break;
        }
      }
      
      // Se não encontrou, tentar extrair do formato padrão
      if (!sourceId) {
        // Assumir que instanceId começa com "instance-"
        const match = session.id.match(/^(instance-[^-]+)/);
        if (match) {
          sourceId = match[1];
          const connection = connections.find(c => c.id === sourceId);
          sourceName = connection?.name || `Fonte ${sourceId.slice(-6)}`;
        } else {
          // Fallback: usar primeira parte antes do primeiro '-'
          sourceId = session.id.split('-')[0];
          const connection = connections.find(c => c.id === sourceId);
          sourceName = connection?.name || `Fonte ${sourceId.slice(-6)}`;
        }
      }

      if (!statsMap.has(sourceId)) {
        statsMap.set(sourceId, {
          sourceId,
          sourceName,
          totalSessions: 0,
          totalAnalyses: 0,
          averageScore: 0,
          heatmaps: [],
          averageHeatmap: {
            estrutura: 0,
            spiced: 0,
            solucao: 0,
            objeções: 0,
            rapport: 0,
            nota_final: 0,
          },
        });
      }

      const stats = statsMap.get(sourceId)!;
      stats.totalSessions++;

      // Coletar heatmaps
      if (session.heatmapHistory && session.heatmapHistory.length > 0) {
        session.heatmapHistory.forEach(entry => {
          stats.heatmaps.push(entry.analysis);
        });
      }

      // Coletar análises clássicas
      if (session.analysisHistory.length > 0) {
        stats.totalAnalyses += session.analysisHistory.length;
      }
    });

    // Calcular médias
    const finalStats: SourceStats[] = [];
    statsMap.forEach((stats, sourceId) => {
      // Calcular média de score das análises clássicas
      let totalScore = 0;
      let scoreCount = 0;
      sessions
        .filter(s => s.id.startsWith(sourceId))
        .forEach(session => {
          session.analysisHistory.forEach(analysis => {
            totalScore += analysis.result.score;
            scoreCount++;
          });
        });
      stats.averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;

      // Calcular média dos heatmaps
      if (stats.heatmaps.length > 0) {
        const totals = stats.heatmaps.reduce((acc, h) => ({
          estrutura: acc.estrutura + h.analise.estrutura.nota,
          spiced: acc.spiced + h.analise.spiced.nota,
          solucao: acc.solucao + h.analise.solucao.nota,
          objeções: acc.objeções + h.analise.objeções.nota,
          rapport: acc.rapport + h.analise.rapport.nota,
          nota_final: acc.nota_final + h.nota_final,
        }), { estrutura: 0, spiced: 0, solucao: 0, objeções: 0, rapport: 0, nota_final: 0 });

        stats.averageHeatmap = {
          estrutura: totals.estrutura / stats.heatmaps.length,
          spiced: totals.spiced / stats.heatmaps.length,
          solucao: totals.solucao / stats.heatmaps.length,
          objeções: totals.objeções / stats.heatmaps.length,
          rapport: totals.rapport / stats.heatmaps.length,
          nota_final: totals.nota_final / stats.heatmaps.length,
        };
      }

      finalStats.push(stats);
    });

    return finalStats.sort((a, b) => b.averageHeatmap.nota_final - a.averageHeatmap.nota_final);
  }, [sessions, connections]);

  const overallAverage = useMemo(() => {
    if (sourceStats.length === 0) return null;
    const total = sourceStats.reduce((sum, s) => sum + s.averageHeatmap.nota_final, 0);
    return total / sourceStats.length;
  }, [sourceStats]);

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-slate-800">Dashboard Geral</h2>
        <p className="text-sm text-slate-500">Visão consolidada de performance por fonte</p>
      </div>

      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
          <div className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-2">Média Geral</div>
          <div className="text-4xl font-black text-emerald-700">
            {overallAverage ? overallAverage.toFixed(1) : '0.0'}
          </div>
          <div className="text-xs text-emerald-600 mt-1">Nota média de todas as fontes</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">Total de Sessões</div>
          <div className="text-4xl font-black text-blue-700">{sessions.length}</div>
          <div className="text-xs text-blue-600 mt-1">Conversas monitoradas</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="text-xs font-black text-purple-600 uppercase tracking-wider mb-2">Fontes Ativas</div>
          <div className="text-4xl font-black text-purple-700">{sourceStats.length}</div>
          <div className="text-xs text-purple-600 mt-1">Instâncias conectadas</div>
        </div>
      </div>

      {/* Heatmap por Fonte */}
      {sourceStats.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-400 font-medium">Nenhum dado disponível</p>
          <p className="text-xs text-slate-300 mt-1">Gere análises de heatmap para ver os dados aqui</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sourceStats.map((source) => (
            <div key={source.sourceId} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              {/* Header da Fonte */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800">{source.sourceName}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span>{source.totalSessions} sessões</span>
                    <span>•</span>
                    <span>{source.heatmaps.length} heatmaps</span>
                    <span>•</span>
                    <span>{source.totalAnalyses} análises</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-slate-800">
                    {source.averageHeatmap.nota_final.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-400">Média Final</div>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {PILARES.map((pilar) => {
                  const nota = source.averageHeatmap[pilar.key as keyof typeof source.averageHeatmap] as number;
                  const intensidade = Math.min(100, (nota / 10) * 100);

                  return (
                    <div
                      key={pilar.key}
                      className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{pilar.emoji}</span>
                          <span className="font-bold text-slate-700 text-xs">{pilar.label}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-lg ${getScoreColor(nota)} text-white font-black text-xs`}>
                          {nota.toFixed(1)}
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getScoreColor(nota)} transition-all duration-500`}
                          style={{ width: `${intensidade}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Score Médio Clássico (se disponível) */}
              {source.averageScore > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Score Médio (Análises Clássicas):</span>
                    <span className={`font-black ${
                      source.averageScore >= 70 ? 'text-emerald-500' : 
                      source.averageScore >= 50 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {source.averageScore.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};
