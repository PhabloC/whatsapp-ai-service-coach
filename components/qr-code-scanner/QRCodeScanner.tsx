import React, { useState, useEffect, useRef } from 'react';
import { StageInfo, QRCodeScannerProps } from './types';
import { whatsappAPI } from '../../src/services/whatsapp-api';

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
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para manter o instanceId atualizado nos callbacks (evita stale closure)
  const instanceIdRef = useRef<string | null>(null);
  
  // Ref para callbacks (evita re-execução do useEffect quando props mudam)
  const onConnectRef = useRef(onConnect);
  onConnectRef.current = onConnect;
  
  // Ref para controlar se já criou instância (evita criar múltiplas)
  const instanceCreatedRef = useRef(false);

  useEffect(() => {
    // Evitar criar múltiplas instâncias
    if (instanceCreatedRef.current) {
      return;
    }
    
    // Conectar WebSocket
    whatsappAPI.connect();

    // Listener para QR Code - SOMENTE aceita QR da instância atual
    const handleQR = (data: { instanceId: string; qrCode: string }) => {
      const currentId = instanceIdRef.current;
      if (!currentId || data.instanceId !== currentId) {
        return; // Ignorar QR de outras instâncias
      }
      
      // Só atualizar QR se não tiver um válido (countdown > 0)
      let shouldAcceptNewQR = false;
      
      setCountdown(prevCountdown => {
        setQrCode(prevQrCode => {
          // Se já tem QR e countdown > 0, não atualizar
          if (prevQrCode && prevCountdown > 0) {
            return prevQrCode; // Manter QR atual
          }
          // QR expirado ou não existe, aceitar novo
          shouldAcceptNewQR = true;
          return data.qrCode;
        });
        
        // Se aceitou novo QR, resetar countdown; senão manter
        if (shouldAcceptNewQR) {
          return 120;
        }
        return prevCountdown;
      });
      
      setStage('scanning');
      console.log('QR Code processado via WebSocket:', data.instanceId);
    };

    // Listener para conexão estabelecida
    const handleConnected = (data: { instanceId: string; phoneNumber?: string }) => {
      const currentId = instanceIdRef.current;
      
      if (!currentId || data.instanceId !== currentId) {
        return;
      }
      
      console.log('Conexão detectada via WebSocket:', data.instanceId);
      setStage('connected');
      setTimeout(() => {
        onConnectRef.current(data.instanceId);
      }, 1000);
    };

    // Listener para desconexão
    const handleDisconnected = (data: { instanceId: string }) => {
      const currentId = instanceIdRef.current;
      if (!currentId || data.instanceId !== currentId) {
        return;
      }
      setStage('idle');
      setQrCode('');
    };

    whatsappAPI.on('qr', handleQR);
    whatsappAPI.on('instance_connected', handleConnected);
    whatsappAPI.on('instance_disconnected', handleDisconnected);

    // Criar nova instância após configurar listeners
    const createInstance = async () => {
      // Verificar se já criou instância
      if (instanceCreatedRef.current) {
        return;
      }
      
      // Marcar como criando (antes de criar para evitar race condition)
      instanceCreatedRef.current = true;
      
      try {
        setError(null);
        setStage('idle');
        console.log('Criando instância WhatsApp...');
        const instance = await whatsappAPI.createInstance(`Instância ${new Date().toLocaleTimeString()}`);
        console.log('Instância criada:', instance.id);
        instanceIdRef.current = instance.id; // Atualizar ref imediatamente
        setInstanceId(instance.id);
        setStage('scanning');
      } catch (err: any) {
        instanceCreatedRef.current = false; // Permitir retry em caso de erro
        setError(err.message || 'Erro ao criar instância');
        console.error('Erro ao criar instância:', err);
        setStage('idle');
      }
    };

    // Aguardar um pouco para garantir que WebSocket está conectado
    const timer = setTimeout(() => {
      createInstance();
    }, 500);

    return () => {
      clearTimeout(timer);
      whatsappAPI.off('qr', handleQR);
      whatsappAPI.off('instance_connected', handleConnected);
      whatsappAPI.off('instance_disconnected', handleDisconnected);
    };
  }, []); // Array vazio - executar apenas uma vez na montagem

  // Countdown do QR Code
  useEffect(() => {
    if (stage === 'scanning' && countdown > 0 && qrCode) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    
    // Verificar countdown === 0 independente do qrCode
    if (countdown === 0 && stage === 'scanning') {
      // QR Code expirado, limpar e buscar novo
      setQrCode('');
      
      // Forçar busca de novo QR Code imediatamente
      const currentId = instanceIdRef.current;
      if (currentId) {
        whatsappAPI.getQRCode(currentId).then(qrData => {
          if (qrData.hasQR && qrData.qrCode) {
            setQrCode(qrData.qrCode);
            setCountdown(120); // Resetar countdown com novo QR
          } else {
            // Se não tem QR disponível, resetar countdown para tentar novamente
            setCountdown(120);
          }
        }).catch(err => {
          console.error('Erro ao buscar novo QR Code:', err);
          setCountdown(120); // Resetar countdown mesmo em erro
        });
      } else {
        setCountdown(120);
      }
    }
  }, [countdown, stage, qrCode]);

  // Buscar status periodicamente APENAS para verificar conexão (não para QR Code)
  useEffect(() => {
    if (!instanceId) return;
    
    let intervalId: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    const checkConnectionStatus = async () => {
      if (isCleanedUp) return true;
      
      try {
        const qrData = await whatsappAPI.getQRCode(instanceId);
        
        // Verificar se conectou
        if (qrData.status === 'connected') {
          console.log('✅ Conexão detectada via polling!');
          setStage('connected');
          setQrCode('');
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setTimeout(() => {
            if (!isCleanedUp) {
              onConnectRef.current(instanceId);
            }
          }, 1000);
          return true;
        }
        
        // Só buscar QR se não tiver nenhum ainda
        if (!qrCode && qrData.hasQR && qrData.qrCode) {
          setQrCode(qrData.qrCode);
          setStage('scanning');
          setCountdown(120);
        }
        
        return false;
      } catch (err) {
        console.error('Erro ao verificar status:', err);
        return false;
      }
    };

    // Polling lento (5 segundos) apenas para verificar conexão
    intervalId = setInterval(async () => {
      const shouldStop = await checkConnectionStatus();
      if (shouldStop && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 5000);
    
    // Fazer uma verificação inicial após 1 segundo
    const initialCheck = setTimeout(() => {
      checkConnectionStatus();
    }, 1000);
    
    return () => {
      isCleanedUp = true;
      clearTimeout(initialCheck);
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [instanceId, qrCode]);

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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
            {error}
          </div>
        )}

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
          {!qrCode && stage === 'scanning' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">
                  Gerando QR Code...
                </p>
                <p className="text-[10px] text-slate-400">
                  Aguarde alguns segundos
                </p>
              </div>
            </div>
          ) : qrCode && stage === 'scanning' ? (
            <>
              <img 
                src={qrCode} 
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
        {stage === 'scanning' && qrCode && (
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
            disabled={stage === 'connected'}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
