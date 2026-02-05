import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Search, AlertCircle, MoreHorizontal, 
  TrendingUp, Calendar, Car, DollarSign, Info, Tag, 
  ArrowLeft, User as UserIcon, XCircle, 
  Save, MessageSquare, FileCheck, ShoppingCart,
  PhoneOff, Activity, Menu, X, Filter, RotateCcw,
  Sparkles, Kanban, List as ListIcon,
  ChevronRight, Clock, MapPin, PieChart as PieChartIcon
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

import { Lead, LeadStatusLabel, DashboardStats } from './types';
import { fetchLeads, updateLead, supabase } from './supabaseClient';
import { MOCK_VENDEDORES } from './mockData';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUS_OPTIONS: LeadStatusLabel[] = [
  'Novo', 'Respondeu', 'Não Respondeu', 'Score Baixo', 'Em Negociação', 'Pedido de Compra', 'Vendido', 'Perdido'
];

const STATUS_FRIENDLY: Record<string, string> = {
  'Novo': 'Novo Contato',
  'Respondeu': 'Já Conversou',
  'Não Respondeu': 'Não Atende',
  'Score Baixo': 'Pouco Interesse',
  'Em Negociação': 'Em Negociação',
  'Pedido de Compra': 'Quase Vendido',
  'Vendido': 'Venda Feita!',
  'Perdido': 'Desistiu'
};

