
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lfwvhfncegshxuljwppc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QLaoz-qgZfRg9Vm2HeNLRw_xGtd2LED';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const fetchLeads = async () => {
  const { data, error } = await supabase
    .from('leads_facebook_2026')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }
  return data;
};

export const fetchVendedores = async () => {
  const { data, error } = await supabase
    .from('vendedores')
    .select('*');
  
  if (error) {
    console.error('Error fetching vendedores:', error);
    return [];
  }
  return data;
};

export const updateLeadStatus = async (leadId: string, status: string) => {
  const { error } = await supabase
    .from('leads_facebook_2026')
    .update({ status, last_interaction_at: new Date().toISOString() })
    .eq('id', leadId);
    
  return !error;
};
