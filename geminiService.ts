
import { GoogleGenAI, Type } from "@google/genai";
import { Message, AnalysisResult } from "./types";

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
