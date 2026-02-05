
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lfwvhfncegshxuljwppc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QLaoz-qgZfRg9Vm2HeNLRw_xGtd2LED';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const fetchLeads = async () => {
  try {
    const { data, error } = await supabase
      .from('leads_facebook_2026')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro Supabase (fetchLeads):', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Erro Crítico (fetchLeads):', err);
    return [];
  }
};

/**
 * Atualiza qualquer campo de um lead
 */
export const updateLead = async (leadId: string, updates: Record<string, any>) => {
  try {
    const { error } = await supabase
      .from('leads_facebook_2026')
      .update({ 
        ...updates,
        last_interaction_at: new Date().toISOString() 
      })
      .eq('id', leadId);
      
    if (error) {
      console.error('Erro ao atualizar lead:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro Crítico (updateLead):', err);
    return false;
  }
};

// Mantido por compatibilidade
export const updateLeadStatus = async (leadId: string, status: string) => {
  return updateLead(leadId, { status });
};
