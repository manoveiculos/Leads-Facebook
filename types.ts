
export type LeadStatusLabel = 'Novo' | 'Interagiu' | 'Interesse' | 'Vendido' | 'Perdido';

export interface Vendedor {
  id: string;
  nome: string;
  avatar: string;
  vendas: number;
  leads_recebidos: number;
  conversao: number;
}

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: LeadStatusLabel;
  vendedor_id: string | null;
  created_at: string;
  last_interaction_at: string;
}

export interface DashboardStats {
  leads_hoje: number;
  interagindo: number;
  vendidos: number;
  perdidos: number;
  taxa_interesse: number;
  parados_15min: number;
}
