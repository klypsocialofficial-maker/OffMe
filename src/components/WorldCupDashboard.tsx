import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, TrendingUp, Newspaper, Clock, ChevronDown, ChevronUp, 
  Share2, Send, Sparkles, Award, Check, RotateCcw, Info, Bell, BellRing, Square,
  Pencil, X, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { awardPoints } from '../services/gamificationService';

interface MatchEvent {
  minute: number;
  type: 'goal' | 'card_yellow' | 'card_red' | 'commentary' | 'substitution';
  text: string;
  team?: 'home' | 'away';
}

interface Match {
  id: string;
  group: string;
  homeTeam: string;
  homeFlag: string;
  awayTeam: string;
  awayFlag: string;
  homeScore: number;
  awayScore: number;
  status: 'LIVE' | 'FT' | 'UPCOMING';
  minute: number;
  time: string;
  date: string;
  events: MatchEvent[];
}

interface Prediction {
  homeScore: number;
  awayScore: number;
  submitted: boolean;
}

interface WorldCupDashboardProps {
  userProfile: any;
  showToast: (message: string, type: 'info' | 'success' | 'error') => void;
}

export default function WorldCupDashboard({ userProfile, showToast }: WorldCupDashboardProps) {
  const [subTab, setSubTab] = useState<'jogos' | 'tabela' | 'noticias'>('jogos');
  const [matchFilter, setMatchFilter] = useState<'todos' | 'ao_vivo' | 'encerrados' | 'proximos'>('todos');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  
  // Real-time matches state
  const [matches, setMatches] = useState<Match[]>([]);
  // User predictions: { [matchId]: Prediction }
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  // Match notification list: ids of matches the user is tracking
  const [trackedMatches, setTrackedMatches] = useState<string[]>([]);
  // For predictions input
  const [predInput, setPredInput] = useState<Record<string, { home: string; away: string }>>({});
  const prevMatchesRef = useRef<Match[]>([]);
  const [loadingRealTime, setLoadingRealTime] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Inline match editing state variables
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, { homeScore: number; awayScore: number; status: 'LIVE' | 'FT' | 'UPCOMING'; minute: number }>>({});

  // Start editing a match score inline
  const startEditingMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setEditFields(prev => ({
      ...prev,
      [match.id]: {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        minute: match.minute
      }
    }));
  };

  // Change individual field when editing
  const handleEditChange = (matchId: string, updates: Partial<{ homeScore: number; awayScore: number; status: 'LIVE' | 'FT' | 'UPCOMING'; minute: number }>) => {
    setEditFields(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { homeScore: 0, awayScore: 0, status: 'LIVE', minute: 0 }),
        ...updates
      }
    }));
  };

  // Save the edited match score
  const saveEditedMatch = (matchId: string) => {
    const fields = editFields[matchId];
    if (!fields) return;

    setMatches(prevMatches => {
      const nextMatches = prevMatches.map(m => {
        if (m.id !== matchId) return m;

        const events = [...m.events];
        if (fields.status === 'FT' && m.status !== 'FT') {
          events.unshift({
            minute: fields.minute,
            type: 'commentary',
            text: `🏁 Placar corrigido manualmente. Fim de jogo em Copa do Mundo!`
          });
        }

        return {
          ...m,
          homeScore: fields.homeScore,
          awayScore: fields.awayScore,
          status: fields.status,
          minute: fields.minute,
          events
        };
      });
      return nextMatches;
    });

    setEditingMatchId(null);
    showToast('Placar da partida atualizado com sucesso!', 'success');
  };

  // -------------------------------------------------------------
  // REAL-TIME FETCH LOGIC
  // Connects directly to our backend search-grounded Gemini endpoint
  // -------------------------------------------------------------
  const fetchRealTimeMatches = async (isManual = false) => {
    try {
      setLoadingRealTime(true);
      const res = await fetch('/api/world-cup-matches');
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      if (data.matches && Array.isArray(data.matches)) {
        setMatches(data.matches);
        localStorage.setItem('world_cup_dashboard_matches', JSON.stringify(data.matches));
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setLastRefreshed(timeStr);
        if (isManual) {
          showToast(`Placares e estatísticas da Copa 2026 atualizados! 🏆`, 'success');
        }
      } else {
        throw new Error('Formato inválido de resposta.');
      }
    } catch (e: any) {
      console.error('Erro ao buscar dados reais:', e);
      if (isManual) {
        showToast('Erro ao sincronizar dados em tempo real. Tente novamente.', 'error');
      }
    } finally {
      setLoadingRealTime(false);
    }
  };

  const resetSimulator = () => {
    fetchRealTimeMatches(true);
  };

  // -------------------------------------------------------------
  // INITIAL SEEDING & SYNC
  // We restore locally cached matches first so layout loads instantly,
  // then we fetch the ultra-accurate live scores in the background.
  // -------------------------------------------------------------
  useEffect(() => {
    const savedMatches = localStorage.getItem('world_cup_dashboard_matches');
    const savedPredictions = localStorage.getItem('world_cup_dashboard_predictions');
    const savedTracked = localStorage.getItem('world_cup_dashboard_tracked');

    if (savedPredictions) {
      setPredictions(JSON.parse(savedPredictions));
    }

    if (savedTracked) {
      setTrackedMatches(JSON.parse(savedTracked));
    }

    if (savedMatches) {
      setMatches(JSON.parse(savedMatches));
      // Background sync
      fetchRealTimeMatches(false);
    } else {
      // Direct fetch
      fetchRealTimeMatches(false);
    }
  }, []);

  // -------------------------------------------------------------
  // SAVE PERSISTENCE ON CHANGE
  // -------------------------------------------------------------
  useEffect(() => {
    if (matches.length > 0) {
      localStorage.setItem('world_cup_dashboard_matches', JSON.stringify(matches));
    }
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('world_cup_dashboard_predictions', JSON.stringify(predictions));
  }, [predictions]);

  useEffect(() => {
    localStorage.setItem('world_cup_dashboard_tracked', JSON.stringify(trackedMatches));
  }, [trackedMatches]);

  // -------------------------------------------------------------
  // MONITOR SCORE CHANGES & RESOLVE PREDICTIONS (Side-effects)
  // This runs after matching phase changes are committed, preventing
  // bad state update during rendering.
  // -------------------------------------------------------------
  useEffect(() => {
    const prevMatches = prevMatchesRef.current;
    if (prevMatches && prevMatches.length > 0) {
      matches.forEach(match => {
        const prevMatch = prevMatches.find(m => m.id === match.id);
        if (prevMatch) {
          // 1. Goal checks (home or away)
          if (match.homeScore > prevMatch.homeScore || match.awayScore > prevMatch.awayScore) {
            if (trackedMatches.includes(match.id)) {
              const isHomeScorer = match.homeScore > prevMatch.homeScore;
              const scoringTeam = isHomeScorer ? match.homeTeam : match.awayTeam;
              const scoringFlag = isHomeScorer ? match.homeFlag : match.awayFlag;
              showToast(`⚽ GOL! ${scoringFlag} ${scoringTeam} marca! Placar agora: ${match.homeScore} x ${match.awayScore}`, 'success');
            }
          }
          // 2. Full Time check (Live -> FT)
          if (match.status === 'FT' && prevMatch.status === 'LIVE') {
            if (trackedMatches.includes(match.id)) {
              showToast(`🏁 Fim de Jogo: ${match.homeFlag} ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam} ${match.awayFlag}!`, 'info');
            }
            // Check prediction
            const pred = predictions[match.id];
            if (pred && pred.submitted) {
              const matchedExact = pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;
              if (matchedExact) {
                if (userProfile?.uid) {
                  awardPoints(userProfile.uid, 50, 'wc_exact_prediction');
                }
                showToast(`🎯 Você ACERTOU o placar de ${match.homeTeam} x ${match.awayTeam}! +50 pontos para você!`, 'success');
              } else if ((pred.homeScore > pred.awayScore && match.homeScore > match.awayScore) ||
                         (pred.homeScore < pred.awayScore && match.homeScore < match.awayScore) ||
                         (pred.homeScore === pred.awayScore && match.homeScore === match.awayScore)) {
                if (userProfile?.uid) {
                  awardPoints(userProfile.uid, 20, 'wc_winner_prediction');
                }
                showToast(`🎉 Você acertou o vencedor/empate de ${match.homeTeam} x ${match.awayTeam}! +20 pontos!`, 'success');
              } else {
                showToast(`😔 Infelizmente você errou o placar de ${match.homeTeam} x ${match.awayTeam}. Continue tentando!`, 'info');
              }
            }
          }
        }
      });
    }
    prevMatchesRef.current = matches;
  }, [matches, trackedMatches, predictions, userProfile, showToast]);

  // -------------------------------------------------------------
  // REAL-TIME AUTO SYNC TICKER
  // Background-polls our Gemini Search-grounded API every 2 minutes with jitter for 100% real live events
  // -------------------------------------------------------------
  useEffect(() => {
    // Add jitter to avoid multiple clients hitting the API at the exact same second
    const jitter = Math.floor(Math.random() * 30000);
    const interval = setInterval(() => {
      fetchRealTimeMatches(false);
    }, 120000 + jitter); // 2 minutes + jitter
    return () => clearInterval(interval);
  }, []);

  // -------------------------------------------------------------
  // TOGGLE MATCH NOTIFICATION
  // -------------------------------------------------------------
  const toggleTrackMatch = (matchId: string) => {
    const isTracking = trackedMatches.includes(matchId);
    if (isTracking) {
      setTrackedMatches(prev => prev.filter(id => id !== matchId));
      showToast('Você cancelou o recebimento de notificações para este jogo.', 'info');
    } else {
      setTrackedMatches(prev => [...prev, matchId]);
      showToast('🔔 Notificações ativadas! Avisaremos você de todos os gols e gols ao vivo deste jogo.', 'success');
    }
  };

  // -------------------------------------------------------------
  // SUBMIT PREDICTION
  // -------------------------------------------------------------
  const handlePredictionSubmit = async (matchId: string) => {
    if (!userProfile?.uid) {
      showToast('Por favor, faça login para palpitar e acumular pontos!', 'error');
      return;
    }

    const homeVal = predInput[matchId]?.home;
    const awayVal = predInput[matchId]?.away;

    if (homeVal === undefined || awayVal === undefined || homeVal === '' || awayVal === '') {
      showToast('Digite um placar válido!', 'error');
      return;
    }

    const hScore = parseInt(homeVal);
    const aScore = parseInt(awayVal);

    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0) {
      showToast('Digite números válidos superiores ou iguais a 0!', 'error');
      return;
    }

    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        homeScore: hScore,
        awayScore: aScore,
        submitted: true
      }
    }));

    // Award points for participating in prediction
    await awardPoints(userProfile.uid, 15, 'wc_palpite_participate');
    showToast(`🎯 Palpite de ${hScore} x ${aScore} enviado com sucesso! Você ganhou +15 pontos!`, 'success');
  };

  // -------------------------------------------------------------
  // SHARE MATCH TO FEED
  // -------------------------------------------------------------
  const shareMatchToFeed = (match: Match) => {
    let text = ``;
    if (match.status === 'LIVE') {
      text = `🇧🇷 Copa do Mundo #Copa26\n⚽ AO VIVO (${match.minute}'): ${match.homeFlag} ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam} ${match.awayFlag}\n\nAcompanhando o jogo em tempo real na aba Explorar! Quem ganha esse jogão? O que estão achando? 🏟️🔥`;
    } else if (match.status === 'FT') {
      text = `🇧🇷 Copa do Mundo #Copa26\n🏁 FINAL: ${match.homeFlag} ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam} ${match.awayFlag}\n\nQue grande clássico! Confira todos os lances atualizados no app. 🏆🌟 #futebol`;
    } else {
      text = `🇧🇷 Copa do Mundo #Copa26\n📅 PRÓXIMO JOGO: ${match.homeFlag} ${match.homeTeam} vs ${match.awayTeam} ${match.awayFlag}\n⏰ Horário: ${match.time} (${match.date})\n\nDeixei meu palpite na aba de Esportes. Qual o placar de vocês para esse duelo de gigantes? 🔮⚽`;
    }

    // Dispatch custom event to trigger creation modal
    const shareEvent = new CustomEvent('open-create-modal', {
      detail: {
        prefilledContent: text,
        worldCupMatch: match
      }
    });
    window.dispatchEvent(shareEvent);
    showToast('Compartilhador do post aberto! Escreva algo e publique.', 'info');
  };

  const handleShareGroupStandings = (group: any) => {
    let text = `📊 Classificação atualizada - ${group.name} #Copa26\n\n`;
    group.teams.forEach((t: any, i: number) => {
      text += `${i + 1}º ${t.name} - ${t.p}pts\n`;
    });
    text += `\nAcompanhe a tabela completa e simule resultados na nossa aba de Esportes! 🏆🇧🇷`;

    const shareEvent = new CustomEvent('open-create-modal', {
      detail: {
        prefilledContent: text,
        worldCupGroup: group
      }
    });
    window.dispatchEvent(shareEvent);
    showToast('Tabela pronta para compartilhar!', 'info');
  };

  // -------------------------------------------------------------
  // FILTERED LIST
  // -------------------------------------------------------------
  const filteredMatches = matches.filter(match => {
    if (matchFilter === 'ao_vivo') return match.status === 'LIVE';
    if (matchFilter === 'encerrados') return match.status === 'FT';
    if (matchFilter === 'proximos') return match.status === 'UPCOMING';
    return true;
  });

  // Groups and Standing tables
  const GROUPS_DATA = [
    {
      name: 'Grupo A',
      teams: [
        { name: 'México 🇲🇽', p: 4, j: 2, v: 1, e: 1, d: 0, gp: 5, gc: 3 },
        { name: 'EUA 🇺🇸', p: 4, j: 2, v: 1, e: 1, d: 0, gp: 3, gc: 2 },
        { name: 'Canadá 🇨🇦', p: 2, j: 2, v: 0, e: 2, d: 0, gp: 3, gc: 3 },
        { name: 'Suécia 🇸🇪', p: 0, j: 2, v: 0, e: 0, d: 2, gp: 2, gc: 5 }
      ]
    },
    {
      name: 'Grupo B',
      teams: [
        { name: 'Brasil 🇧🇷', p: 4, j: 2, v: 1, e: 1, d: 0, gp: 5, gc: 2 },
        { name: 'Marrocos 🇲🇦', p: 4, j: 2, v: 1, e: 1, d: 0, gp: 3, gc: 2 },
        { name: 'Croácia 🇭🇷', p: 3, j: 2, v: 1, e: 0, d: 1, gp: 2, gc: 3 },
        { name: 'Coreia do Sul 🇰🇷', p: 0, j: 2, v: 0, e: 0, d: 2, gp: 1, gc: 4 }
      ]
    },
    {
      name: 'Grupo C',
      teams: [
        { name: 'Arábia Saudita 🇸🇦', p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 },
        { name: 'Argentina 🇦🇷', p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 },
        { name: 'Austrália 🇦🇺', p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 },
        { name: 'Turquia 🇹🇷', p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }
      ]
    },
    {
      name: 'Grupo D',
      teams: [
        { name: 'França 🇫🇷', p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 },
        { name: 'Senegal 🇸🇳', p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 },
        { name: 'Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿', p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 },
        { name: 'Japão 🇯🇵', p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }
      ]
    }
  ];

  // News items
  const SPORTS_NEWS = [
    {
      id: 'news-1',
      title: '🚨 Neymar Jr. atinge recorde histórico e exalta união da Seleção',
      body: 'O craque comemorou o gol decisivo marcado contra o Marrocos e ressaltou que a entrega física de todos os jogadores é o principal pilar para a busca do sexto título da Copa do Mundo. "Não há jogo fácil em Mundial", pontuou.',
      time: 'Há 5 minutos',
      readers: '14.2k em leitura',
      image: '🇧🇷'
    },
    {
      id: 'news-2',
      title: '🇺🇸 Pulisic brilha com assistência de McKennie e festeja vitória emblemática',
      body: 'Os estadunidenses bateram a forte seleção da Suécia de virada por 2 a 1 em Boston e assumiram provisoriamente a co-liderança do Grupo A. O clima no vestiário é de plena confiança para assegurar a classificação.',
      time: 'Há 22 minutos',
      readers: '9.8k lendo',
      image: '🇺🇸'
    },
    {
      id: 'news-3',
      title: '📈 Simulações de IA apontam favoritismo absoluto do Brasil após as exibições físicas',
      body: 'Algoritmos esportivos avançados calcularam que o Brasil aumentou suas chances de ser campeão em 5.4% após as fortes apresentações na primeira rodada e o entrosamento do setor ofensivo comandado por Vinicius Jr.',
      time: 'Há 1 hora',
      readers: '22.3k lendo',
      image: '📊'
    },
    {
      id: 'news-4',
      title: '🇸🇦 Arábia Saudita planeja escalação ofensiva surpresa para enfrentar Argentina hoje',
      body: 'Buscando repetir o milagre da estreia de 2022, a comissão técnica saudita fechou o treino desta manhã e ensaiou variações com três atacantes para pressionar as laterais portenhas. Messi treinou normalmente e deve iniciar.',
      time: 'Há 3 horas',
      readers: '30.1k lendo',
      image: '🇸🇦'
    }
  ];

  const handleShareNews = (title: string) => {
    const text = `📰 Notícias da Copa #Copa26\n\n"${title}"\n\nConfira todos os lances de futebol, dados real-time e tabelas atualizadas na nossa aba Esportes! 🏆⚽`;
    const shareEvent = new CustomEvent('open-create-modal', {
      detail: {
        prefilledContent: text
      }
    });
    window.dispatchEvent(shareEvent);
    showToast('Compartilhador do post aberto! Escreva algo e publique.', 'info');
  };

  return (
    <div className="w-full bg-transparent p-0 lg:p-4">
      {/* Hero Header - Chic Redesign */}
      <div className="relative overflow-hidden bg-slate-950 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl mb-8 border border-white/5">
        {/* Background Mesh Gradient */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/30 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[100px]" />
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[80px]" />
        </div>
        
        {/* Abstract Trophy Ornament */}
        <div className="absolute right-[-5%] bottom-[-5%] opacity-5 mix-blend-overlay rotate-12 pointer-events-none select-none">
          <Trophy className="w-96 h-96" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-emerald-400"
            >
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>FIFA World Cup 2026 • Exclusive</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9] mb-4">
              MUNDIAL<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-blue-400">DE SELEÇÕES</span>
            </h1>
            
            <p className="text-white/60 text-base font-medium max-w-sm leading-relaxed">
              A elegância do futebol mundial em tempo real. Acompanhe a jornada pelo Hexa com dados exclusivos.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center self-start md:self-auto shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mb-2">Seus Pontos</span>
            <span className="text-4xl font-black text-amber-400 tracking-tighter flex items-center space-x-2">
              <span>{userProfile?.points || 0}</span>
              <Award className="w-6 h-6" />
            </span>
            <div className="mt-3 px-3 py-1 bg-amber-500/10 rounded-full">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Top 1% dos Palpiteiros</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Chic Navigation Tabs */}
      <div className="flex px-2 mb-8 overflow-x-auto no-scrollbar gap-2">
        {[
          { id: 'jogos', label: 'Partidas', emoji: '⚽' },
          { id: 'tabela', label: 'Tabelas', emoji: '📊' },
          { id: 'noticias', label: 'Notícias', emoji: '📰' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all relative flex items-center space-x-2 whitespace-nowrap ${
              subTab === tab.id 
                ? 'bg-white dark:bg-white text-black shadow-lg shadow-black/5' 
                : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            {subTab === tab.id && (
              <motion.div layoutId="subtab-active" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-black dark:bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* TABS CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.15 }}
        >
          
          {/* 1. JOGOS TAB */}
          {subTab === 'jogos' && (
            <div className="space-y-8">
              {/* Filter & Control Row - Chic Style */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex items-center space-x-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'ao_vivo', label: 'Ao Vivo' },
                    { id: 'proximos', label: 'Próximos' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setMatchFilter(f.id as any)}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        matchFilter === f.id 
                          ? 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm' 
                          : 'text-gray-500 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-4">
                  {lastRefreshed && (
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Live Sync {lastRefreshed}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => fetchRealTimeMatches(true)}
                    disabled={loadingRealTime}
                    className="group relative px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 overflow-hidden shadow-xl"
                  >
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <div className="relative z-10 flex items-center space-x-2">
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRealTime ? 'animate-spin' : ''}`} />
                      <span>{loadingRealTime ? 'Sincronizando' : 'Sincronizar'}</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Match Cards List - Stadium Chic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                {filteredMatches.map((match) => {
                  const isExpanded = expandedMatchId === match.id;
                  const isTracking = trackedMatches.includes(match.id);
                  const pred = predictions[match.id];
                  
                  return (
                    <motion.div 
                      layout
                      key={match.id}
                      className="group bg-white dark:bg-slate-950 rounded-[2.5rem] border border-black/[0.03] dark:border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 relative flex flex-col overflow-hidden"
                    >
                      {/* Premium Accent */}
                      <div className={`absolute top-0 left-0 w-1 bottom-0 ${match.status === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-black/5'}`} />

                      {/* Card Content */}
                      <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{match.group}</span>
                          {match.status === 'LIVE' ? (
                            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>LIVE • {match.minute}'</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{match.status === 'FT' ? 'Finalizado' : match.time}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          {/* Home */}
                          <div className="flex flex-col items-center text-center flex-1 min-w-0">
                            <motion.div 
                              whileHover={{ scale: 1.1, rotate: -5 }}
                              className="w-16 h-16 rounded-[1.25rem] bg-slate-50 dark:bg-slate-900 border border-black/5 dark:border-white/5 flex items-center justify-center text-4xl mb-4 shadow-sm"
                            >
                              {match.homeFlag}
                            </motion.div>
                            <span className="font-black text-sm lg:text-base tracking-tight truncate w-full">{match.homeTeam}</span>
                          </div>

                          {/* Center Score */}
                          <div className="flex flex-col items-center px-4">
                            <div className="flex items-center space-x-4">
                              <span className="text-4xl lg:text-5xl font-black tracking-tighter tabular-nums">
                                {match.status === 'UPCOMING' ? '-' : match.homeScore}
                              </span>
                              <span className="text-gray-300 font-light text-2xl">:</span>
                              <span className="text-4xl lg:text-5xl font-black tracking-tighter tabular-nums">
                                {match.status === 'UPCOMING' ? '-' : match.awayScore}
                              </span>
                            </div>
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mt-3">{match.date}</span>
                          </div>

                          {/* Away */}
                          <div className="flex flex-col items-center text-center flex-1 min-w-0">
                            <motion.div 
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="w-16 h-16 rounded-[1.25rem] bg-slate-50 dark:bg-slate-900 border border-black/5 dark:border-white/5 flex items-center justify-center text-4xl mb-4 shadow-sm"
                            >
                              {match.awayFlag}
                            </motion.div>
                            <span className="font-black text-sm lg:text-base tracking-tight truncate w-full">{match.awayTeam}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-8 py-5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.03] dark:border-white/[0.03] flex items-center justify-between">
                        <button 
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        >
                          Detalhes
                        </button>
                        
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => shareMatchToFeed(match)}
                            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white transition-all group/btn flex items-center space-x-2"
                            title="Compartilhar Placar"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Compartilhar</span>
                          </button>

                          {match.status === 'LIVE' && (
                            <button 
                              onClick={() => toggleTrackMatch(match.id)}
                              className={`p-2 rounded-xl transition-all ${isTracking ? 'bg-rose-500 text-white' : 'text-gray-400 hover:bg-black/5'}`}
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => startEditingMatch(match)}
                            className="p-2 rounded-xl text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-black text-[9px] uppercase tracking-widest px-4"
                          >
                            Edit
                          </button>
                        </div>
                      </div>

                      {/* Prediction Tag Overlay */}
                      {pred && pred.submitted && (
                        <div className="absolute top-4 left-4">
                          <div className="bg-amber-400 text-black px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-xl transform rotate-[-5deg]">
                            Seu Palpite: {pred.homeScore}x{pred.awayScore}
                          </div>
                        </div>
                      )}

                      {/* COLLAPSIBLE ACCORDION DETAIL PANEL */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-black/[0.03] dark:border-white/[0.03] overflow-hidden"
                          >
                            {/* IF UPCOMING: Render Prediction Panel - Chic Redesign */}
                            {match.status === 'UPCOMING' ? (
                              <div className="p-10 bg-slate-50/50 dark:bg-slate-900/10">
                                <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                                  <div className="w-12 h-12 bg-amber-400/10 rounded-2xl flex items-center justify-center mb-6">
                                    <Sparkles className="w-6 h-6 text-amber-500" />
                                  </div>
                                  <h4 className="font-black text-lg tracking-tight mb-2">Seu Palpite de Especialista</h4>
                                  <p className="text-gray-500 text-xs leading-relaxed mb-8">
                                    Acerte o vencedor para <span className="text-black dark:text-white font-bold">20 pts</span> ou o placar exato para <span className="text-amber-500 font-bold">50 pts</span>.
                                  </p>
                                  
                                  {pred && pred.submitted ? (
                                    <div className="w-full p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-center space-x-3 text-emerald-600 font-black text-xs uppercase tracking-widest">
                                      <Check className="w-4 h-4" />
                                      <span>Palpite Registrado</span>
                                    </div>
                                  ) : (
                                    <div className="w-full space-y-4">
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 flex flex-col items-center">
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{match.homeTeam.substring(0, 3)}</span>
                                          <input 
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={predInput[match.id]?.home || ''}
                                            onChange={(e) => setPredInput(prev => ({
                                              ...prev,
                                              [match.id]: { ...(prev[match.id] || { away: '' }), home: e.target.value }
                                            }))}
                                            className="w-full h-16 text-center text-3xl font-black bg-white dark:bg-slate-900 rounded-[1.25rem] border border-black/5 dark:border-white/5 focus:border-black dark:focus:border-white transition-all outline-none"
                                          />
                                        </div>
                                        <span className="text-gray-200 font-light text-2xl mt-6">:</span>
                                        <div className="flex-1 flex flex-col items-center">
                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{match.awayTeam.substring(0, 3)}</span>
                                          <input 
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={predInput[match.id]?.away || ''}
                                            onChange={(e) => setPredInput(prev => ({
                                              ...prev,
                                              [match.id]: { ...(prev[match.id] || { home: '' }), away: e.target.value }
                                            }))}
                                            className="w-full h-16 text-center text-3xl font-black bg-white dark:bg-slate-900 rounded-[1.25rem] border border-black/5 dark:border-white/5 focus:border-black dark:focus:border-white transition-all outline-none"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handlePredictionSubmit(match.id)}
                                        className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                      >
                                        Selar Destino
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              // IF LIVE / FT: Render Match events - Chic Timeline
                              <div className="p-10 space-y-8 max-h-[400px] overflow-y-auto no-scrollbar bg-slate-50/30 dark:bg-slate-900/5">
                                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
                                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400">Linha do Tempo</h4>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase text-emerald-600">Sync Ativo</span>
                                  </div>
                                </div>
                                
                                {match.events && match.events.length > 0 ? (
                                  <div className="space-y-6">
                                    {match.events.map((event, index) => (
                                      <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        key={index} 
                                        className="flex items-start gap-6"
                                      >
                                        <div className="flex flex-col items-center">
                                          <span className="text-[11px] font-black text-black dark:text-white tabular-nums w-8">{event.minute}'</span>
                                          <div className="w-px h-full bg-black/5 dark:bg-white/5 min-h-[20px] mt-2" />
                                        </div>
                                        <div className="flex-1 pt-0.5">
                                          <div className="flex items-center space-x-3 mb-1">
                                            <span className="text-lg">
                                              {event.type === 'goal' ? '⚽' : event.type === 'card_yellow' ? '🟨' : event.type === 'card_red' ? '🟥' : '🔄'}
                                            </span>
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${event.type === 'goal' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                              {event.type.replace('_', ' ')}
                                            </span>
                                          </div>
                                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {event.text}
                                          </p>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-12 flex flex-col items-center">
                                    <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                      <RefreshCw className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Aguardando Eventos...</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {filteredMatches.length === 0 && (
                  <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-3xl border border-black/5 text-center flex flex-col items-center justify-center">
                    <Trophy className="w-12 h-12 text-gray-300 mb-3" />
                    <h4 className="font-black text-slate-800 dark:text-slate-200">Sem partidas</h4>
                    <p className="text-gray-500 text-xs mt-1">Nenhum jogo se enquadra nessa categoria no momento do campeonato.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. TABELA TAB - Chic Redesign */}
          {subTab === 'tabela' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 px-2">
              {GROUPS_DATA.map((group) => (
                <div 
                  key={group.name}
                  className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-black/[0.03] dark:border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
                >
                  <div className="px-8 py-6 border-b border-black/[0.03] dark:border-white/[0.03] bg-black/[0.01] flex items-center justify-between">
                    <span className="font-black text-sm tracking-tight">{group.name}</span>
                    <button 
                      onClick={() => handleShareGroupStandings(group)}
                      className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:hover:text-white transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-4">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                          <th className="px-4 py-2">Seleção</th>
                          <th className="px-2 py-2 text-center">P</th>
                          <th className="px-2 py-2 text-center">SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.teams.map((team, idx) => (
                          <tr key={team.name} className="group/row">
                            <td className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-black/[0.02] dark:border-white/[0.02] rounded-l-2xl">
                              <div className="flex items-center space-x-3 text-[11px] font-black tracking-tight">
                                <span className={`${idx < 2 ? 'text-emerald-500' : 'text-gray-300'}`}>0{idx + 1}</span>
                                <span className="truncate">{team.name}</span>
                              </div>
                            </td>
                            <td className="px-2 py-3 bg-slate-50 dark:bg-slate-900 border-y border-black/[0.02] dark:border-white/[0.02] text-center font-black text-xs tabular-nums">{team.p}</td>
                            <td className="px-2 py-3 bg-slate-50 dark:bg-slate-900 border border-black/[0.02] dark:border-white/[0.02] rounded-r-2xl text-center font-black text-xs text-gray-400 tabular-nums">{team.gp - (team.gc || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. NOTICIAS TAB - Editorial Chic */}
          {subTab === 'noticias' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
              {SPORTS_NEWS.map((news) => (
                <div 
                  key={news.id}
                  className="group bg-white dark:bg-slate-950 rounded-[2.5rem] p-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 border border-black/[0.03] dark:border-white/[0.05]"
                >
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-full text-[9px] font-black uppercase tracking-widest">
                        Flash News
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{news.time}</span>
                    </div>

                    <h3 className="text-xl font-black leading-[1.1] tracking-tighter mb-4 group-hover:text-amber-500 transition-colors">
                      {news.title}
                    </h3>
                    
                    <p className="text-gray-500 text-sm leading-relaxed mb-8 line-clamp-3">
                      {news.body}
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-black/[0.03] dark:border-white/[0.05]">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] text-white font-black">
                          {news.image}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{news.readers} Lendo</span>
                      </div>
                      
                      <button
                        onClick={() => handleShareNews(news.title)}
                        className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
