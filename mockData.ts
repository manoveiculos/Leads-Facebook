
import { Lead, Vendedor, LeadStatusLabel } from './types';

export const MOCK_VENDEDORES: Vendedor[] = [
  { id: '1', nome: 'Ricardo Silva', avatar: 'https://picsum.photos/seed/ric/100', vendas: 12, leads_recebidos: 85, conversao: 14.1 },
  { id: '2', nome: 'Ana Oliveira', avatar: 'https://picsum.photos/seed/ana/100', vendas: 15, leads_recebidos: 60, conversao: 25.0 },
  { id: '3', nome: 'Marcos Costa', avatar: 'https://picsum.photos/seed/marc/100', vendas: 8, leads_recebidos: 92, conversao: 8.7 },
];

const now = new Date();
const seventeenMinAgo = new Date(now.getTime() - 17 * 60000);

export const MOCK_LEADS: Lead[] = [
  { 
    id: 'L1', 
    nome: 'Carlos Eduardo (Facebook Ads)', 
    telefone: '(11) 98877-6655', 
    email: 'carlos@fb.com', 
    status: 'Novo', 
    vendedor_id: null, 
    created_at: seventeenMinAgo.toISOString(), 
    last_interaction_at: seventeenMinAgo.toISOString() 
  },
  { 
    id: 'L2', 
    nome: 'Mariana Santos', 
    telefone: '(21) 97766-5544', 
    email: 'mari@fb.com', 
    status: 'Interagiu', 
    vendedor_id: '2', 
    created_at: '2024-05-15T10:00:00Z', 
    last_interaction_at: now.toISOString() 
  },
  { 
    id: 'L3', 
    nome: 'Roberto Alves', 
    telefone: '(31) 96655-4433', 
    email: 'roberto@fb.com', 
    status: 'Vendido', 
    vendedor_id: '1', 
    created_at: '2024-05-10T10:00:00Z', 
    last_interaction_at: '2024-05-10T11:00:00Z' 
  },
  { 
    id: 'L4', 
    nome: 'Fernanda Souza', 
    telefone: '(41) 95544-3322', 
    email: 'fernanda@fb.com', 
    status: 'Interesse', 
    vendedor_id: '2', 
    created_at: '2024-05-12T09:00:00Z', 
    last_interaction_at: '2024-05-12T09:30:00Z' 
  },
  { 
    id: 'L5', 
    nome: 'Joaquim Silva', 
    telefone: '(51) 94433-2211', 
    email: 'joaquim@fb.com', 
    status: 'Perdido', 
    vendedor_id: '3', 
    created_at: '2024-05-14T14:00:00Z', 
    last_interaction_at: '2024-05-14T14:05:00Z' 
  },
];
