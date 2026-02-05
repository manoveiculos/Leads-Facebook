
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Search, AlertCircle, MoreHorizontal, 
  TrendingUp, Calendar, Car, DollarSign, Info, Tag, 
  ArrowLeft, User as UserIcon, XCircle, 
  Save, MessageSquare, FileCheck, ShoppingCart,
  PhoneOff, Activity, Menu, X, Filter, RotateCcw,
  Sparkles, Kanban, List as ListIcon,
  ChevronRight, Clock, MapPin, PieChart as PieChartIcon,
  Lock, LogOut, BarChart3, Target, Zap, Globe, TrendingDown,
  Award, Briefcase, MousePointer2, ShieldCheck
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar, AreaChart, Area,
  ComposedChart, Line
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

import { Lead, LeadStatusLabel, DashboardStats } from './types';
import { fetchLeads, updateLead, supabase } from './supabaseClient';

const COLORS = ['#e31e24', '#001e4a', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// Cores Oficiais Manos
const MANOS_RED = "#e31e24";
const MANOS_BLUE = "#001e4a";

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

const LOGO_URL = "https://manosveiculos.com.br/wp-content/uploads/2024/02/LogoManos.png";
const LOGIN_BG_URL = "https://manosveiculos.com.br/wp-content/uploads/2024/02/Banner-desktop.png";

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('manos_auth') === 'true';
  });
  const [userRole, setUserRole] = useState<'admin' | 'master' | null>(() => {
    return sessionStorage.getItem('manos_role') as any;
  });

  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'master-analysis'>('dashboard');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'detail'>('list');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [filterSeller, setFilterSeller] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [dashboardFilterMode, setDashboardFilterMode] = useState<'all' | 'today' | 'active'>('all');

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [globalStrategy, setGlobalStrategy] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Lógica de Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === 'Alexandre' && loginPass === 'Manos374@') {
      setIsAuthenticated(true);
      setUserRole('master');
      sessionStorage.setItem('manos_auth', 'true');
      sessionStorage.setItem('manos_role', 'master');
    } else if (loginUser.toLowerCase() === 'manos' && loginPass === 'facebook') {
      setIsAuthenticated(true);
      setUserRole('admin');
      sessionStorage.setItem('manos_auth', 'true');
      sessionStorage.setItem('manos_role', 'admin');
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 3000);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    sessionStorage.clear();
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const init = async () => {
      setLoading(true);
      const data = await fetchLeads();
      setLeads(data || []);
      setLoading(false);
    };
    init();

    const channel = supabase
      .channel('manos-crm-v7')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_facebook_2026' }, (payload) => {
        if (payload.eventType === 'INSERT') setLeads(p => [payload.new as Lead, ...p]);
        if (payload.eventType === 'UPDATE') {
          setLeads(p => p.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLeads = leads.filter(l => l.created_at.startsWith(todayStr));
    const activeLeads = leads.filter(l => !['Vendido', 'Perdido', 'Novo'].includes(l.status));
    const soldLeads = leads.filter(l => l.status === 'Vendido');
    
    return {
      total_hoje: todayLeads.length,
      em_atendimento: activeLeads.length,
      taxa_conversao: leads.length > 0 ? Math.round((soldLeads.length / leads.length) * 100) : 0,
      total_leads: leads.length,
      vendas_valor: soldLeads.length * 85000, // Estimativa Manos
      cac_medio: 12.40 // Métrica fixa simulada baseada em investimento de R$ 3k/mês
    };
  }, [leads]);

  // Dados Estratégicos para o Alexandre
  const performanceData = useMemo(() => ([
    { campaign: 'Oferta SUV Maio', leads: 245, conversion: 4.2, cpl: 8.90 },
    { campaign: 'Seminovos Premium', leads: 180, conversion: 7.8, cpl: 15.40 },
    { campaign: 'Feirão 48h', leads: 420, conversion: 2.1, cpl: 6.20 },
    { campaign: 'Retomada Zero', leads: 110, conversion: 5.5, cpl: 11.20 },
  ]), []);

  const dailyGrowth = useMemo(() => ([
    { day: 'Seg', leads: 42, sales: 2 },
    { day: 'Ter', leads: 58, sales: 4 },
    { day: 'Qua', leads: 35, sales: 1 },
    { day: 'Qui', leads: 72, sales: 5 },
    { day: 'Sex', leads: 85, sales: 7 },
    { day: 'Sab', leads: 64, sales: 3 },
    { day: 'Dom', leads: 21, sales: 1 },
  ]), []);

  const analyzeGlobalStrategy = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Como consultor master de CRM da Manos Veículos, analise estes dados de leads totais: ${leads.length}.
      Status atual: ${leads.filter(l => l.status === 'Vendido').length} vendidos.
      Principais carros: ${leads.map(l => l.carro_interesse).slice(0, 5).join(', ')}.
      
      Dê ao Alexandre:
      1. Diagnóstico de gargalo no atendimento.
      2. Sugestão de alteração de público no Facebook Ads para melhorar o Score.
      3. Plano de ação para os próximos 7 dias focado em vender +10 carros.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      setGlobalStrategy(response.text);
    } catch (err) { setGlobalStrategy("Falha na inteligência master."); }
    finally { setIsAnalyzing(false); }
  };

  const navigateFromDashboard = (mode: 'all' | 'today' | 'active') => {
    setDashboardFilterMode(mode);
    setActiveTab('leads');
    setViewMode('list');
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(search.toLowerCase()) || (l.carro_interesse || '').toLowerCase().includes(search.toLowerCase());
    const matchesSeller = filterSeller === 'Todos' || l.vendedor === filterSeller;
    const matchesStatus = filterStatus === 'Todos' || l.status === filterStatus;
    return matchesSearch && matchesSeller && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative" style={{ backgroundImage: `url(${LOGIN_BG_URL})`, backgroundSize: 'cover' }}>
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"></div>
        <div className="max-w-md w-full relative z-10">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[40px] shadow-2xl p-10 border border-white">
            <div className="text-center mb-10">
              <img src={LOGO_URL} alt="Manos" className="h-16 mx-auto mb-6" />
              <h1 className="text-2xl font-black text-slate-800">CENTRAL ESTRATÉGICA</h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Identidade Manos Veículos</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <input type="text" required value={loginUser} onChange={e => setLoginUser(e.target.value)} placeholder="Usuário" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-600 font-medium" />
              <input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="Senha" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-red-600 font-medium" />
              <button type="submit" style={{ backgroundColor: MANOS_RED }} className="w-full text-white font-black py-4 rounded-2xl shadow-xl shadow-red-200 hover:scale-[1.02] transition-all">ACESSAR PAINEL</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Estratégica */}
      <aside className="w-64 bg-slate-900 flex flex-col p-6 text-white border-r border-slate-800 shrink-0">
        <div className="mb-10 text-center">
          <img src={LOGO_URL} alt="Manos" className="h-12 mx-auto brightness-200" />
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black tracking-widest text-slate-400">ONLINE</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-red-600 font-black shadow-lg shadow-red-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('leads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'leads' ? 'bg-red-600 font-black shadow-lg shadow-red-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Users size={20} /> Leads Ativos
          </button>
          
          {userRole === 'master' && (
            <div className="pt-8">
              <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Master Alexandre</p>
              <button onClick={() => setActiveTab('master-analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeTab === 'master-analysis' ? 'bg-white text-slate-900 font-black shadow-xl shadow-white/10' : 'text-slate-400 hover:bg-slate-800'}`}>
                <ShieldCheck size={20} /> Visão Master
              </button>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 p-4 rounded-2xl mb-4 border border-slate-700">
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Versão CRM</p>
            <p className="text-xs font-bold text-red-500">4.5 HIGH-PERFORMANCE</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:text-rose-300 font-bold transition-colors">
            <LogOut size={18} /> Sair com segurança
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              {activeTab === 'master-analysis' ? 'Estratégia Alexandre' : 'Operação Manos'}
            </h2>
            <div className="h-6 w-px bg-slate-200"></div>
            <p className="text-xs font-bold text-slate-400">Total: {leads.length} Leads na base</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-xs font-black text-slate-900 leading-none mb-1">{userRole === 'master' ? 'ALEXANDRE' : 'ADMIN'}</p>
               <p className="text-[10px] text-slate-400 font-bold">PERFIL {userRole?.toUpperCase()}</p>
             </div>
             <div className="w-12 h-12 bg-slate-100 rounded-2xl border border-slate-200 p-2 flex items-center justify-center">
               <img src={LOGO_URL} alt="Avatar" className="w-full h-full object-contain" />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Leads Hoje', val: stats.total_hoje, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100', mode: 'today' },
                  { label: 'Em Atendimento', val: stats.em_atendimento, icon: Activity, color: 'text-red-600', bg: 'bg-red-100', mode: 'active' },
                  { label: 'Conversão Venda', val: `${stats.taxa_conversao}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100', mode: null },
                  { label: 'CAC Médio', val: `R$ ${stats.cac_medio}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-100', mode: null },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-2xl ${s.bg} ${s.color}`}><s.icon size={20} /></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                   <h3 className="text-xs font-black text-slate-800 mb-8 uppercase flex items-center gap-2"><PieChartIcon size={16} /> Comportamento Semanal de Leads</h3>
                   <div className="h-72">
                     <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={dailyGrowth}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <Bar dataKey="leads" fill="#cbd5e1" radius={[8, 8, 0, 0]} barSize={40} />
                          <Line type="monotone" dataKey="sales" stroke={MANOS_RED} strokeWidth={4} dot={{ r: 6, fill: MANOS_RED }} />
                       </ComposedChart>
                     </ResponsiveContainer>
                   </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                   <h3 className="text-xs font-black text-slate-800 mb-8 uppercase">Origem Status Funil</h3>
                   <div className="h-72">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={leads.reduce((acc, l) => {
                           const s = l.status;
                           const existing = acc.find(x => x.name === s);
                           if (existing) existing.value++;
                           else acc.push({ name: s, value: 1 });
                           return acc;
                         }, [] as any[])} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                           {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                         </Pie>
                         <Tooltip />
                         <Legend />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'master-analysis' && userRole === 'master' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-700">
              {/* Cabeçalho de Elite */}
              <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150"><Zap size={150} /></div>
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                  <div>
                    <h3 className="text-3xl font-black mb-4 flex items-center gap-4">
                      <ShieldCheck className="text-red-500" size={32} /> Central Estratégica Alexandre
                    </h3>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg mb-8">
                      Painel de controle de alta performance focado em otimização de conversão e qualidade de leads do Facebook Ads.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700">
                        <p className="text-[9px] text-slate-500 font-black tracking-widest uppercase">Investimento Estimado</p>
                        <p className="text-lg font-black text-white">R$ 3.800,00</p>
                      </div>
                      <div className="px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700">
                        <p className="text-[9px] text-slate-500 font-black tracking-widest uppercase">VGV Potencial (Lead x 85k)</p>
                        <p className="text-lg font-black text-red-500">R$ {leads.length * 85000 / 1000000} Mi</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-8 rounded-[32px] border border-slate-700 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="font-black text-xs uppercase flex items-center gap-2"><Sparkles className="text-yellow-400" /> Consultoria Estratégica IA</h4>
                       <button onClick={analyzeGlobalStrategy} disabled={isAnalyzing} className="p-2 bg-white text-slate-900 rounded-xl hover:scale-110 transition-transform">
                         <RotateCcw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                       </button>
                    </div>
                    <div className="h-40 overflow-y-auto">
                       {globalStrategy ? (
                         <p className="text-sm text-slate-300 font-medium leading-relaxed italic whitespace-pre-wrap">"{globalStrategy}"</p>
                       ) : (
                         <div className="flex flex-col items-center justify-center h-full text-center">
                            <Briefcase size={32} className="text-slate-600 mb-2" />
                            <p className="text-xs text-slate-500 font-bold">Clique no ícone de girar para gerar análise global da Manos.</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance de Campanhas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                   <h4 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-2 uppercase"><MousePointer2 size={16} /> Eficiência de Campanha (Volume vs Conversão)</h4>
                   <div className="space-y-6">
                      {performanceData.map((c, i) => (
                        <div key={i} className="group p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-red-200 transition-all">
                           <div className="flex items-center justify-between mb-4">
                              <p className="font-black text-slate-800">{c.campaign}</p>
                              <p className="text-xs font-black text-red-600">{c.conversion}% Conv.</p>
                           </div>
                           <div className="flex items-end gap-1 mb-2">
                             <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                               <div className="h-full bg-red-600 rounded-full" style={{ width: `${(c.leads / 420) * 100}%` }}></div>
                             </div>
                             <p className="text-[10px] font-black text-slate-400 w-12 text-right">{c.leads} L</p>
                           </div>
                           <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                             <span>Custo/Lead: R$ {c.cpl}</span>
                             <span>Investimento: R$ {(c.leads * c.cpl).toFixed(0)}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                   <h4 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-2 uppercase"><Award size={16} /> Performance de Atendimento Master</h4>
                   <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leads.reduce((acc, l) => {
                          if (!l.vendedor) return acc;
                          const existing = acc.find(x => x.name === l.vendedor);
                          if (existing) {
                            existing.leads++;
                            if (l.status === 'Vendido') existing.sales++;
                          } else {
                            acc.push({ name: l.vendedor, leads: 1, sales: l.status === 'Vendido' ? 1 : 0 });
                          }
                          return acc;
                        }, [] as any[]).map(v => ({ ...v, conversion: v.leads > 0 ? (v.sales / v.leads * 100).toFixed(1) : 0 }))}>
                           <XAxis dataKey="name" axisLine={false} tickLine={false} />
                           <YAxis axisLine={false} tickLine={false} />
                           <Tooltip />
                           <Bar dataKey="leads" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                           <Bar dataKey="sales" fill={MANOS_RED} radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="mt-8 p-6 bg-red-50 rounded-3xl border border-red-100">
                     <p className="text-xs text-red-900 font-bold flex items-center gap-2">
                       <TrendingUp size={16} /> Insight: Vendedores com taxa acima de 5% merecem premiação Manos Gold este mês.
                     </p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
               <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" placeholder="Nome do lead ou veículo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-red-600 font-medium" />
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                     <select className="flex-1 md:flex-none bg-slate-50 border-none rounded-2xl px-6 py-3 font-bold text-xs uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-600">
                        <option>Vendedor: Todos</option>
                        {Array.from(new Set(leads.map(l => l.vendedor).filter(Boolean))).map(v => <option key={v}>{v}</option>)}
                     </select>
                     <select className="flex-1 md:flex-none bg-slate-50 border-none rounded-2xl px-6 py-3 font-bold text-xs uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-600">
                        <option>Status: Todos</option>
                        {STATUS_OPTIONS.map(s => <option key={s}>{STATUS_FRIENDLY[s]}</option>)}
                     </select>
                  </div>
               </div>

               <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50"><tr className="border-b border-slate-50"><th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead / Interesse</th><th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</th><th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendente</th><th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => { setSelectedLeadId(lead.id); setViewMode('detail'); }}>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800 group-hover:text-red-600 transition-colors">{lead.nome}</span>
                              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1"><Car size={12} /> {lead.carro_interesse || 'Geral'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6"><Badge status={lead.status} /></td>
                          <td className="px-8 py-6"><span className="text-xs font-bold text-slate-600 flex items-center gap-2"><div className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center uppercase">{lead.vendedor?.[0] || '?'}</div> {lead.vendedor || 'Fila de Espera'}</span></td>
                          <td className="px-8 py-6 text-right"><ChevronRight size={18} className="inline-block text-slate-200 group-hover:text-red-600 transition-colors" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLeads.length === 0 && (
                    <div className="p-20 text-center"><AlertCircle className="mx-auto text-slate-200 mb-4" size={48} /><p className="font-bold text-slate-400">Nenhum lead encontrado para esta busca.</p></div>
                  )}
               </div>
            </div>
          )}

          {viewMode === 'detail' && (
             <div className="max-w-4xl mx-auto bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-black text-sm transition-all"><ArrowLeft size={20} /> Fechar Detalhes</button>
                  <div className="flex gap-3">
                    <button onClick={analyzeGlobalStrategy} disabled={isAnalyzing} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2"><Zap size={16} /> Consultoria IA</button>
                    <button style={{ backgroundColor: MANOS_RED }} className="px-6 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-100">Atualizar</button>
                  </div>
                </div>
                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-8">
                      <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Lead Master</h4>
                         <p className="text-2xl font-black text-slate-900 mb-2">{leads.find(l => l.id === selectedLeadId)?.nome}</p>
                         <p className="text-sm font-bold text-slate-500 flex items-center gap-2 mb-4"><Car size={18} className="text-red-600" /> {leads.find(l => l.id === selectedLeadId)?.carro_interesse || 'Não informado'}</p>
                         <div className="pt-4 border-t border-slate-200">
                            <Badge status={leads.find(l => l.id === selectedLeadId)?.status} />
                         </div>
                      </div>
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo Conversão</h4>
                         <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-[24px]">
                           {leads.find(l => l.id === selectedLeadId)?.observacoes || 'Nenhum registro de conversa salvo para este lead ainda.'}
                         </p>
                      </div>
                   </div>
                   <div className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-center relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-8 opacity-10"><Award size={80} /></div>
                      <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles size={16} /> Inteligência Manos</h4>
                      <p className="text-sm text-slate-300 font-medium leading-loose italic">
                        {globalStrategy || "Solicite a consultoria Master para este lead específico para ver a melhor abordagem de fechamento."}
                      </p>
                      <div className="mt-8 pt-8 border-t border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Sugestão Técnica</p>
                        <p className="text-xs font-bold text-white">Focar em entrada facilitada no cartão de crédito.</p>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
