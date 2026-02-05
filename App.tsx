
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Search, AlertCircle, MoreHorizontal, 
  TrendingUp, Calendar, Car, DollarSign, Info, Tag, 
  ArrowLeft, User as UserIcon, XCircle, 
  Save, MessageSquare, FileCheck, ShoppingCart,
  PhoneOff, Activity, Menu, X, Filter, RotateCcw,
  Sparkles, Kanban, List as ListIcon,
  ChevronRight, Clock, MapPin
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

import { Lead, LeadStatusLabel } from './types';
import { fetchLeads, updateLead, supabase } from './supabaseClient';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUS_OPTIONS: LeadStatusLabel[] = [
  'Novo', 'Respondeu', 'Não Respondeu', 'Score Baixo', 'Em Negociação', 'Pedido de Compra', 'Vendido', 'Perdido'
];

// Mapeamento amigável para os status técnicos
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Analise este interesse de venda de carro e seja bem direto para um vendedor:
      Diga a chance de fechar (0 a 100%).
      Dê 2 dicas do que fazer.
      Sugira uma mensagem curta de WhatsApp.
      
      Dados:
      Nome: ${selectedLead.nome}
      Carro: ${selectedLead.carro_interesse}
      Quanto quer pagar: ${selectedLead.faixa_preco}
      Anotações: ${selectedLead.observacoes}
      Situação: ${selectedLead.status}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiAnalysis(response.text || "O assistente não conseguiu analisar agora.");
    } catch (err) {
      console.error(err);
      setAiAnalysis("Houve um erro ao chamar o assistente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const dashboardData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalHoje = leads.filter(l => l.created_at.startsWith(today)).length;
    const vendidos = leads.filter(l => l.status === 'Vendido').length;
    const emAtendimento = leads.filter(l => ['Respondeu', 'Em Negociação', 'Pedido de Compra'].includes(l.status)).length;
    
    const unclassifiedLeads = leads.filter(l => !l.status || l.status === 'Novo');
    const alertsBySeller: Record<string, number> = {};
    unclassifiedLeads.forEach(l => {
      const v = l.vendedor || 'Sem Vendedor';
      alertsBySeller[v] = (alertsBySeller[v] || 0) + 1;
    });

    const origens = leads.reduce((acc: any, l) => {
      const o = l.origem || 'Facebook Ads';
      acc[o] = (acc[o] || 0) + 1;
      return acc;
    }, {});
    const origensChart = Object.entries(origens).map(([name, value]) => ({ name, value }));

    const vendedoresMap = leads.reduce((acc: any, l) => {
      const v = l.vendedor || 'Sem Vendedor';
      if (!acc[v]) acc[v] = { name: v, recebidos: 0, ganhos: 0 };
      acc[v].recebidos += 1;
      if (l.status === 'Vendido') acc[v].ganhos += 1;
      return acc;
    }, {});
    const vendedoresChart = Object.values(vendedoresMap);

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
      vendedoresChart
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
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white gap-6">
      <div className="w-16 h-16 border-[5px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-center space-y-2">
        <p className="text-slate-900 font-black text-xl tracking-tighter uppercase">Manos CRM</p>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Buscando Clientes...</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans overflow-hidden">
      {/* MENU LATERAL */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col hidden md:flex shrink-0 z-50 shadow-sm">
        <div className="h-24 flex items-center px-10 border-b border-slate-100">
           <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100"><TrendingUp className="text-white" size={24} /></div>
            <div className="flex flex-col">
                <span className="font-black text-2xl tracking-tighter uppercase leading-none">Manos <span className="text-indigo-600">CRM</span></span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Simples & Prático</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-8 space-y-3">
          <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setViewMode('list'); }} icon={<LayoutDashboard size={20} />} label="Início / Resumo" />
          <NavItem active={activeTab === 'leads'} onClick={() => { setActiveTab('leads'); }} icon={<Users size={20} />} label="Meus Clientes" />
          <div className="pt-10 px-4 pb-4"><span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Assistente</span></div>
          <NavItem active={false} onClick={() => {}} icon={<Sparkles size={20} className="text-indigo-500" />} label="Chances de Venda" />
        </nav>
        <div className="p-8 border-t border-slate-100">
           <div className="bg-slate-50 rounded-2xl p-5 flex items-center gap-4 border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">A</div>
              <div className="overflow-hidden">
                <p className="text-sm font-black truncate text-slate-900">Administrador</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loja Completa</p>
              </div>
           </div>
        </div>
      </aside>

      {/* CABEÇALHO CELULAR */}
      <div className="md:hidden h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-[100]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><TrendingUp className="text-white" size={20} /></div>
            <span className="font-black text-xl uppercase">Manos CRM</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-slate-50 rounded-xl text-slate-600"><Menu size={24} /></button>
      </div>

      {/* MENU MODAL CELULAR */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
           <div className="w-80 h-full bg-white shadow-2xl flex flex-col p-8 animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-12">
                 <span className="font-black text-2xl uppercase">Manos <span className="text-indigo-600">CRM</span></span>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-500"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} icon={<LayoutDashboard size={20} />} label="Resumo" />
                <NavItem active={activeTab === 'leads'} onClick={() => { setActiveTab('leads'); setIsMobileMenuOpen(false); }} icon={<Users size={20} />} label="Clientes" />
              </div>
           </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* BARRA SUPERIOR */}
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-40 w-full">
          <div className="flex items-center gap-8">
            {viewMode === 'detail' && (
              <button onClick={() => setViewMode('list')} className="flex items-center gap-3 text-slate-400 hover:text-indigo-600 transition-all group">
                <div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all"><ArrowLeft size={20} /></div>
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Ver Todos</span>
              </button>
            )}
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {viewMode === 'detail' ? `Ficha do Cliente` : activeTab === 'dashboard' ? 'Como estamos hoje?' : 'Acompanhar Vendas'}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <Calendar size={12}/> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {viewMode === 'detail' ? (
              <button 
                onClick={handleSaveAll} 
                disabled={isSaving} 
                className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 ${isSaving ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}
              >
                {isSaving ? 'Gravando...' : <><Save size={18}/> Salvar Tudo</>}
              </button>
            ) : activeTab === 'leads' ? (
               <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200">
                 <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${viewMode === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><ListIcon size={16}/> Em Lista</button>
                 <button onClick={() => setViewMode('kanban')} className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${viewMode === 'kanban' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Kanban size={16}/> Em Painel</button>
               </div>
            ) : null}
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-10 max-w-[1600px] w-full mx-auto">
          {viewMode === 'detail' && selectedLead ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
               {/* FICHA DETALHADA */}
               <div className="xl:col-span-8 space-y-8">
                  <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 rounded-full -mr-40 -mt-40 blur-3xl"></div>
                    <div className="relative flex flex-col md:flex-row gap-10">
                      <div className="w-32 h-32 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-indigo-100 shrink-0">{editFields.nome?.charAt(0)}</div>
                      <div className="flex-1 space-y-8">
                        <div className="space-y-3">
                          <input className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 bg-transparent border-none focus:outline-none w-full p-0" value={editFields.nome} onChange={(e) => setEditFields(p => ({...p, nome: e.target.value}))}/>
                          <div className="flex flex-wrap items-center gap-6 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                            <span className="flex items-center gap-2"><Clock size={16}/> Chegou em: {new Date(selectedLead.created_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-2"><MapPin size={16}/> Vindo do Facebook</span>
                            <Badge status={selectedLead.status} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-3 bg-slate-50 px-6 py-3.5 rounded-2xl border border-slate-100 flex-1 md:flex-none md:min-w-[250px]">
                              <UserIcon size={18} className="text-indigo-600 shrink-0"/>
                              <input className="bg-transparent focus:outline-none w-full text-xs font-black text-slate-700 uppercase" value={editFields.vendedor || ''} onChange={(e) => setEditFields(p => ({...p, vendedor: e.target.value}))} placeholder="QUEM ESTÁ ATENDENDO?"/>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <DetailCard icon={<Car size={20}/>} title="Carro que deseja" color="indigo">
                        <input className="w-full mt-4 bg-slate-50 border border-slate-100 p-6 rounded-[2rem] text-xl font-black text-slate-900 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 ring-indigo-50 transition-all" value={editFields.carro_interesse} onChange={(e) => setEditFields(p => ({...p, carro_interesse: e.target.value}))} placeholder="Qual modelo o cliente quer?"/>
                      </DetailCard>
                      <DetailCard icon={<DollarSign size={20}/>} title="Quanto pretende pagar" color="emerald">
                        <input className="w-full mt-4 bg-slate-50 border border-slate-100 p-6 rounded-[2rem] text-xl font-black text-emerald-600 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 ring-emerald-50 transition-all" value={editFields.faixa_preco} onChange={(e) => setEditFields(p => ({...p, faixa_preco: e.target.value}))} placeholder="R$ 0,00"/>
                      </DetailCard>
                  </div>

                  <div className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-sm space-y-6">
                     <SectionHeader icon={<Info size={20}/>} title="O que já foi falado com ele?" />
                     <textarea className="w-full h-80 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-base font-medium text-slate-700 leading-relaxed outline-none focus:bg-white focus:ring-4 ring-indigo-50 transition-all placeholder:text-slate-300" value={editFields.observacoes} onChange={(e) => setEditFields(p => ({...p, observacoes: e.target.value}))} placeholder="Escreva aqui os detalhes da conversa..."/>
                  </div>
               </div>

               {/* LATERAL DA FICHA */}
               <div className="xl:col-span-4 space-y-8">
                  <div className="bg-indigo-900 p-10 rounded-[3rem] shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                     <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl"></div>
                     <div className="relative space-y-8">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-indigo-500 rounded-2xl text-white animate-pulse shadow-lg"><Sparkles size={22}/></div>
                           <h3 className="text-white font-black text-[13px] uppercase tracking-[0.25em]">Dicas do Assistente</h3>
                        </div>
                        {aiAnalysis ? (
                          <div className="space-y-6">
                            <div className="bg-white/10 p-6 rounded-[2rem] border border-white/10">
                              <p className="text-indigo-50 text-sm font-medium leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                            </div>
                            <button onClick={() => setAiAnalysis(null)} className="text-[10px] font-black uppercase text-indigo-300 hover:text-white transition-all underline decoration-2 underline-offset-4">Pedir nova ajuda</button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                             <p className="text-indigo-200 text-sm font-medium leading-relaxed">Deixe o assistente analisar esse cliente e te dar uma dica de como vender para ele.</p>
                             <button 
                               onClick={analyzeWithAI} 
                               disabled={isAnalyzing}
                               className={`w-full py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${isAnalyzing ? 'bg-indigo-800 text-indigo-400 cursor-wait' : 'bg-white text-indigo-900 hover:scale-[1.02] active:scale-95'}`}
                             >
                               {isAnalyzing ? 'Pensando...' : <><Sparkles size={18}/> Me dê uma dica!</>}
                             </button>
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm space-y-8">
                     <SectionHeader icon={<Tag size={20}/>} title="Mudar situação do cliente" />
                     <div className="grid grid-cols-1 gap-3">
                        <StatusActionBtn onClick={() => handleQuickStatus('Respondeu')} label="Já conversou" color="bg-emerald-50 text-emerald-600 border-emerald-100" icon={<MessageSquare size={16}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Não Respondeu')} label="Não atende" color="bg-rose-50 text-rose-600 border-rose-100" icon={<PhoneOff size={16}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Em Negociação')} label="Em conversa" color="bg-indigo-600 text-white" icon={<TrendingUp size={16}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Pedido de Compra')} label="Quase Vendido" color="bg-amber-500 text-white" icon={<ShoppingCart size={16}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Vendido')} label="Vendido!" color="bg-emerald-600 text-white" icon={<FileCheck size={16}/>} />
                        <StatusActionBtn onClick={() => handleQuickStatus('Perdido')} label="Desistiu" color="bg-slate-900 text-white" icon={<XCircle size={16}/>} />
                     </div>
                  </div>
               </div>
            </div>
          ) : activeTab === 'dashboard' ? (
            <div className="space-y-12 animate-in fade-in duration-700">
               {/* AVISOS */}
               {dashboardData.stats.atrasados > 0 && (
                  <div className="bg-rose-600 rounded-[2.5rem] p-10 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl shadow-rose-200 border border-rose-500">
                     <div className="flex items-center gap-8 text-center lg:text-left">
                        <div className="shrink-0 w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center text-white shadow-inner animate-bounce"><AlertCircle size={40} /></div>
                        <div className="space-y-2">
                           <h3 className="text-2xl font-black text-white uppercase tracking-tight">Clientes sem Resposta</h3>
                           <p className="text-sm text-rose-100 font-bold opacity-80">Você tem {dashboardData.stats.atrasados} novos interessados que ainda não foram atendidos hoje.</p>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-3 justify-center">
                        {Object.entries(dashboardData.alertsBySeller).map(([seller, count]) => (
                           <div key={seller} className="bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-2.5 rounded-2xl text-xs font-black uppercase text-white shadow-sm">{seller}: {count}</div>
                        ))}
                     </div>
                  </div>
               )}

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  <KPICard title="Clientes de Hoje" value={dashboardData.stats.totalHoje} icon={<Calendar className="text-indigo-600" size={24}/>} trend="+15%" color="bg-indigo-50" />
                  <KPICard title="Sendo Atendidos" value={dashboardData.stats.emAtendimento} icon={<Activity className="text-emerald-600" size={24}/>} trend="Ativos" color="bg-emerald-50" />
                  <KPICard title="Conversão" value={`${dashboardData.stats.taxaConversao}%`} icon={<TrendingUp className="text-amber-600" size={24}/>} trend="Bom!" color="bg-amber-50" />
                  <KPICard title="Vendas no Mês" value={dashboardData.stats.vendidos} icon={<FileCheck className="text-indigo-600" size={24}/>} trend="Vendas" color="bg-indigo-50" />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-12">
                       <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.3em]">Resultados do Time</h4>
                       <div className="flex gap-6">
                          <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 bg-indigo-600 rounded-full shadow-lg shadow-indigo-100"></div><span className="text-[10px] font-black text-slate-400 uppercase">VENDAS</span></div>
                          <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 bg-slate-200 rounded-full"></div><span className="text-[10px] font-black text-slate-400 uppercase">CLIENTES</span></div>
                       </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.vendedoresChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }} />
                          <Bar dataKey="recebidos" fill="#f1f5f9" radius={[8, 8, 0, 0]} name="Contatos" barSize={45} />
                          <Bar dataKey="ganhos" fill="#6366f1" radius={[8, 8, 0, 0]} name="Vendas" barSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="lg:col-span-4 bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.3em] mb-12">De onde eles vêm?</h4>
                    <div className="h-[350px] w-full flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={dashboardData.origensChart} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={80} 
                            outerRadius={120} 
                            paddingAngle={10} 
                            dataKey="value"
                            stroke="none"
                          >
                            {dashboardData.origensChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '24px' }} />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: '900', paddingTop: '30px', textTransform: 'uppercase' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-700">
               {/* FILTROS */}
               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-5">
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm"><Filter size={24} /></div>
                        <h3 className="text-[13px] font-black uppercase tracking-[0.3em] text-slate-900">Procurar Clientes</h3>
                     </div>
                     {(search || filterSeller !== 'Todos' || filterStatus !== 'Todos') && (
                        <button onClick={() => { setSearch(''); setFilterSeller('Todos'); setFilterStatus('Todos'); }} className="flex items-center gap-3 text-xs font-black uppercase text-indigo-600 hover:scale-[1.02] transition-all"><RotateCcw size={18} /> Ver todos</button>
                     )}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                     <div className="lg:col-span-6 relative group">
                       <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-all" size={24} />
                       <input 
                         className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-black focus:bg-white focus:ring-4 ring-indigo-50 transition-all outline-none uppercase placeholder:text-slate-300" 
                         placeholder="Escreva o nome do cliente..." 
                         value={search} 
                         onChange={(e) => setSearch(e.target.value)}
                       />
                     </div>
                     <div className="lg:col-span-3">
                       <select value={filterSeller} onChange={(e) => setFilterSeller(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-5 text-xs font-black appearance-none cursor-pointer focus:bg-white outline-none uppercase tracking-wider shadow-sm">
                          {sellerOptions.map(opt => <option key={opt} value={opt}>{opt === 'Todos' ? 'Qualquer Vendedor' : `Vendedor: ${opt}`}</option>)}
                       </select>
                     </div>
                     <div className="lg:col-span-3">
                       <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-5 text-xs font-black appearance-none cursor-pointer focus:bg-white outline-none uppercase tracking-wider shadow-sm">
                          <option value="Todos">Todas as Situações</option>
                          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{STATUS_FRIENDLY[opt] || opt}</option>)}
                       </select>
                     </div>
                  </div>
               </div>

               {viewMode === 'list' ? (
                 <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-12 py-8">Nome do Cliente</th>
                          <th className="px-12 py-8">Carro desejado</th>
                          <th className="px-12 py-8">Vendedor</th>
                          <th className="px-12 py-8">Situação</th>
                          <th className="px-12 py-8 text-right">Ver detalhes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredLeads.map(lead => (
                          <tr key={lead.id} onClick={() => { setSelectedLeadId(lead.id); setViewMode('detail'); }} className="hover:bg-indigo-50/30 transition-all cursor-pointer group">
                            <td className="px-12 py-8">
                              <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-slate-100 rounded-[1.25rem] flex items-center justify-center text-slate-400 font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm shrink-0 uppercase">{lead.nome?.charAt(0)}</div>
                                <div className="flex flex-col gap-1">
                                  <span className="font-black text-base text-slate-900 tracking-tight">{lead.nome}</span>
                                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Chegou: {new Date(lead.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-12 py-8">
                               <div className="flex flex-col gap-1">
                                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{lead.carro_interesse || 'AINDA NÃO DISSE'}</span>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md self-start">{lead.faixa_preco || 'Sem preço'}</span>
                               </div>
                            </td>
                            <td className="px-12 py-8">
                              <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-100 text-[10px] font-black text-slate-600 uppercase border border-slate-200">
                                <UserIcon size={14}/> {lead.vendedor || 'AGUARDANDO'}
                              </span>
                            </td>
                            <td className="px-12 py-8"><Badge status={lead.status} /></td>
                            <td className="px-12 py-8 text-right">
                               <button className="p-4 bg-slate-100 rounded-2xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-90 transition-all shadow-sm"><ChevronRight size={20}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredLeads.length === 0 && (
                    <div className="p-32 text-center flex flex-col items-center gap-8">
                       <div className="p-10 bg-slate-50 rounded-full text-slate-200"><Search size={80}/></div>
                       <div className="space-y-2">
                         <p className="text-slate-900 font-black text-2xl uppercase tracking-tighter">Nada encontrado</p>
                         <p className="text-slate-400 font-bold text-sm">Não achamos ninguém com esse nome ou filtros.</p>
                       </div>
                    </div>
                  )}
                 </div>
               ) : (
                 <div className="flex gap-10 overflow-x-auto pb-12 snap-x px-2">
                   {STATUS_OPTIONS.map(status => {
                     const statusLeads = filteredLeads.filter(l => l.status === status || (!l.status && status === 'Novo'));
                     return (
                       <div key={status} className="min-w-[350px] w-[350px] shrink-0 snap-start flex flex-col gap-6">
                         <div className="flex items-center justify-between px-6">
                            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.25em]">{STATUS_FRIENDLY[status] || status}</h4>
                            <span className="text-[11px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-sm">{statusLeads.length}</span>
                         </div>
                         <div className="bg-slate-200/40 p-5 rounded-[2.5rem] min-h-[600px] flex flex-col gap-4 border border-slate-100">
                           {statusLeads.map(l => (
                             <div 
                               key={l.id} 
                               onClick={() => { setSelectedLeadId(l.id); setViewMode('detail'); }}
                               className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:scale-[1.03] transition-all cursor-pointer group"
                             >
                                <div className="space-y-5">
                                   <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-wider">{l.vendedor || 'PENDENTE'}</span>
                                      <MoreHorizontal size={18} className="text-slate-300 group-hover:text-indigo-600 transition-all" />
                                   </div>
                                   <div>
                                      <p className="font-black text-lg text-slate-900 tracking-tight leading-tight mb-2 uppercase">{l.nome}</p>
                                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{l.carro_interesse || 'AINDA NÃO ESCOLHEU'}</p>
                                   </div>
                                   <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                                      <span className="text-[10px] font-black text-slate-300 uppercase">{new Date(l.created_at).toLocaleDateString()}</span>
                                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100">{l.nome?.charAt(0)}</div>
                                   </div>
                                </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
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
    className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] text-[13px] font-black transition-all duration-300 uppercase tracking-widest ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 translate-x-2' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
  >
    {React.cloneElement(icon, { size: 20 })} {label}
  </button>
);

const KPICard = ({ title, value, icon, trend, color }: any) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-8 group hover:shadow-2xl hover:scale-[1.02] transition-all">
     <div className="flex items-start justify-between">
       <div className={`w-16 h-16 ${color} rounded-[1.5rem] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>{icon}</div>
       <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl uppercase">{trend}</span>
     </div>
     <div>
       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-3">{title}</h4>
       <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
     </div>
  </div>
);

const DetailCard = ({ icon, title, children, color }: any) => (
  <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm space-y-4">
     <div className="flex items-center gap-4">
       <div className={`p-3 rounded-2xl shrink-0 ${color === 'indigo' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'bg-emerald-50 text-emerald-600 shadow-sm'}`}>
         {React.cloneElement(icon, { size: 20 })}
       </div>
       <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
     </div>
     {children}
  </div>
);

const SectionHeader = ({ icon, title }: any) => (
  <div className="flex items-center gap-4">
    <div className="p-3 bg-slate-100 rounded-2xl text-slate-900 shrink-0 shadow-sm">
      {React.cloneElement(icon as any, { size: 20 })}
    </div>
    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
  </div>
);

const StatusActionBtn = ({ onClick, label, color, icon }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full py-5 px-8 rounded-[1.75rem] flex items-center justify-between text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border group hover:scale-[1.03] active:scale-95 ${color}`}
  >
    <span className="truncate mr-4">{label}</span>
    <span className="group-hover:rotate-12 group-hover:scale-125 transition-transform">{icon}</span>
  </button>
);

export default App;
