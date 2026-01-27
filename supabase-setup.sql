-- =====================================================
-- SQL para criar a tabela de Prompts no Supabase
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Criar a tabela de prompts
CREATE TABLE IF NOT EXISTS prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    estrutura TEXT NOT NULL DEFAULT '',
    spiced TEXT NOT NULL DEFAULT '',
    solucao TEXT NOT NULL DEFAULT '',
    objecoes TEXT NOT NULL DEFAULT '',
    rapport TEXT NOT NULL DEFAULT '',
    generated_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Garantir que cada usuário tenha apenas um registro de critérios
    CONSTRAINT unique_user_prompt UNIQUE (user_id)
);

-- Criar índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários só podem ver seus próprios prompts
CREATE POLICY "Users can view own prompts" 
    ON prompts 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Política para INSERT: usuários só podem inserir prompts para si mesmos
CREATE POLICY "Users can insert own prompts" 
    ON prompts 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: usuários só podem atualizar seus próprios prompts
CREATE POLICY "Users can update own prompts" 
    ON prompts 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: usuários só podem deletar seus próprios prompts
CREATE POLICY "Users can delete own prompts" 
    ON prompts 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at
    BEFORE UPDATE ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICAÇÃO: Execute para confirmar que a tabela foi criada
-- =====================================================
-- SELECT * FROM prompts LIMIT 1;
