import { supabase } from '../lib/supabase';
import { CriteriaConfig } from '../../types';

export interface PromptRecord {
  id?: string;
  user_id: string;
  estrutura: string;
  spiced: string;
  solucao: string;
  objecoes: string;
  rapport: string;
  generated_prompt?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PromptServiceError {
  message: string;
  code?: string;
}

export interface PromptResponse {
  data: PromptRecord | null;
  error: PromptServiceError | null;
}

class PromptService {
  /**
   * Salva ou atualiza os critérios de avaliação do usuário
   */
  async saveCriteria(
    userId: string, 
    criteria: CriteriaConfig, 
    generatedPrompt?: string
  ): Promise<PromptResponse> {
    try {
      // Verificar se já existe um registro para este usuário
      const { data: existing } = await supabase
        .from('prompts')
        .select('id')
        .eq('user_id', userId)
        .single();

      const record: Partial<PromptRecord> = {
        user_id: userId,
        estrutura: criteria.estrutura,
        spiced: criteria.spiced,
        solucao: criteria.solucao,
        objecoes: criteria.objeções,
        rapport: criteria.rapport,
        generated_prompt: generatedPrompt,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (existing) {
        // Atualizar registro existente
        result = await supabase
          .from('prompts')
          .update(record)
          .eq('user_id', userId)
          .select()
          .single();
      } else {
        // Criar novo registro
        record.created_at = new Date().toISOString();
        result = await supabase
          .from('prompts')
          .insert(record)
          .select()
          .single();
      }

      if (result.error) {
        return {
          data: null,
          error: {
            message: result.error.message,
            code: result.error.code,
          },
        };
      }

      return { data: result.data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Erro ao salvar critérios',
        },
      };
    }
  }

  /**
   * Busca os critérios de avaliação do usuário
   */
  async getCriteria(userId: string): Promise<PromptResponse> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (não é erro, apenas não existe ainda)
        return {
          data: null,
          error: {
            message: error.message,
            code: error.code,
          },
        };
      }

      return { data: data || null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Erro ao buscar critérios',
        },
      };
    }
  }

  /**
   * Atualiza apenas o prompt gerado
   */
  async updateGeneratedPrompt(userId: string, generatedPrompt: string): Promise<PromptResponse> {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .update({ 
          generated_prompt: generatedPrompt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: {
            message: error.message,
            code: error.code,
          },
        };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Erro ao atualizar prompt',
        },
      };
    }
  }

  /**
   * Converte PromptRecord para CriteriaConfig
   */
  toCriteriaConfig(record: PromptRecord): CriteriaConfig {
    return {
      estrutura: record.estrutura,
      spiced: record.spiced,
      solucao: record.solucao,
      objeções: record.objecoes,
      rapport: record.rapport,
    };
  }
}

export const promptService = new PromptService();
