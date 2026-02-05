
import { Lead, Vendedor } from './types';

export const MOCK_VENDEDORES: Vendedor[] = [
  { id: '1', name: 'Wilson', avatar: 'https://picsum.photos/seed/wilson/100', vendas: 12, leads_recebidos: 85, conversao: 14.1 },
  { id: '2', name: 'Ricardo', avatar: 'https://picsum.photos/seed/ric/100', vendas: 15, leads_recebidos: 60, conversao: 25.0 },
  { id: '3', name: 'Ana', avatar: 'https://picsum.photos/seed/ana/100', vendas: 8, leads_recebidos: 92, conversao: 8.7 },
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
  },
  { 
    id: '10', 
    nome: 'Mariana Oliveira', 
    status: 'Novo', 
    vendedor: null, 
    created_at: now.toISOString(), 
    last_interaction_at: null,
    origem: 'Facebook Ads',
    carro_interesse: 'Jeep Compass',
    faixa_preco: 'R$ 180.000+'
  }
];
