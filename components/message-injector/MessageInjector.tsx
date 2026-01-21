import React, { useState } from 'react';
import { Message } from '@/types';
import { MessageInjectorProps, MessageTemplate } from './types';



const MESSAGE_TEMPLATES: MessageTemplate[] = [
  { id: '1', name: 'Saudação Cliente', sender: 'client', text: 'Olá, boa tarde! Preciso de ajuda.' },
  { id: '2', name: 'Resposta Agente', sender: 'agent', text: 'Olá! Como posso ajudá-lo hoje?' },
  { id: '3', name: 'Dúvida Produto', sender: 'client', text: 'Vocês têm esse produto em estoque?' },
  { id: '4', name: 'Reclamação', sender: 'client', text: 'Estou muito insatisfeito com o atendimento que recebi.' },
  { id: '5', name: 'Agradecimento', sender: 'client', text: 'Muito obrigado pela ajuda! Excelente atendimento.' },
  { id: '6', name: 'Pedido de Desconto', sender: 'client', text: 'Tem como fazer um desconto nesse valor?' },
  { id: '7', name: 'Resposta Empática', sender: 'agent', text: 'Entendo perfeitamente sua situação. Vou resolver isso agora mesmo para você.' },
  { id: '8', name: 'Fechamento Venda', sender: 'agent', text: 'Perfeito! Vou gerar seu pedido. Posso confirmar os dados?' },
];

export const MessageInjector: React.FC<MessageInjectorProps> = ({ 
  sessionId, 
  contactName,
  onInjectMessage, 
  onClose 
}) => {
  const [sender, setSender] = useState<'client' | 'agent'>('client');
  const [messageText, setMessageText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: `injected-${Date.now()}`,
      sender,
      text: messageText.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      contactName
    };

    onInjectMessage(sessionId, newMessage);
    setMessageText('');
  };

  const handleUseTemplate = (template: MessageTemplate) => {
    setSender(template.sender);
    setMessageText(template.text);
    setShowTemplates(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold">Injetor de Mensagens</h3>
                <p className="text-xs text-slate-400">Modo Sandbox - Testes</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Session Info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
              {contactName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800">{contactName}</p>
              <p className="text-xs text-slate-400">Sessão ativa</p>
            </div>
          </div>

          {/* Sender Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remetente</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSender('client')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  sender === 'client' 
                    ? 'bg-white border-2 border-slate-800 text-slate-800 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 border-2 border-transparent hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Cliente
                </div>
              </button>
              <button
                onClick={() => setSender('agent')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  sender === 'agent' 
                    ? 'bg-emerald-500 border-2 border-emerald-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-400 border-2 border-transparent hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Atendente
                </div>
              </button>
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensagem</label>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
                Templates
              </button>
            </div>
            
            {showTemplates && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl animate-slide-up">
                {MESSAGE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleUseTemplate(template)}
                    className={`p-2 text-left rounded-lg text-xs transition-all hover:scale-[1.02] ${
                      template.sender === 'client' 
                        ? 'bg-white border border-slate-200 hover:border-slate-300' 
                        : 'bg-emerald-50 border border-emerald-100 hover:border-emerald-200'
                    }`}
                  >
                    <p className="font-bold text-slate-700 truncate">{template.name}</p>
                    <p className="text-slate-400 truncate">{template.text.substring(0, 30)}...</p>
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite a mensagem para injetar na conversa..."
              className="w-full p-4 border-2 border-slate-200 rounded-xl text-sm h-28 resize-none focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Preview */}
          {messageText && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preview</label>
              <div className={`flex ${sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl shadow-sm ${
                  sender === 'agent' ? 'bg-[#dcf8c6]' : 'bg-white border border-slate-100'
                }`}>
                  <p className="text-sm text-slate-800">{messageText}</p>
                  <p className="text-[10px] text-slate-400 mt-1 text-right">
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="flex-[2] py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Injetar Mensagem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
