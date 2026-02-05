
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Search, AlertCircle, MoreHorizontal, 
  TrendingUp, Calendar, History, Car, DollarSign, Info, Tag, 
  ArrowLeft, User as UserIcon, CheckCircle2, XCircle, Clock,
  Save, Edit3, MessageSquare, AlertTriangle, FileCheck, ShoppingCart,
  PhoneOff, UserCheck, BarChart3, PieChart as PieChartIcon, Activity,
  Menu, X, Filter, RotateCcw
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

import { Lead, LeadStatusLabel } from './types';
import { fetchLeads, updateLead, supabase } from './supabaseClient';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const STATUS_OPTIONS: LeadStatusLabel[] = [
  'Novo', 'Respondeu', 'Não Respondeu', 'Score Baixo', 'Em Negociação', 'Pedido de Compra', 'Vendido', 'Perdido'
];

const Badge = ({ status }: { status?: LeadStatusLabel }) => {
  const safeStatus = status || 'Novo';
  const styles: Record<string, string> = {
    'Novo': 'bg-slate-50 text-slate-400 border-slate-200',
    'Respondeu': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Não Respondeu': 'bg-rose-50 text-rose-500 border-rose-200',
    'Score Baixo': 'bg-orange-50 text-orange-700 border-orange-200',
    'Em Negociação': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Pedido de Compra': 'bg-amber-50 text-amber-700 border-amber-200',
    'Vendido': 'bg-emerald-600 text-white border-transparent',
    'Perdido': 'bg-slate-800 text-white border-transparent'
  };
  const currentStyle = styles[safeStatus] || styles['Novo'];
  return (
    <span className={`px-2 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest whitespace-nowrap ${currentStyle}`}>
      {safeStatus}
    </span>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterSeller, setFilterSeller] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');

  const [editFields, setEditFields] = useState<Partial<Lead>>({});
  const [isSaving, setIsSaving] = useState(false);

  const refreshLeads = async () => {
    const data = await fetchLeads();
    setLeads(data || []);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshLeads();
      setLoading(false);
    };
    init();

    const channel = supabase
      .channel('manos-crm-filters-v1')
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
    }
  }, [selectedLeadId, selectedLead]);

  const dashboardData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalHoje = leads.filter(l => l.created_at.startsWith(today)).length;
    const vendidos = leads.filter(l => l.status === 'Vendido').length;
    const emAtendimento = leads.filter(l => ['Respondeu', 'Em Negociação', 'Pedido de Compra'].includes(l.status)).length;
    
    const unclassifiedLeads = leads.filter(l => !l.status || l.status === 'Novo');
    const alertsBySeller: Record<string, number> = {};
    unclassifiedLeads.forEach(l => {
      const v = l.vendedor || 'Pendente';
      alertsBySeller[v] = (alertsBySeller[v] || 0) + 1;
    });

    const origens = leads.reduce((acc: any, l) => {
      const o = l.origem || 'Facebook Ads';
      acc[o] = (acc[o] || 0) + 1;
      return acc;
    }, {});
    const origensChart = Object.entries(origens).map(([name, value]) => ({ name, value }));

    const vendedoresMap = leads.reduce((acc: any, l) => {
      const v = l.vendedor || 'Pendente';
      if (!acc[v]) acc[v] = { name: v, recebidos: 0, ganhos: 0 };
      acc[v].recebidos += 1;
      if (l.status === 'Vendido') acc[v].ganhos += 1;
      return acc;
    }, {});
    const vendedoresChart = Object.values(vendedoresMap);

    const ranking = Object.values(vendedoresMap)
      .filter((v: any) => v.name !== 'Pendente')
      .sort((a: any, b: any) => b.ganhos - a.ganhos);

    return {
      stats: {
        totalHoje,
        emAtendimento,
        vendidos,
        taxaConversao: leads.length > 0 ? ((vendidos / leads.length) * 100).toFixed(1) : 0,
        atrasados: unclassifiedLeads.length
      },
      alertsBySeller,
      origensChart,
      vendedoresChart,
      ranking
    };
  }, [leads]);

  const sellerOptions = useMemo(() => {
    const uniqueSellers = Array.from(new Set(leads.map(l => l.vendedor).filter(Boolean))).sort();
    return ['Todos', ...uniqueSellers];
  }, [leads]);

  const handleSaveAll = async () => {
    if (!selectedLeadId) return;
    setIsSaving(true);
    await updateLead(selectedLeadId, editFields);
    setIsSaving(false);
  };

  const handleQuickStatus = async (status: LeadStatusLabel) => {
    if (!selectedLeadId) return;
    setIsSaving(true);
    await updateLead(selectedLeadId, { status });
    setIsSaving(false);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = (l.nome || '').toLowerCase().includes(search.toLowerCase());
      const matchesSeller = filterSeller === 'Todos' || l.vendedor === filterSeller;
      const matchesStatus = filterStatus === 'Todos' || l.status === filterStatus;
      return matchesSearch && matchesSeller && matchesStatus;
    });
  }, [leads, search, filterSeller, filterStatus]);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-[4px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-[#1E293B]">
      
      {/* Sidebar Desktop */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col hidden md:flex shrink-0">
        <div className="h-20 flex items-center px-8 border-b border-slate-100">
           <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-white" size={18} />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase">Manos <span className="text-indigo-600">CRM</span></span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setViewMode('list'); }} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'leads'} onClick={() => { setActiveTab('leads'); setViewMode('list'); }} icon={<Users size={20} />} label="Gestão de Leads" />
        </nav>
      </aside>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
           <div className="w-72 h-full bg-white shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <span className="font-black text-lg uppercase">Manos <span className="text-indigo-600">CRM</span></span>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
                    <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-2 flex-1">
                <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setViewMode('list'); setIsMobileMenuOpen(false); }} icon={<LayoutDashboard size={20} />} label="Dashboard" />
                <NavItem active={activeTab === 'leads'} onClick={() => { setActiveTab('leads'); setViewMode('list'); setIsMobileMenuOpen(false); }} icon={<Users size={20} />} label="Gestão de Leads" />
              </div>
           </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header Responsivo */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shrink-0 z-10 w-full">
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
               <Menu size={24} />
            </button>
            
            {viewMode === 'detail' && (
              <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <ArrowLeft size={20} />
                <span className="hidden sm:inline text-[11px] font-black uppercase tracking-widest">Voltar</span>
              </button>
            )}
            <h2 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-slate-400 truncate">
              {viewMode === 'detail' ? `Ficha do Cliente` : activeTab === 'dashboard' ? 'Performance' : 'Controle de Leads'}
            </h2>
          </div>
          
          {viewMode === 'detail' && (
            <button 
              onClick={handleSaveAll}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'}`}
            >
              {isSaving ? '...' : <><Save size={16} className="hidden sm:block"/> Salvar</>}
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 w-full">
          {viewMode === 'detail' && selectedLead ? (
            /* DETALHES RESPONSIVO */
            <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in slide-in-from-right-10 duration-500">
               <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-sm relative overflow-hidden">
                  <div className="absolute top-4 right-6 md:top-12 md:right-12">
                     <Badge status={selectedLead.status} />
                  </div>
                  <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl md:text-4xl font-black shadow-lg">
                      {editFields.nome?.charAt(0)}
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      <input 
                        className="text-xl md:text-3xl font-black tracking-tight text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-100 focus:border-indigo-500 focus:outline-none w-full py-1 transition-all text-center md:text-left"
                        value={editFields.nome}
                        onChange={(e) => setEditFields(p => ({...p, nome: e.target.value}))}
                      />
                      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                         <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm w-full md:w-auto">
                            <UserIcon size={16} className="shrink-0"/>
                            <input 
                              className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg focus:outline-none w-full text-sm font-bold"
                              value={editFields.vendedor || ''}
                              onChange={(e) => setEditFields(p => ({...p, vendedor: e.target.value}))}
                              placeholder="Vendedor"
                            />
                         </div>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm">
                           <SectionHeader icon={<Car size={18}/>} title="Carro de Interesse" />
                           <input 
                            className="w-full mt-4 bg-slate-50 border border-slate-100 p-3 md:p-4 rounded-xl text-sm md:text-lg font-black"
                            value={editFields.carro_interesse}
                            onChange={(e) => setEditFields(p => ({...p, carro_interesse: e.target.value}))}
                            placeholder="Modelo..."
                           />
                        </div>
                        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm">
                           <SectionHeader icon={<DollarSign size={18}/>} title="Budget / Preço" />
                           <input 
                            className="w-full mt-4 bg-slate-50 border border-slate-100 p-3 md:p-4 rounded-xl text-sm md:text-lg font-black text-emerald-600"
                            value={editFields.faixa_preco}
                            onChange={(e) => setEditFields(p => ({...p, faixa_preco: e.target.value}))}
                            placeholder="Preço..."
                           />
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm space-y-4">
                       <SectionHeader icon={<Info size={18}/>} title="Observações" />
                       <textarea 
                          className="w-full h-48 md:h-64 p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium transition-all"
                          value={editFields.observacoes}
                          onChange={(e) => setEditFields(p => ({...p, observacoes: e.target.value}))}
                          placeholder="Anote detalhes da negociação..."
                       />
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm h-fit space-y-4 order-first lg:order-last">
                     <SectionHeader icon={<Tag size={18}/>} title="Etapa Atual" />
                     <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 pt-4">
                        <StatusActionBtn onClick={() => handleQuickStatus('Respondeu')} label="Respondeu" color="bg-emerald-50 text-emerald-600" icon={<MessageSquare size={14}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Não Respondeu')} label="Não Resp." color="bg-rose-50 text-rose-600" icon={<PhoneOff size={14}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Score Baixo')} label="Score Baixo" color="bg-orange-50 text-orange-600" icon={<AlertTriangle size={14}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Em Negociação')} label="Negociando" color="bg-indigo-600 text-white" icon={<TrendingUp size={14}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Pedido de Compra')} label="Pedido" color="bg-amber-500 text-white" icon={<ShoppingCart size={14}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Vendido')} label="Vendido" color="bg-emerald-600 text-white" icon={<FileCheck size={14}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Perdido')} label="Perdido" color="bg-slate-900 text-white" icon={<XCircle size={14}/>} />
                     </div>
                  </div>
               </div>
            </div>
          ) : activeTab === 'dashboard' ? (
            /* DASHBOARD RESPONSIVO */
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-700">
               
               {dashboardData.stats.atrasados > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-rose-100/50">
                     <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg animate-pulse">
                           <AlertCircle size={24} />
                        </div>
                        <div>
                           <h3 className="text-sm md:text-lg font-black text-rose-900 uppercase tracking-tight">Leads Pendentes</h3>
                           <p className="text-[10px] md:text-sm text-rose-700 font-medium">Existem {dashboardData.stats.atrasados} leads sem classificação.</p>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-1.5 justify-center md:justify-end">
                        {Object.entries(dashboardData.alertsBySeller).map(([seller, count]) => (
                           <div key={seller} className="bg-white border border-rose-200 px-3 py-1.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase text-rose-600 shadow-sm">
                              {seller}: {count}
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* KPIs Grid */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <KPICard title="Hoje" value={dashboardData.stats.totalHoje} icon={<Calendar className="text-indigo-600 w-4 h-4 md:w-5 md:h-5"/>} color="bg-indigo-50" />
                  <KPICard title="Ativos" value={dashboardData.stats.emAtendimento} icon={<Activity className="text-emerald-600 w-4 h-4 md:w-5 md:h-5"/>} color="bg-emerald-50" />
                  <KPICard title="Conv." value={`${dashboardData.stats.taxaConversao}%`} icon={<TrendingUp className="text-amber-600 w-4 h-4 md:w-5 md:h-5"/>} color="bg-amber-50" />
                  <KPICard title="Vendas" value={dashboardData.stats.vendidos} icon={<FileCheck className="text-indigo-600 w-4 h-4 md:w-5 md:h-5"/>} color="bg-indigo-50" />
               </div>

               {/* Gráficos Stacked on Mobile */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  <ChartCard title="Conversão / Vendedor">
                    <div className="h-64 md:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.vendedoresChart}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Bar dataKey="recebidos" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Recebidos" />
                          <Bar dataKey="ganhos" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ganhos" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <ChartCard title="Origem dos Leads">
                    <div className="h-64 md:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dashboardData.origensChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                            {dashboardData.origensChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
               </div>

               <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm">
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                     <SectionHeader icon={<TrendingUp size={20}/>} title="Performance Rank" />
                     <span className="hidden sm:inline text-[9px] font-black text-slate-400 uppercase tracking-widest">Baseado em Vendas</span>
                  </div>
                  <div className="space-y-3">
                     {dashboardData.ranking.map((v: any, index: number) => (
                        <div key={v.name} className="flex items-center justify-between p-4 md:p-6 bg-slate-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all">
                           <div className="flex items-center gap-4 md:gap-6">
                              <span className="text-xl md:text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</span>
                              <div>
                                 <h4 className="font-black text-sm md:text-base text-slate-800">{v.name}</h4>
                                 <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase">{v.recebidos} leads</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <span className="text-xl md:text-2xl font-black text-indigo-600 block leading-none">{v.ganhos}</span>
                              <span className="text-[8px] font-black text-slate-300 uppercase">Vendas</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          ) : (
            /* LISTAGEM DE LEADS COM FILTROS */
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
               
               {/* ÁREA DE FILTROS */}
               <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Filter size={18} className="text-indigo-600" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Filtros Inteligentes</h3>
                     </div>
                     {(search || filterSeller !== 'Todos' || filterStatus !== 'Todos') && (
                        <button 
                           onClick={() => { setSearch(''); setFilterSeller('Todos'); setFilterStatus('Todos'); }}
                           className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                           <RotateCcw size={14} /> Limpar Filtros
                        </button>
                     )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                           className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                           placeholder="Buscar por nome..."
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                        />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Vendedor</label>
                        <select 
                           value={filterSeller}
                           onChange={(e) => setFilterSeller(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                        >
                           {sellerOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Qualificação / Status</label>
                        <select 
                           value={filterStatus}
                           onChange={(e) => setFilterStatus(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                        >
                           <option value="Todos">Todos os Status</option>
                           {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                     </div>
                  </div>
               </div>

               {/* TABELA DE LEADS */}
               <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50/50 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 md:px-10 py-5 md:py-7">Cliente</th>
                        <th className="px-6 md:px-10 py-5 md:py-7">Interesse</th>
                        <th className="px-6 md:px-10 py-5 md:py-7">Vendedor</th>
                        <th className="px-6 md:px-10 py-5 md:py-7">Status</th>
                        <th className="px-6 md:px-10 py-5 md:py-7 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} onClick={() => { setSelectedLeadId(lead.id); setViewMode('detail'); }} className="hover:bg-slate-50 transition-all cursor-pointer group">
                          <td className="px-6 md:px-10 py-5 md:py-7">
                            <div className="flex items-center gap-3 md:gap-4">
                               <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-[10px] md:text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                  {lead.nome?.charAt(0)}
                               </div>
                               <span className="font-black text-xs md:text-sm text-slate-800 truncate max-w-[150px] md:max-w-none">{lead.nome}</span>
                            </div>
                          </td>
                          <td className="px-6 md:px-10 py-5 md:py-7 text-[10px] md:text-[12px] font-bold text-slate-500 uppercase truncate max-w-[120px] md:max-w-none">{lead.carro_interesse || '-'}</td>
                          <td className="px-6 md:px-10 py-5 md:py-7">
                             <span className="text-[8px] md:text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-indigo-100 uppercase tracking-widest whitespace-nowrap">{lead.vendedor || 'Pendente'}</span>
                          </td>
                          <td className="px-6 md:px-10 py-5 md:py-7"><Badge status={lead.status} /></td>
                          <td className="px-6 md:px-10 py-5 md:py-7 text-right"><MoreHorizontal className="inline text-slate-300" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLeads.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <Search size={32} className="text-slate-200" />
                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Nenhum lead corresponde aos filtros aplicados.</p>
                        <button 
                           onClick={() => { setSearch(''); setFilterSeller('Todos'); setFilterStatus('Todos'); }}
                           className="text-[10px] font-black uppercase text-indigo-600 underline"
                        >
                           Ver todos os leads
                        </button>
                    </div>
                  )}
                </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl md:rounded-2xl text-[13px] font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
  >
    {React.cloneElement(icon, { size: 18 })} {label}
  </button>
);

const KPICard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-4 md:p-8 rounded-[1rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-3 md:gap-4 h-full">
     <div className={`w-10 h-10 md:w-12 md:h-12 ${color} rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm`}>
        {icon}
     </div>
     <div>
        <h4 className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
        <p className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter mt-0.5">{value}</p>
     </div>
  </div>
);

const ChartCard = ({ title, children }: any) => (
  <div className="bg-white p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
     <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest mb-6 md:mb-10 border-l-4 border-indigo-600 pl-4">{title}</h4>
     {children}
  </div>
);

const SectionHeader = ({ icon, title }: any) => (
  <div className="flex items-center gap-2.5">
     <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
        {React.cloneElement(icon as any, { size: 14 })}
     </div>
     <h3 className="text-[10px] md:text-[12px] font-black text-slate-900 uppercase tracking-widest truncate">{title}</h3>
  </div>
);

const StatusActionBtn = ({ onClick, label, color, icon }: any) => (
  <button 
    onClick={onClick}
    className={`w-full py-2.5 md:py-3.5 px-3 md:px-6 rounded-lg md:rounded-xl flex items-center justify-between text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] border border-transparent ${color}`}
  >
    <span className="truncate mr-1">{label}</span>
    {icon}
  </button>
);

export default App;
