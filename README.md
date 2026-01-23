# WhatsApp AI Coach Enterprise

Plataforma de auditoria e treinamento de atendimento em tempo real via WhatsApp, utilizando inteligência artificial (Google Gemini API) para avaliar a qualidade do atendimento.

## 🚀 Funcionalidades

- ✅ Conexão real com WhatsApp Web via Baileys
- ✅ Monitoramento de conversas em tempo real
- ✅ Auditoria automática com IA (Google Gemini)
- ✅ Múltiplas instâncias de WhatsApp simultâneas
- ✅ Histórico de evolução de performance
- ✅ Prompts personalizados por departamento/instância

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Chave da API do Google Gemini

## 🛠️ Instalação

### 1. Instalar dependências do frontend

```bash
npm install
```

### 2. Instalar dependências do backend

```bash
cd server
npm install
cd ..
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
GEMINI_API_KEY=sua_chave_gemini_aqui
VITE_API_URL=http://localhost:3001
```

Crie um arquivo `.env` na pasta `server/`:

```env
PORT=3001
```

## 🎯 Como Executar

### Terminal 1 - Backend

```bash
cd server
npm run dev
```

O backend estará rodando em `http://localhost:3001`

### Terminal 2 - Frontend

```bash
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## 📱 Como Conectar WhatsApp

1. Faça login no sistema
2. Clique em "CONECTAR WHATSAPP"
3. Escaneie o QR Code exibido com seu WhatsApp:
   - Abra o WhatsApp no celular
   - Menu (⋮) → Dispositivos conectados
   - Conectar um dispositivo
   - Escaneie o QR Code
4. Aguarde a conexão ser estabelecida
5. As mensagens recebidas aparecerão automaticamente no dashboard

## 🏗️ Estrutura do Projeto

```
whatsapp-ai-service-coach/
├── server/                 # Backend Node.js + Express + Baileys
│   ├── src/
│   │   ├── index.ts       # Servidor principal
│   │   ├── whatsapp-manager.ts  # Gerenciador de conexões WhatsApp
│   │   └── types.ts       # Tipos TypeScript
│   └── package.json
├── components/            # Componentes React
│   ├── chat-window/      # Interface de chat
│   ├── qr-code-scanner/  # Scanner de QR Code
│   ├── sidebar/          # Barra lateral
│   └── ...
├── src/
│   └── services/
│       └── whatsapp-api.ts  # Cliente API para backend
└── App.tsx              # Componente principal
```

## 🔧 Tecnologias Utilizadas

### Frontend
- React 19
- TypeScript
- Tailwind CSS
- Socket.io Client
- Vite

### Backend
- Node.js
- Express
- Baileys (WhatsApp Web API)
- Socket.io
- TypeScript

### IA
- Google Gemini API

## 📝 Notas Importantes

- As credenciais do WhatsApp são armazenadas localmente na pasta `server/auth/`
- Cada instância mantém sua própria autenticação
- O QR Code expira após 2 minutos e é regenerado automaticamente
- Mensagens são recebidas em tempo real via WebSocket

## 🐛 Troubleshooting

### Backend não inicia
- Verifique se a porta 3001 está disponível
- Certifique-se de que todas as dependências foram instaladas

### QR Code não aparece
- Verifique se o backend está rodando
- Confira os logs do backend para erros
- Tente criar uma nova instância

### Mensagens não aparecem
- Verifique a conexão WebSocket no console do navegador
- Confirme que o WhatsApp está conectado (status: connected)
- Verifique os logs do backend

## 📄 Licença

Este projeto é privado e de uso interno.
