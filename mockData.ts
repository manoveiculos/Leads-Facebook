
import { Lead, Vendedor } from './types';

// Removidos vendedores fictícios. O App agora extrai vendedores únicos dos leads reais.
export const MOCK_VENDEDORES: Vendedor[] = [
  { id: '1', name: 'Wilson', avatar: 'https://picsum.photos/seed/wilson/100', vendas: 0, leads_recebidos: 0, conversao: 0 },
];

const now = new Date();
const seventeenMinAgo = new Date(now.getTime() - 17 * 60000);

export const MOCK_LEADS: Lead[] = [
  { 
    id: '9', 
    nome: 'Luiz Carlos Santos', 
    status: 'Perdido', 
    vendedor: 'Wilson', 
    created_at: seventeenMinAgo.toISOString(), 
    last_interaction_at: now.toISOString(),
    origem: 'Facebook Ads',
    carro_interesse: 'Toyota Corolla 2024',
    faixa_preco: 'R$ 150.000 - R$ 180.000',
    observacoes: 'O cliente demonstrou interesse em financiamento de longo prazo.'
  }
];
