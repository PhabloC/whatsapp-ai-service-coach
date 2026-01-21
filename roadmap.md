# WhatsApp AI Coach Enterprise - Documentação do Sistema

## 1. Visão Geral
O **WhatsApp AI Coach Enterprise** é uma plataforma de auditoria e treinamento de atendimento em tempo real. O sistema conecta instâncias do WhatsApp Web para monitorar conversas entre agentes e clientes, utilizando inteligência artificial (Google Gemini API) para avaliar a qualidade, eficiência e tom de voz do atendimento com base em regras personalizadas por empresa ou departamento.

---

## 2. Arquitetura do Sistema

### 2.1 Camada de Frontend (React + Tailwind CSS) ✅
- [x] **Dashboard Multi-Instância**: Permite gerenciar várias conexões de WhatsApp simultaneamente.
- [x] **Interface de Chat**: Mimetiza a experiência do WhatsApp Web para facilitar a leitura das auditorias.
- [x] **Painel de Auditoria AI**: Exibe resultados detalhados, scores de performance e dicas de coaching.

### 2.2 Camada de Inteligência Artificial (Gemini API) ✅
- [x] **Modelo**: `gemini-3-flash-preview` para análises rápidas e estruturadas.
- [x] **Contextualização**: A IA recebe o histórico completo da conversa e um "Master Prompt" específico daquela unidade de negócio.
- [x] **Saída Estruturada**: Retorno via JSON Schema garantindo que os dados de score, pontos positivos e melhorias sejam sempre consistentes.

### 2.3 Simulação de Conexão (Sandbox Protocol) ✅
Para fins de teste e demonstração em ambientes controlados:
- [x] **Handshake Simulado**: Fluxo de QR Code dinâmico com estágios de autenticação (scanning → authenticating → syncing → connected).
- [x] **Data Injection**: Ferramenta de injeção de mensagens para testar a reatividade da auditoria sem necessidade de tráfego real imediato.

---

## 3. Funcionalidades Principais

### 3.1 Gestão de Prompts por Empresa ✅
Diferente de sistemas genéricos, cada conexão no dashboard pode ter seu próprio **Master Prompt**.
- [x] *Exemplo Unidade de Vendas*: "Foco em fechamento, gatilhos de escassez e rapidez."
- [x] *Exemplo Unidade de Suporte*: "Foco em empatia, resolução técnica e educação."
- [x] Edição de prompts diretamente na interface (Sidebar e ChatWindow).

### 3.2 Auditoria de Performance (Live Auditor) ✅
- [x] **Score (0-100)**: Avaliação numérica baseada no cumprimento das regras do prompt.
- [x] **Strengths (Pontos Fortes)**: Identificação automática do que o atendente fez bem.
- [x] **Improvements (Oportunidades)**: Aponta falhas ou desvios de conduta.
- [x] **Coaching Notes**: Sugestões diretas da IA sobre como o atendente poderia ter sido mais eficaz.

### 3.3 Histórico de Evolução ✅
- [x] Cada conversa mantém um histórico de auditorias, permitindo comparar se o atendente melhorou após as dicas do "Coach AI".
- [x] Visualização gráfica da evolução dos scores ao longo do tempo.
- [x] Indicadores de tendência (melhora/queda) comparando com auditorias anteriores.
- [x] Estatísticas consolidadas (média, melhor, pior score).

### 3.4 Funcionalidades Adicionais Implementadas ✅
- [x] **Filtro de Conversas**: Busca por nome do contato, última mensagem ou conteúdo das mensagens.
- [x] **Multi-Instância**: Gerenciamento de múltiplas conexões WhatsApp com status individual.
- [x] **Indicador de Auditorias**: Badge na lista de conversas mostrando quantidade de auditorias realizadas.
- [x] **Comparativo de Scores**: Indicador visual de evolução vs auditoria anterior.

---

## 4. Fluxo de Operação

1. [x] **Login**: O gestor acessa o painel administrativo.
2. [x] **Conexão**: Uma nova instância de WhatsApp é vinculada via QR Code (ou simulada no modo Sandbox).
3. [x] **Configuração**: Define-se o prompt de coaching para aquela instância.
4. [x] **Monitoramento**: As mensagens fluem para o dashboard.
5. [x] **Auditoria**: O gestor clica em "Auditar Sessão" para receber o feedback instantâneo da IA.
6. [x] **Acompanhamento**: Os scores são armazenados para análise de KPI mensal.

---

## 5. Especificações Técnicas
- **Linguagem**: TypeScript / React.
- **Estilização**: Tailwind CSS (Design System Moderno/Dark Mode Ready).
- **IA**: Google GenAI SDK (@google/genai).
- **Segurança**: Chaves de API gerenciadas via variáveis de ambiente (`process.env.API_KEY`).

---

## 6. Componentes do Sistema

### 6.1 Componentes Implementados
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| App | `App.tsx` | Componente principal com gerenciamento de estado global |
| Sidebar | `components/Sidebar.tsx` | Navegação, filtro de conversas e gestão de conexões |
| ChatWindow | `components/ChatWindow.tsx` | Visualização de chat e painel de auditoria |
| QRCodeScanner | `components/QRCodeScanner.tsx` | Fluxo de conexão com QR Code dinâmico |
| MessageInjector | `components/MessageInjector.tsx` | Ferramenta de injeção de mensagens (Sandbox) |
| EvolutionHistory | `components/EvolutionHistory.tsx` | Visualização do histórico de evolução |

### 6.2 Serviços
| Serviço | Arquivo | Descrição |
|---------|---------|-----------|
| Gemini Service | `geminiService.ts` | Integração com Google Gemini API |

### 6.3 Tipos
| Arquivo | Descrição |
|---------|-----------|
| `types.ts` | Definições de tipos TypeScript (Message, ChatSession, AnalysisResult, etc.) |

---

## 7. Próximos Passos (Roadmap)
- [ ] Integração real com Webhooks de APIs de WhatsApp (baileys/wa-js).
- [ ] Alertas automáticos para conversas com score abaixo de 50%.
- [ ] Exportação de relatórios PDF para feedback mensal de funcionários.
- [ ] Suporte a múltiplos idiomas de análise.
- [ ] Dashboard de KPIs com gráficos consolidados.
- [ ] Sistema de notificações em tempo real.
- [ ] Integração com sistemas de CRM.

---

## 8. Como Executar

```bash
# Instalar dependências
npm install

# Configurar variável de ambiente
# Crie um arquivo .env com: API_KEY=sua_chave_gemini

# Executar em modo desenvolvimento
npm run dev
```

---
*Documentação atualizada em Janeiro/2026 para o projeto WhatsApp AI Coach.*