const STATUS_CONFIG: Record<LeadStatusLabel, { color: string, bg: string, border: string }> = {
  'Novo': { color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' },
  'Respondeu': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Não Respondeu': { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  'Score Baixo': { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  'Em Negociação': { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'Pedido de Compra': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  'Vendido': { color: 'text-white', bg: 'bg-emerald-600', border: 'border-transparent' },
  'Perdido': { color: 'text-white', bg: 'bg-slate-800', border: 'border-transparent' }
};

const Badge = ({ status }: { status?: LeadStatusLabel }) => {
  const s = status || 'Novo';
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG['Novo'];
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {STATUS_FRIENDLY[s] || s}
    </span>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads'>('dashboard');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'detail'>('list');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [search, setSearch] = useState('');
  const [filterSeller, setFilterSeller] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  const [editFields, setEditFields] = useState<Partial<Lead>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const data = await fetchLeads();
      setLeads(data || []);
      setLoading(false);
    };
    init();

    const channel = supabase
      .channel('manos-crm-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_facebook_2026' }, (payload) => {
        if (payload.eventType === 'INSERT') setLeads(p => [payload.new as Lead, ...p]);
        if (payload.eventType === 'UPDATE') {
          setLeads(p => p.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
        }
        if (payload.eventType === 'DELETE') setLeads(p => p.filter(l => l.id === payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const selectedLead = useMemo(() => 
    leads.find(l => String(l.id) === String(selectedLeadId)), 
  [leads, selectedLeadId]);

  useEffect(() => {
    if (selectedLead) {
      setEditFields({
        nome: selectedLead.nome || '',
        vendedor: selectedLead.vendedor || '',
        carro_interesse: selectedLead.carro_interesse || '',
        faixa_preco: selectedLead.faixa_preco || '',
        observacoes: selectedLead.observacoes || ''
      });
      setAiAnalysis(null);
    }
  }, [selectedLeadId, selectedLead]);

  const analyzeWithAI = async () => {
    if (!selectedLead) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise este interesse de venda de carro e seja bem direto para um vendedor:
      Diga a chance de fechar (0 a 100%).
      Dê 2 dicas do que fazer.
      Sugira uma mensagem curta de WhatsApp.
      
      Dados:
      Nome: ${selectedLead.nome}
      Carro: ${selectedLead.carro_interesse}
      Preço: ${selectedLead.faixa_preco}
      Observações: ${selectedLead.observacoes || 'Nenhuma'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiAnalysis(response.text || "Não foi possível gerar uma análise no momento.");
    } catch (err) {
      console.error("AI Analysis Error:", err);
      setAiAnalysis("Erro ao conectar com a IA. Verifique sua chave de API.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedLeadId) return;
    setIsSaving(true);
    const success = await updateLead(selectedLeadId, editFields);
    if (success) {
      setViewMode('list');
      setSelectedLeadId(null);
    }
    setIsSaving(false);
  };

  const stats: DashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLeads = leads.filter(l => l.created_at.startsWith(today));
    const activeLeads = leads.filter(l => !['Vendido', 'Perdido', 'Novo'].includes(l.status));
    const soldCount = leads.filter(l => l.status === 'Vendido').length;
    
    return {
      total_hoje: todayLeads.length,
      em_atendimento: activeLeads.length,
      taxa_conversao: leads.length > 0 ? Math.round((soldCount / leads.length) * 100) : 0,
      leads_atrasados: activeLeads.filter(l => {
        if (!l.last_interaction_at) return true;
        const last = new Date(l.last_interaction_at).getTime();
        const diff = Date.now() - last;
        return diff > 24 * 60 * 60 * 1000;
      }).length
    };
  }, [leads]);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(search.toLowerCase()) || 
                          (l.carro_interesse?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesSeller = filterSeller === 'Todos' || l.vendedor === filterSeller;
    const matchesStatus = filterStatus === 'Todos' || l.status === filterStatus;
    return matchesSearch && matchesSeller && matchesStatus;
  });

  const chartData = useMemo(() => {
    return STATUS_OPTIONS.map(status => ({
      name: STATUS_FRIENDLY[status],
      value: leads.filter(l => l.status === status).length
    })).filter(d => d.value > 0);
  }, [leads]);

  const kanbanData = useMemo(() => {
    const groups: Record<string, Lead[]> = {};
    STATUS_OPTIONS.forEach(s => groups[s] = []);
    filteredLeads.forEach(l => {
      if (groups[l.status]) groups[l.status].push(l);
    });
    return groups;
  }, [filteredLeads]);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <LayoutDashboard size={22} strokeWidth={2.5} />
          </div>
          <h1 className="font-black text-xl tracking-tight text-indigo-950">MANOS CRM</h1>
        </div>

        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={20} /> Painel Geral
          </button>
          <button 
            onClick={() => { setActiveTab('leads'); setViewMode('list'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'leads' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users size={20} /> Meus Leads
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl text-white shadow-md">
            <p className="text-xs opacity-80 mb-1">Versão 2.4</p>
            <p className="font-bold text-sm">Pronto para vender!</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-500" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu />
            </button>
            <h2 className="text-lg font-bold text-slate-800">
              {activeTab === 'dashboard' ? 'Visão Geral' : 'Gerenciamento de Leads'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou carro..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
              <img src="https://picsum.photos/seed/admin/100" alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' ? (
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: 'Leads Hoje', val: stats.total_hoje, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Em Atendimento', val: stats.em_atendimento, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Taxa de Venda', val: `${stats.taxa_conversao}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Fila de Atraso', val: stats.leads_atrasados, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-2xl ${s.bg} ${s.color}`}>
                        <s.icon size={24} />
                      </div>
                      <p className="text-sm font-medium text-slate-500 leading-tight">{s.label}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <PieChartIcon className="inline-block" size={18} /> Funil de Status
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Users size={18} /> Leads por Vendedor
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={MOCK_VENDEDORES}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="leads_recebidos" fill="#6366f1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Views & Filters */}
              {viewMode !== 'detail' && (
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <ListIcon size={18} /> Lista
                    </button>
                    <button 
                      onClick={() => setViewMode('kanban')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Kanban size={18} /> Kanban
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={filterSeller}
                      onChange={(e) => setFilterSeller(e.target.value)}
                    >
                      <option value="Todos">Vendedor: Todos</option>
                      {MOCK_VENDEDORES.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                    </select>
                    <select 
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="Todos">Status: Todos</option>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_FRIENDLY[s]}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* View Rendering */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : viewMode === 'list' ? (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lead</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendedor</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Criado em</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeads.map(lead => (
                          <tr key={lead.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setSelectedLeadId(lead.id); setViewMode('detail'); }}>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{lead.nome}</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1"><Car size={12} /> {lead.carro_interesse || 'Não informado'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4"><Badge status={lead.status} /></td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-600 uppercase font-bold">
                                  {lead.vendedor?.[0] || '?'}
                                </div>
                                {lead.vendedor || 'Sem Vendedor'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-500 flex items-center gap-1"><Clock size={14} /> {new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <ChevronRight className="inline-block text-slate-300 group-hover:text-indigo-600 transition-colors" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : viewMode === 'kanban' ? (
                <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 md:-mx-8 md:px-8">
                  {STATUS_OPTIONS.map(status => (
                    <div key={status} className="flex-shrink-0 w-80">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-700">{STATUS_FRIENDLY[status]}</h4>
                          <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-lg font-bold">
                            {kanbanData[status].length}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {kanbanData[status].map(lead => (
                          <div 
                            key={lead.id} 
                            onClick={() => { setSelectedLeadId(lead.id); setViewMode('detail'); }}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <p className="font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{lead.nome}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                              <Car size={12} /> {lead.carro_interesse || '-'}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock size={12} /> {new Date(lead.created_at).toLocaleDateString()}
                              </div>
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {lead.vendedor?.[0] || '?'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm max-w-4xl mx-auto">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors">
                      <ArrowLeft size={18} /> Voltar
                    </button>
                    <div className="flex items-center gap-3">
                      <Badge status={selectedLead?.status} />
                      <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {isSaving ? 'Salvando...' : <><Save size={18} /> Salvar</>}
                      </button>
                    </div>
                  </div>

                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Form side */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={editFields.nome || ''}
                          onChange={e => setEditFields(prev => ({ ...prev, nome: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vendedor</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editFields.vendedor || ''}
                            onChange={e => setEditFields(prev => ({ ...prev, vendedor: e.target.value }))}
                          >
                            <option value="">Nenhum</option>
                            {MOCK_VENDEDORES.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                            value={editFields.status || selectedLead?.status || 'Novo'}
                            onChange={e => setEditFields(prev => ({ ...prev, status: e.target.value as LeadStatusLabel }))}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_FRIENDLY[s]}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Carro de Interesse</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editFields.carro_interesse || ''}
                            onChange={e => setEditFields(prev => ({ ...prev, carro_interesse: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Faixa de Preço</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editFields.faixa_preco || ''}
                            onChange={e => setEditFields(prev => ({ ...prev, faixa_preco: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Observações Internas</label>
                        <textarea 
                          rows={4}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                          value={editFields.observacoes || ''}
                          onChange={e => setEditFields(prev => ({ ...prev, observacoes: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* AI Analysis Side */}
                    <div className="flex flex-col">
                      <div className="flex-1 bg-indigo-50 rounded-3xl p-6 border border-indigo-100 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="font-black text-indigo-900 flex items-center gap-2">
                            <Sparkles className="text-indigo-600" size={20} /> ANALISTA IA
                          </h4>
                          <button 
                            onClick={analyzeWithAI}
                            disabled={isAnalyzing}
                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                          >
                            <RotateCcw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
                          </button>
                        </div>

                        {isAnalyzing ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-indigo-600 font-bold">Analisando dados do cliente...</p>
                            <p className="text-indigo-400 text-xs mt-1">Isso leva apenas alguns segundos</p>
                          </div>
                        ) : aiAnalysis ? (
                          <div className="flex-1 overflow-y-auto">
                            <div className="prose prose-sm prose-indigo whitespace-pre-wrap text-indigo-800 font-medium leading-relaxed">
                              {aiAnalysis}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                              <Sparkles size={32} />
                            </div>
                            <h5 className="font-bold text-indigo-900 mb-2">Deseja uma análise estratégica?</h5>
                            <p className="text-indigo-600/70 text-sm mb-6">A IA Manos analisa o comportamento do lead e sugere o melhor fechamento.</p>
                            <button 
                              onClick={analyzeWithAI}
                              className="px-6 py-2 bg-white text-indigo-600 font-bold rounded-xl shadow-sm hover:shadow-md transition-all border border-indigo-100"
                            >
                              Gerar Análise Agora
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm md:hidden">
          <aside className="w-72 h-full bg-white p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <LayoutDashboard size={18} />
                </div>
                <h1 className="font-black text-lg text-indigo-950 tracking-tight">MANOS CRM</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                <X />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              <button 
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500'}`}
              >
                <LayoutDashboard size={20} /> Painel Geral
              </button>
              <button 
                onClick={() => { setActiveTab('leads'); setViewMode('list'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'leads' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500'}`}
              >
                <Users size={20} /> Meus Leads
              </button>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
};

export default App;