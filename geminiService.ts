import { GoogleGenAI, Type } from "@google/genai";
import { Message, AnalysisResult, HeatmapAnalysis, CriteriaConfig } from "./types";

export const analyzeConversation = async (messages: Message[], prompt: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const conversationContext = messages
    .map(m => `${m.sender === 'agent' ? 'Atendente' : 'Cliente'}: ${m.text}`)
    .join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analise a seguinte conversa de atendimento via WhatsApp e atue como um Coach Técnico de Atendimento. 
    Prompt do Usuário: ${prompt}
    
    Conversa:
    ${conversationContext}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Nota de 0 a 100 para o atendimento" },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Pontos positivos" },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Pontos a melhorar" },
          coachingTips: { type: Type.STRING, description: "Dicas práticas do coach" }
        },
        required: ["score", "strengths", "improvements", "coachingTips"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const analyzeConversationWithHeatmap = async (
  messages: Message[], 
  criteriaConfig: CriteriaConfig
): Promise<HeatmapAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
  
  const conversationContext = messages
    .map(m => `${m.sender === 'agent' ? 'Vendedor' : 'Cliente'}: ${m.text}`)
    .join('\n');

  // Montar o Prompt Mestre substituindo as variáveis
  const masterPrompt = `Aja como um Auditor de Qualidade de Vendas especialista em conversas de WhatsApp.
**OBJETIVO:** Analisar a transcrição de chat anexa e atribuir notas de 0 a 10 para 5 pilares específicos, baseando-se estritamente nos critérios da empresa descritos abaixo.

### 1. CRITÉRIOS DE AVALIAÇÃO (GABARITO):

* **ESTRUTURA:** ${criteriaConfig.estrutura}
* **SPICED:** ${criteriaConfig.spiced}
* **SOLUÇÃO:** ${criteriaConfig.solucao}
* **OBJEÇÕES:** ${criteriaConfig.objeções}
* **RAPPORT:** ${criteriaConfig.rapport}

### 2. INSTRUÇÕES DE ANÁLISE:

1. Leia toda a conversa identificando quem é o **Vendedor** e quem é o **Cliente**.
2. Para cada pilar, verifique se o vendedor cumpriu os requisitos do gabarito.
3. Seja rigoroso: se o critério pede para "identificar o prazo de compra" e o vendedor não perguntou, a nota em SPICED deve ser baixa.
4. No WhatsApp, valorize a clareza e a capacidade de manter o cliente engajado (evitar que o cliente pare de responder).
5. As notas devem ser de 0.0 a 10.0, com uma casa decimal.
6. A nota_final é a média aritmética das 5 notas dos pilares.
7. O performance_status deve ser:
   - "Destaque" se nota_final >= 8.0
   - "Alerta" se nota_final < 6.0
   - "Em desenvolvimento" caso contrário

### 3. FORMATO DE SAÍDA (OBRIGATÓRIO):

Responda **apenas** com um objeto JSON no formato abaixo para integração no sistema:

**CONVERSA PARA ANALISAR:**
${conversationContext}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: masterPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analise: {
            type: Type.OBJECT,
            properties: {
              estrutura: {
                type: Type.OBJECT,
                properties: {
                  nota: { type: Type.NUMBER, description: "Nota de 0.0 a 10.0" },
                  justificativa: { type: Type.STRING, description: "Justificativa da nota" }
                },
                required: ["nota", "justificativa"]
              },
              spiced: {
                type: Type.OBJECT,
                properties: {
                  nota: { type: Type.NUMBER, description: "Nota de 0.0 a 10.0" },
                  justificativa: { type: Type.STRING, description: "Justificativa da nota" }
                },
                required: ["nota", "justificativa"]
              },
              solucao: {
                type: Type.OBJECT,
                properties: {
                  nota: { type: Type.NUMBER, description: "Nota de 0.0 a 10.0" },
                  justificativa: { type: Type.STRING, description: "Justificativa da nota" }
                },
                required: ["nota", "justificativa"]
              },
              objeções: {
                type: Type.OBJECT,
                properties: {
                  nota: { type: Type.NUMBER, description: "Nota de 0.0 a 10.0" },
                  justificativa: { type: Type.STRING, description: "Justificativa da nota" }
                },
                required: ["nota", "justificativa"]
              },
              rapport: {
                type: Type.OBJECT,
                properties: {
                  nota: { type: Type.NUMBER, description: "Nota de 0.0 a 10.0" },
                  justificativa: { type: Type.STRING, description: "Justificativa da nota" }
                },
                required: ["nota", "justificativa"]
              }
            },
            required: ["estrutura", "spiced", "solucao", "objeções", "rapport"]
          },
          nota_final: { type: Type.NUMBER, description: "Média aritmética das 5 notas" },
          performance_status: { 
            type: Type.STRING, 
            enum: ["Em desenvolvimento", "Destaque", "Alerta"],
            description: "Status de performance baseado na nota final"
          }
        },
        required: ["analise", "nota_final", "performance_status"]
      }
    }
  });

  const result = JSON.parse(response.text);
  return result;
};
