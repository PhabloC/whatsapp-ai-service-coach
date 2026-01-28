import { GoogleGenAI, Type } from "@google/genai";
import {
  Message,
  AnalysisResult,
  HeatmapAnalysis,
  CriteriaConfig,
  SalesScript,
} from "./types";

export const analyzeConversation = async (
  messages: Message[],
  prompt: string,
): Promise<AnalysisResult> => {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env",
    );
  }
  const ai = new GoogleGenAI({ apiKey });

  const conversationContext = messages
    .map((m) => `${m.sender === "agent" ? "Atendente" : "Cliente"}: ${m.text}`)
    .join("\n");

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
          score: {
            type: Type.NUMBER,
            description: "Nota de 0 a 100 para o atendimento",
          },
          strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Pontos positivos",
          },
          improvements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Pontos a melhorar",
          },
          coachingTips: {
            type: Type.STRING,
            description: "Dicas práticas do coach",
          },
        },
        required: ["score", "strengths", "improvements", "coachingTips"],
      },
    },
  });

  return JSON.parse(response.text);
};

export const analyzeConversationWithHeatmap = async (
  messages: Message[],
  criteriaConfig: CriteriaConfig,
): Promise<HeatmapAnalysis> => {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env",
    );
  }
  const ai = new GoogleGenAI({ apiKey });

  const conversationContext = messages
    .map((m) => `${m.sender === "agent" ? "Vendedor" : "Cliente"}: ${m.text}`)
    .join("\n");

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
                  nota: {
                    type: Type.NUMBER,
                    description: "Nota de 0.0 a 10.0",
                  },
                  justificativa: {
                    type: Type.STRING,
                    description: "Justificativa da nota",
                  },
                },
                required: ["nota", "justificativa"],
              },
              spiced: {
                type: Type.OBJECT,
                properties: {
                  nota: {
                    type: Type.NUMBER,
                    description: "Nota de 0.0 a 10.0",
                  },
                  justificativa: {
                    type: Type.STRING,
                    description: "Justificativa da nota",
                  },
                },
                required: ["nota", "justificativa"],
              },
              solucao: {
                type: Type.OBJECT,
                properties: {
                  nota: {
                    type: Type.NUMBER,
                    description: "Nota de 0.0 a 10.0",
                  },
                  justificativa: {
                    type: Type.STRING,
                    description: "Justificativa da nota",
                  },
                },
                required: ["nota", "justificativa"],
              },
              objeções: {
                type: Type.OBJECT,
                properties: {
                  nota: {
                    type: Type.NUMBER,
                    description: "Nota de 0.0 a 10.0",
                  },
                  justificativa: {
                    type: Type.STRING,
                    description: "Justificativa da nota",
                  },
                },
                required: ["nota", "justificativa"],
              },
              rapport: {
                type: Type.OBJECT,
                properties: {
                  nota: {
                    type: Type.NUMBER,
                    description: "Nota de 0.0 a 10.0",
                  },
                  justificativa: {
                    type: Type.STRING,
                    description: "Justificativa da nota",
                  },
                },
                required: ["nota", "justificativa"],
              },
            },
            required: ["estrutura", "spiced", "solucao", "objeções", "rapport"],
          },
          nota_final: {
            type: Type.NUMBER,
            description: "Média aritmética das 5 notas",
          },
          performance_status: {
            type: Type.STRING,
            enum: ["Em desenvolvimento", "Destaque", "Alerta"],
            description: "Status de performance baseado na nota final",
          },
        },
        required: ["analise", "nota_final", "performance_status"],
      },
    },
  });

  const result = JSON.parse(response.text);
  return result;
};

export interface GeneratedPromptResult {
  prompt: string;
  explicacao: string;
}

