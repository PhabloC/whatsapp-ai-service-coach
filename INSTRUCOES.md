# 🚀 Instruções Rápidas de Instalação

## Passo a Passo

### 1. Instalar Dependências

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
cd ..
```

### 2. Configurar Variáveis de Ambiente

**Raiz do projeto** - Criar arquivo `.env`:
```env
GEMINI_API_KEY=sua_chave_gemini_aqui
VITE_API_URL=http://localhost:3001
```

**Pasta server/** - Criar arquivo `.env`:
```env
PORT=3001
```

### 3. Executar o Sistema

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 4. Acessar

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 🔑 Obter Chave Gemini

1. Acesse: https://aistudio.google.com/apikey
2. Crie uma nova chave de API
3. Cole no arquivo `.env` como `GEMINI_API_KEY`

## ✅ Verificar se está funcionando

1. Abra http://localhost:3000
2. Faça login (qualquer email/senha funciona no modo demo)
3. Clique em "CONECTAR WHATSAPP"
4. Um QR Code deve aparecer
5. Escaneie com seu WhatsApp
6. Aguarde a conexão

## 🐛 Problemas Comuns

**Erro: "Cannot find module"**
- Execute `npm install` novamente
- Verifique se está na pasta correta

**QR Code não aparece**
- Verifique se o backend está rodando na porta 3001
- Confira os logs do terminal do backend

**Mensagens não chegam**
- Verifique se o WhatsApp está conectado (status: connected)
- Abra o console do navegador (F12) e veja se há erros
- Confira os logs do backend
