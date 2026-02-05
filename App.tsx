
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Target, 
  Clock, 
  AlertCircle, 
  Search, 
  LayoutDashboard,
  LogOut,
  Bell,
  CheckCircle2,
  XCircle,
  MessageCircle,
  X,
  UserCheck
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area
} from 'recharts';

import { Lead, Vendedor, DashboardStats, LeadStatusLabel } from './types';
import { fetchLeads, fetchVendedores, updateLeadStatus } from './supabaseClient';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md">
    <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center mb-4`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
    <div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads'>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [leadsData, vendedoresData] = await Promise.all([
        fetchLeads(),
        fetchVendedores()
      ]);
      setLeads(leadsData);
      setVendedores(vendedoresData);
      setLoading(false);
    };
    loadData();
  }, []);

  const stats = useMemo<DashboardStats>(() => {
    const today = new Date().toLocaleDateString();
    const leadsHoje = leads.filter(l => new Date(l.created_at).toLocaleDateString() === today).length;
    const interagindo = leads.filter(l => l.status === 'Interagiu' || l.status === 'Interesse').length;
    const vendidos = leads.filter(l => l.status === 'Vendido').length;
    const perdidos = leads.filter(l => l.status === 'Perdido').length;
    
    const now = new Date().getTime();
    const parados = leads.filter(l => {
      const diff = (now - new Date(l.last_interaction_at).getTime()) / 60000;
      return l.status === 'Novo' && diff > 15;
    }).length;

    return {
      leads_hoje: leadsHoje,
      interagindo,
      vendidos,
      perdidos,
      taxa_interesse: leads.length > 0 ? Math.round((interagindo / leads.length) * 100) : 0,
      parados_15min: parados
    };
  }, [leads]);

  const getStatusColor = (status: LeadStatusLabel) => {
    switch (status) {
      case 'Vendido': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Perdido': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'Novo': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Interagiu': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Interesse': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTimeDiff = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'Agora';
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h`;
  };

  const handleStatusUpdate = async (id: string, newStatus: LeadStatusLabel) => {
    const success = await updateLeadStatus(id, newStatus);
    if (success) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus, last_interaction_at: new Date().toISOString() } : l));
    }
  };

  const filteredLeads = leads.filter(l => 
    l.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Chart Data
  const salespersonPerformance = useMemo(() => {
    return vendedores.map(v => ({
      name: v.nome.split(' ')[0],
      vendas: leads.filter(l => l.vendedor_id === v.id && l.status === 'Vendido').length,
      leads: leads.filter(l => l.vendedor_id === v.id).length
    }));
  }, [leads, vendedores]);

  const evolutionData = useMemo(() => {
    // Basic day aggregation for the last 5 days
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const result = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = days[d.getDay()];
      const count = leads.filter(l => new Date(l.created_at).toLocaleDateString() === d.toLocaleDateString()).length;
      result.push({ day: dayLabel, leads: count });
    }
    return result;
  }, [leads]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Conectando ao Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-indigo-500 p-1.5 rounded-lg">
            <Target size={20} />
          </div>
          <h1 className="text-lg font-black tracking-tighter">MANOS LEADS <span className="text-indigo-400">2026</span></h1>
        </div>
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-bold text-sm">Painel Principal</span>
          </button>
          <button 
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'leads' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Users size={20} />
            <span className="font-bold text-sm">Controle de Leads</span>
          </button>
        </nav>
        <div className="pt-6 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-900/20 transition-all">
            <LogOut size={20} />
            <span className="font-bold text-sm">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {activeTab === 'dashboard' ? 'Gestão Facebook Ads' : 'Lista de Contatos Facebook'}
            </h2>
            <p className="text-slate-500 text-sm">Real-time Sync: leads_facebook_2026</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-black rounded-lg border border-blue-100 uppercase tracking-widest">
              Facebook Source
            </div>
          </div>
        </header>

        {stats.parados_15min > 0 && (
          <div className="mb-8 bg-rose-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-rose-200 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} />
              <div>
                <p className="font-black text-sm uppercase">ATENÇÃO: Existem leads esfriando ({stats.parados_15min})</p>
                <p className="text-xs text-rose-100">Leads de formulário exigem velocidade. Atendimento pendente.</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('leads')} className="px-4 py-2 bg-white text-rose-600 font-black rounded-lg text-xs uppercase">Resolver</button>
          </div>
        )}

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Leads Hoje" value={stats.leads_hoje} icon={Users} color="bg-indigo-500" />
              <StatCard title="Em Conversa" value={stats.interagindo} icon={MessageCircle} color="bg-blue-500" />
              <StatCard title="Conversão Real" value={stats.vendidos} icon={CheckCircle2} color="bg-emerald-500" />
              <StatCard title="Interesse (%)" value={`${stats.taxa_interesse}%`} icon={Target} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest">Fluxo de Entrada</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="leads" stroke="#6366f1" fill="#e0e7ff" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest">Vendas por Time</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salespersonPerformance}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <Tooltip />
                      <Bar dataKey="vendas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome do lead..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Identificação</th>
                    <th className="px-6 py-4">Responsável</th>
                    <th className="px-6 py-4">Estado de Conversão</th>
                    <th className="px-6 py-4 text-center">Data</th>
                    <th className="px-6 py-4 text-right">Tempo Parado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedLeadId(lead.id)}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{lead.nome}</p>
                        <span className="text-[10px] text-blue-500 font-bold uppercase">FB Formulário</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {vendedores.find(v => v.id === lead.vendedor_id)?.nome || 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-500">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${lead.status === 'Novo' && parseInt(getTimeDiff(lead.last_interaction_at)) > 15 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {getTimeDiff(lead.last_interaction_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedLeadId && selectedLead && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <UserCheck size={20} className="text-indigo-400" />
                  <h3 className="font-bold uppercase tracking-tight text-sm">Ficha de Atendimento</h3>
                </div>
                <button onClick={() => setSelectedLeadId(null)}><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead de Origem Facebook</p>
                  <p className="text-xl font-bold text-slate-900">{selectedLead.nome}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Telefone Direto</p>
                    <p className="text-lg font-black text-indigo-700">{selectedLead.telefone}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{selectedLead.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mudar Status do Atendimento</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleStatusUpdate(selectedLead.id, 'Vendido')} className="py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-colors uppercase">✅ Vendido</button>
                    <button onClick={() => handleStatusUpdate(selectedLead.id, 'Interagiu')} className="py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-700 transition-colors uppercase">💬 Interagiu</button>
                    <button onClick={() => handleStatusUpdate(selectedLead.id, 'Interesse')} className="py-2 bg-amber-500 text-white text-[10px] font-black rounded-xl hover:bg-amber-600 transition-colors uppercase">⭐ Interesse</button>
                    <button onClick={() => handleStatusUpdate(selectedLead.id, 'Perdido')} className="py-2 bg-slate-400 text-white text-[10px] font-black rounded-xl hover:bg-slate-500 transition-colors uppercase">✖ Perdido</button>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold">Base: leads_facebook_2026</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
