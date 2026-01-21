import React, { useState, useEffect } from 'react';
import { StageInfo, QRCodeScannerProps } from './types';



const STAGE_INFO: Record<'idle' | 'scanning' | 'authenticating' | 'syncing' | 'connected', StageInfo> = {
  idle: { title: 'Aguardando', description: 'Escaneie o QR Code com seu WhatsApp', progress: 0 },
  scanning: { title: 'QR Detectado', description: 'Lendo informações do dispositivo...', progress: 25 },
  authenticating: { title: 'Autenticando', description: 'Verificando credenciais de segurança...', progress: 50 },
  syncing: { title: 'Sincronizando', description: 'Carregando conversas e contatos...', progress: 75 },
  connected: { title: 'Conectado!', description: 'Instância pronta para monitoramento', progress: 100 }
};

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onConnect, onCancel }) => {
  const [stage, setStage] = useState<'idle' | 'scanning' | 'authenticating' | 'syncing' | 'connected'>('idle');
  const [qrCode, setQrCode] = useState<string>('');
  const [countdown, setCountdown] = useState(120);

  // Gera QR Code dinâmico
  useEffect(() => {
    const generateQR = () => {
      const timestamp = Date.now();
      const randomToken = Math.random().toString(36).substring(2, 15);
      setQrCode(`coach-ai-${timestamp}-${randomToken}`);
    };

    generateQR();
    const interval = setInterval(generateQR, 30000); // Atualiza a cada 30s

    return () => clearInterval(interval);
  }, []);

  // Countdown do QR Code
  useEffect(() => {
    if (stage === 'idle' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0) {
      setQrCode(`coach-ai-expired-${Date.now()}`);
      setCountdown(120);
    }
  }, [countdown, stage]);

  // Simula fluxo de conexão
  const handleStartConnection = () => {
    setStage('scanning');
    
    setTimeout(() => setStage('authenticating'), 1500);
    setTimeout(() => setStage('syncing'), 3000);
    setTimeout(() => {
      setStage('connected');
      setTimeout(onConnect, 1000);
    }, 5000);
  };

  const stageInfo = STAGE_INFO[stage];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6">
      <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-2xl text-center space-y-6 border border-slate-100 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800">Conectar WhatsApp</h2>
          <p className="text-slate-500 text-sm">
            {stage === 'idle' 
              ? 'Escaneie o QR Code abaixo para sincronizar uma nova instância de monitoramento.'
              : stageInfo.description
            }
          </p>
        </div>

        {/* Progress Bar */}
        {stage !== 'idle' && (
          <div className="space-y-2 animate-slide-up">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-600">{stageInfo.title}</span>
              <span className="text-slate-400">{stageInfo.progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stageInfo.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* QR Code Area */}
        <div className="relative aspect-square w-64 mx-auto bg-white rounded-3xl flex items-center justify-center border-2 border-slate-100 shadow-inner overflow-hidden">
          {stage === 'idle' ? (
            <>
              <div className="qr-scanner absolute inset-0 pointer-events-none" />
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} 
                alt="QR Code" 
                className="w-full h-full p-4 opacity-90" 
              />
              {/* Countdown Badge */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 rounded-lg">
                <span className="text-[10px] font-bold text-white">
                  {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </>
          ) : stage === 'connected' ? (
            <div className="flex flex-col items-center gap-4 animate-slide-up">
              <div className="relative">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse-ring opacity-30" />
              </div>
              <p className="text-sm font-black text-emerald-600 uppercase tracking-widest">Conectado!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {stage === 'scanning' && (
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  )}
                  {stage === 'authenticating' && (
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {stage === 'syncing' && (
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">
                {stageInfo.title}
              </p>
            </div>
          )}
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-center gap-2">
          {(['scanning', 'authenticating', 'syncing', 'connected'] as ('idle' | 'scanning' | 'authenticating' | 'syncing' | 'connected')[]).map((s, i) => (
            <div 
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                STAGE_INFO[stage].progress >= STAGE_INFO[s].progress 
                  ? 'bg-emerald-500' 
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Instructions */}
        {stage === 'idle' && (
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3 text-left">
            <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Como conectar:</h4>
            <ol className="text-xs text-slate-500 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                <span>Abra o WhatsApp no seu celular</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                <span>Toque em Menu (⋮) ou Configurações e selecione "Dispositivos conectados"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                <span>Toque em "Conectar um dispositivo" e escaneie o código</span>
              </li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
            disabled={stage !== 'idle' && stage !== 'connected'}
          >
            Cancelar
          </button>
          <button 
            onClick={handleStartConnection} 
            disabled={stage !== 'idle'}
            className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {stage === 'idle' ? 'SIMULAR CONEXÃO' : 'CONECTANDO...'}
          </button>
        </div>
      </div>
    </div>
  );
};
