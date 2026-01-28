import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("VITE_SUPABASE_ANON_KEY");

  throw new Error(
    `Supabase não configurado. Adicione as seguintes variáveis no arquivo .env: ${missingVars.join(", ")}`,
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
