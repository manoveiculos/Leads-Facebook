
export type LeadStatusLabel = 
  | 'Novo' 
  | 'Respondeu' 
  | 'Não Respondeu' 
  | 'Score Baixo' 
  | 'Em Negociação' 
  | 'Pedido de Compra' 
  | 'Vendido' 
  | 'Perdido';

export interface Lead {
  id: string;
  nome: string;
  vendedor: string | null;
  status: LeadStatusLabel;
  created_at: string;
  last_interaction_at: string | null;
  origem?: string;
  carro_interesse?: string;
  faixa_preco?: string;
  observacoes?: string;
}

export interface Vendedor {
  id: string;
  name: string;
  avatar: string;
  vendas: number;
  leads_recebidos: number;
  conversao: number;
}

export interface DashboardStats {
  total_hoje: number;
  em_atendimento: number;
  taxa_conversao: number;
  leads_atrasados: number;
}