export const generateCustomPrompt = async (
  criteria: CriteriaConfig,
): Promise<GeneratedPromptResult> => {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env",
    );
  }
  const ai = new GoogleGenAI({ apiKey });

  const masterPrompt = `Você é um especialista em criar prompts de avaliação de atendimento ao cliente.

**OBJETIVO:** Com base nos critérios de avaliação fornecidos abaixo, crie um prompt otimizado e personalizado que será usado para analisar conversas de WhatsApp entre vendedores e clientes.

### CRITÉRIOS DO CLIENTE:

* **ESTRUTURA:** ${criteria.estrutura}
* **SPICED:** ${criteria.spiced}
* **SOLUÇÃO:** ${criteria.solucao}
* **OBJEÇÕES:** ${criteria.objeções}
* **RAPPORT:** ${criteria.rapport}

### INSTRUÇÕES:

1. Analise cada critério fornecido e entenda o que o cliente valoriza em cada pilar.
2. Crie um prompt completo e detalhado que será usado para avaliar conversas.
3. O prompt deve ser específico para conversas de WhatsApp (mensagens curtas, informais).
4. Inclua instruções claras sobre como pontuar cada aspecto.
5. O prompt deve ser direto e objetivo, pronto para uso imediato.

### FORMATO DE SAÍDA:
Responda **apenas** com um objeto JSON no formato especificado.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: masterPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description:
              "O prompt completo e otimizado para avaliar conversas, pronto para uso",
          },
          explicacao: {
            type: Type.STRING,
            description:
              "Breve explicação de como o prompt foi estruturado baseado nos critérios",
          },
        },
        required: ["prompt", "explicacao"],
      },
    },
  });

  const result = JSON.parse(response.text);
  return result;
};

export const generateSalesScript = async (
  messages: Message[],
): Promise<SalesScript> => {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "Chave da API Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env",
    );
  }
  const ai = new GoogleGenAI({ apiKey });

  const conversationContext = messages
    .map((m) => `${m.sender === "agent" ? "Vendedor" : "Cliente"}: ${m.text}`)
    .join("\n");

  const masterPrompt = `Você é um especialista em vendas e criação de scripts comerciais.
**OBJETIVO:** Analisar a conversa de venda bem-sucedida abaixo e criar um script de vendas replicável baseado nas técnicas e abordagens que funcionaram.

### INSTRUÇÕES:

1. **Analise a conversa** identificando os momentos-chave que levaram à venda.
2. **Identifique os gatilhos** mentais e emocionais utilizados pelo vendedor.
3. **Crie um script passo-a-passo** que possa ser replicado em outras conversas similares.
4. **Liste objeções** que podem surgir e como respondê-las.
5. **Forneça dicas práticas** de aplicação do script.

### CONVERSA QUE RESULTOU EM VENDA:
${conversationContext}

### FORMATO DE SAÍDA:
Responda **apenas** com um objeto JSON estruturado para integração no sistema.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: masterPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          titulo: {
            type: Type.STRING,
            description: "Título do script de vendas",
          },
          resumo_conversa: {
            type: Type.STRING,
            description: "Resumo da conversa que gerou a venda",
          },
          gatilhos_identificados: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              "Gatilhos mentais/emocionais identificados na conversa",
          },
          script_recomendado: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                etapa: { type: Type.NUMBER, description: "Número da etapa" },
                titulo: { type: Type.STRING, description: "Título da etapa" },
                fala_sugerida: {
                  type: Type.STRING,
                  description: "Texto sugerido para usar",
                },
                objetivo: {
                  type: Type.STRING,
                  description: "Objetivo desta etapa",
                },
              },
              required: ["etapa", "titulo", "fala_sugerida", "objetivo"],
            },
            description: "Passos do script de vendas",
          },
          dicas_aplicacao: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Dicas práticas de aplicação",
          },
          objecoes_previstas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                objecao: { type: Type.STRING, description: "Objeção comum" },
                resposta_sugerida: {
                  type: Type.STRING,
                  description: "Resposta recomendada",
                },
              },
              required: ["objecao", "resposta_sugerida"],
            },
            description: "Objeções previstas e respostas sugeridas",
          },
        },
        required: [
          "titulo",
          "resumo_conversa",
          "gatilhos_identificados",
          "script_recomendado",
          "dicas_aplicacao",
          "objecoes_previstas",
        ],
      },
    },
  });

  const result = JSON.parse(response.text);
  return result;
};
