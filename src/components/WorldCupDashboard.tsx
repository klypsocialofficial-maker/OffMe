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
          showToast(`Placares e estatísticas atualizados em tempo real via Google! 🏆`, 'success');
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
  // Background-polls our Gemini Search-grounded API every 45s for 100% real live events
  // -------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealTimeMatches(false);
    }, 45000);
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
    // Note: We can expand this since we'll upgrade Layout.tsx to prefill it!
    const shareEvent = new CustomEvent('open-create-modal', {
      detail: {
        prefilledContent: text
      }
    });
    window.dispatchEvent(shareEvent);
    showToast('Compartilhador do post aberto! Escreva algo e publique.', 'info');
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
    <div className="w-full bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl p-1 md:p-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-tr from-[#1e3c72] to-[#2a5298] text-white rounded-3xl p-6 shadow-xl mb-6">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10 scale-125 select-none pointer-events-none">
          <Trophy className="w-64 h-64" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Copa do Mundo 2026 • Real-Time</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">MUNDIAL DE SELEÇÕES</h1>
            <p className="text-white/80 text-sm mt-1 font-medium max-w-md">
              Acompanhe palpites, estatísticas e lances em tempo real dos maiores craques do futebol mundial na estrada pelo Hexa.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center self-start md:self-auto shadow-inner">
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">Palpites Certos</span>
            <span className="text-2xl font-black text-amber-300 score-digit animate-bounce">+{userProfile?.points || 0} pts</span>
            <span className="text-[10.5px] font-bold text-white/80 max-w-[120px] mt-1">Palpite certeiro vale 50 pontos!</span>
          </div>
        </div>
      </div>

      {/* Main Stats Navigation */}
      <div className="flex border-b border-black/5 dark:border-white/5 mb-6 overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={() => setSubTab('jogos')}
          className={`px-6 py-3 font-black text-sm uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
            subTab === 'jogos' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
          }`}
        >
          ⚽ Partidas
        </button>
        <button 
          onClick={() => setSubTab('tabela')}
          className={`px-6 py-3 font-black text-sm uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
            subTab === 'tabela' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
          }`}
        >
          📊 Grupos & Tabelas
        </button>
        <button 
          onClick={() => setSubTab('noticias')}
          className={`px-6 py-3 font-black text-sm uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
            subTab === 'noticias' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'
          }`}
        >
          📰 Plantão Copa
        </button>
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
            <div className="space-y-6">
              {/* Filter & Control Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
                  <button
                    onClick={() => setMatchFilter('todos')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${
                      matchFilter === 'todos' 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white dark:bg-slate-900 text-gray-500 border-black/5 dark:border-white/5 hover:bg-gray-100'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setMatchFilter('ao_vivo')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border flex items-center space-x-1.5 shrink-0 ${
                      matchFilter === 'ao_vivo' 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                        : 'bg-white dark:bg-slate-900 text-rose-500 border-black/5 dark:border-white/5 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Ao Vivo</span>
                  </button>
                  <button
                    onClick={() => setMatchFilter('encerrados')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${
                      matchFilter === 'encerrados' 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white dark:bg-slate-900 text-gray-500 border-black/5 dark:border-white/5 hover:bg-gray-100'
                    }`}
                  >
                    Encerrados
                  </button>
                  <button
                    onClick={() => setMatchFilter('proximos')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border shrink-0 ${
                      matchFilter === 'proximos' 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white dark:bg-slate-900 text-gray-500 border-black/5 dark:border-white/5 hover:bg-gray-100'
                    }`}
                  >
                    Próximos
                  </button>
                </div>

                {/* Real-time sync Action */}
                <div className="flex items-center space-x-3 shrink-0 self-start sm:self-auto">
                  {lastRefreshed && (
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1.5 rounded-xl border border-emerald-500/15 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      <span>Atualizado {lastRefreshed}</span>
                    </span>
                  )}
                  <button
                    onClick={() => fetchRealTimeMatches(true)}
                    disabled={loadingRealTime}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 disabled:opacity-50 disabled:cursor-not-allowed text-slate-850 dark:text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border border-black/5 dark:border-white/10 shadow-sm active:scale-95 museum-btn"
                    title="Obter dados reais via Google Search"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${loadingRealTime ? 'animate-spin' : ''}`} />
                    <span>{loadingRealTime ? 'Sincronizando...' : 'Atualizar Tempo Real'}</span>
                  </button>
                </div>
              </div>

              {/* Match Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((match) => {
                  const isExpanded = expandedMatchId === match.id;
                  const isTracking = trackedMatches.includes(match.id);
                  const pred = predictions[match.id];
                  
                  return (
                    <div 
                      key={match.id}
                      className="group bg-white dark:bg-slate-900 rounded-[2rem] border border-black/5 dark:border-white/15 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col hover:-translate-y-1"
                    >
                      {/* Animated Glow Border for LIVE Matches */}
                      {match.status === 'LIVE' && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-500 animate-pulse z-10" />
                      )}

                      {/* Top Header info (Group and Status Badge) */}
                      <div className="px-6 py-4.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between text-xs bg-slate-50/40 dark:bg-slate-950/25 relative z-10">
                        <span className="font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-[10px] flex items-center space-x-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>{match.group}</span>
                        </span>
                        
                        {match.status === 'LIVE' ? (
                          <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-widest text-[10px] shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>AO VIVO • {match.minute}'</span>
                          </div>
                        ) : match.status === 'FT' ? (
                          <span className="bg-gray-100/80 text-gray-500 dark:bg-slate-800 dark:text-slate-400 px-3 py-1 rounded-full font-black uppercase tracking-widest text-[10px] shadow-sm">
                            Fim de Jogo
                          </span>
                        ) : (
                          <span className="bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-3 py-1 rounded-full font-black uppercase tracking-widest text-[10px] shadow-sm font-sans">
                            {match.time} • {match.date}
                          </span>
                        )}
                      </div>

                      {/* Stadium-style Scoreboard Wrapper / OR EDIT FORM */}
                      {editingMatchId === match.id ? (
                        <div className="p-6 flex flex-col space-y-4 relative z-10 flex-1 bg-blue-500/5 dark:bg-slate-950/45 border-y border-blue-500/10">
                          <div className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center space-x-1.5 justify-center sm:justify-start">
                            <Pencil className="w-3.5 h-3.5 animate-pulse" />
                            <span>Corrigir Placar da Partida</span>
                          </div>

                          <div className="grid grid-cols-3 gap-3 items-center">
                            {/* Home Team Score Field */}
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 truncate w-full text-center max-w-[85px] mb-1">
                                {match.homeTeam}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={editFields[match.id]?.homeScore ?? 0}
                                onChange={(e) => handleEditChange(match.id, { homeScore: Math.max(0, parseInt(e.target.value) || 0) })}
                                className="w-16 py-2.5 text-center text-2xl font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl border border-black/10 dark:border-white/10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                              />
                            </div>

                            {/* Divider x */}
                            <div className="text-center font-black text-gray-400 select-none text-base">X</div>

                            {/* Away Team Score Field */}
                            <div className="flex flex-col items-center">
                              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 truncate w-full text-center max-w-[85px] mb-1">
                                {match.awayTeam}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={editFields[match.id]?.awayScore ?? 0}
                                onChange={(e) => handleEditChange(match.id, { awayScore: Math.max(0, parseInt(e.target.value) || 0) })}
                                className="w-16 py-2.5 text-center text-2xl font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl border border-black/10 dark:border-white/10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Status Selector */}
                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Status</label>
                              <select
                                value={editFields[match.id]?.status ?? 'LIVE'}
                                onChange={(e) => handleEditChange(match.id, { status: e.target.value as any })}
                                className="py-2.5 px-3 text-xs bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 rounded-xl border border-black/10 dark:border-white/10 outline-none font-extrabold cursor-pointer hover:border-slate-300 dark:hover:border-slate-650 transition-all"
                              >
                                <option value="LIVE">AO VIVO</option>
                                <option value="FT">ENCERRADO</option>
                                <option value="UPCOMING">PRÓXIMO</option>
                              </select>
                            </div>

                            {/* Minute Input (only if status is LIVE) */}
                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Minuto</label>
                              <input
                                type="number"
                                min={0}
                                max={90}
                                disabled={editFields[match.id]?.status !== 'LIVE'}
                                value={editFields[match.id]?.minute ?? 0}
                                onChange={(e) => handleEditChange(match.id, { minute: Math.max(0, Math.min(90, parseInt(e.target.value) || 0)) })}
                                className="py-2.1 px-3 text-xs text-center bg-white dark:bg-slate-850 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl border border-black/10 dark:border-white/10 outline-none font-extrabold shadow-sm"
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => saveEditedMatch(match.id)}
                              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Salvar Correção</span>
                            </button>
                            <button
                              onClick={() => setEditingMatchId(null)}
                              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 flex items-center justify-between gap-4 relative z-10 flex-1 bg-gradient-to-b from-transparent to-slate-50/10 dark:to-slate-950/5">
                          
                          {/* HOME TEAM */}
                          <div className="flex flex-col items-center text-center flex-1 min-w-0 group/team">
                            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 shadow-md border border-black/5 dark:border-white/10 flex items-center justify-center text-4xl mb-3 relative group-hover/team:scale-110 transition-transform duration-300 select-none">
                              <span className="filter drop-shadow-md mb-0.5" role="img" aria-label={match.homeTeam}>{match.homeFlag}</span>
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white dark:bg-white dark:text-black text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest scale-90 shadow">
                                {match.homeTeam.substring(0, 3).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate w-full tracking-tight">
                              {match.homeTeam}
                            </span>
                          </div>

                          {/* DISPLAY SCORE & CLOCK */}
                          <div className="flex flex-col items-center justify-center px-2 shrink-0">
                            {match.status !== 'UPCOMING' ? (
                              <div className="flex items-center space-x-3.5 bg-slate-100/50 dark:bg-slate-800/50 px-4 py-2.5 rounded-2xl border border-black/5 dark:border-white/10">
                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter score-digit select-none">
                                  {match.homeScore}
                                </span>
                                <span className="text-gray-400 dark:text-gray-600 font-extrabold text-lg animate-pulse">:</span>
                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter score-digit select-none">
                                  {match.awayScore}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center space-y-1">
                                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                  VS
                                </span>
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                  {match.time}
                                </span>
                              </div>
                            )}
                            <span className="text-[9px] text-gray-400 dark:text-slate-500 font-black mt-2 uppercase tracking-widest">
                              {match.date}
                            </span>
                          </div>

                          {/* AWAY TEAM */}
                          <div className="flex flex-col items-center text-center flex-1 min-w-0 group/team">
                            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 shadow-md border border-black/5 dark:border-white/10 flex items-center justify-center text-4xl mb-3 relative group-hover/team:scale-110 transition-transform duration-300 select-none">
                              <span className="filter drop-shadow-md mb-0.5" role="img" aria-label={match.awayTeam}>{match.awayFlag}</span>
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white dark:bg-white dark:text-black text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest scale-90 shadow">
                                {match.awayTeam.substring(0, 3).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate w-full tracking-tight">
                              {match.awayTeam}
                            </span>
                          </div>

                        </div>
                      )}

                      {/* Display prediction status if any */}
                      {pred && pred.submitted && (
                        <div className="mx-6 mb-5 p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/10 flex items-center justify-between text-xs relative overflow-hidden">
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500" />
                          <div className="flex items-center space-x-2 pl-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="font-bold text-amber-800 dark:text-amber-400">Seu palpite:</span>
                          </div>
                          <span className="font-black text-amber-900 dark:text-amber-300 text-sm bg-white dark:bg-slate-850 px-3 py-1 rounded-xl shadow-sm border border-amber-500/10">
                            {pred.homeScore} x {pred.awayScore}
                          </span>
                        </div>
                      )}

                      {/* Interactive Footer Controls */}
                      <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 bg-slate-50/40 dark:bg-slate-950/20 text-xs">
                        {/* Expand Details Accordion */}
                        <button
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                          className="flex items-center space-x-1.5 font-bold text-gray-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors py-1 px-1.5 -ml-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>Lances</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <div className="flex items-center space-x-2">
                          {/* Inline score editor toggle key (Pencil Button) */}
                          <button
                            onClick={() => startEditingMatch(match)}
                            className={`p-2 rounded-xl border transition-all active:scale-95 ${
                              editingMatchId === match.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                                : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-black/5 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-slate-755'
                            }`}
                            title="Corrigir placar manualmente"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Track Notifications */}
                          {match.status === 'LIVE' && (
                            <button
                              onClick={() => toggleTrackMatch(match.id)}
                              className={`p-2 rounded-xl border transition-all active:scale-95 ${
                                isTracking 
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20' 
                                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-black/5 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-slate-750'
                              }`}
                              title={isTracking ? 'Deselecione avisos' : 'Ative avisos de gols'}
                            >
                              {isTracking ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Share Score Button */}
                          <button
                            onClick={() => shareMatchToFeed(match)}
                            className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-750 active:scale-95 transition-all shadow-sm"
                            title="Compartilhar no Feed"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* COLLAPSIBLE ACCORDION DETAIL PANEL */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-black/5 dark:border-white/5 overflow-hidden"
                          >
                            {/* IF UPCOMING: Render Prediction Panel */}
                            {match.status === 'UPCOMING' ? (
                              <div className="p-6 bg-gradient-to-tr from-blue-50/40 via-transparent to-purple-50/40 dark:from-slate-900/40 dark:to-slate-900/20">
                                <h4 className="font-black text-sm text-slate-850 dark:text-slate-100 flex items-center space-x-1.5 mb-2">
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                  <span>Enviar Meu Palpite</span>
                                </h4>
                                <p className="text-gray-500 text-[11px] mb-4 leading-relaxed">
                                  Palpites encerram na hora do kickoff. Acertar o vencedor dita <span className="font-extrabold text-slate-700 dark:text-slate-300">20 pts</span> e cravar o placar ganha <span className="font-extrabold text-amber-500">50 pts de bônus!</span>
                                </p>
                                
                                {pred && pred.submitted ? (
                                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-2.5 text-emerald-800 dark:text-emerald-400 text-xs">
                                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span className="font-bold">Seu palpite está registrado! Torça pelo resultado final em tempo real.</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                    <div className="flex items-center space-x-2 bg-slate-100/60 dark:bg-slate-950 p-2.5 rounded-2xl border border-black/5 dark:border-white/10 shadow-inner justify-center">
                                      <span className="text-xs font-black w-10 text-center text-slate-500">{match.homeTeam.substring(0, 3).toUpperCase()}</span>
                                      <input 
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={predInput[match.id]?.home || ''}
                                        onChange={(e) => setPredInput(prev => ({
                                          ...prev,
                                          [match.id]: { ...(prev[match.id] || { away: '' }), home: e.target.value }
                                        }))}
                                        className="w-14 text-center font-black outline-none bg-white dark:bg-slate-900 rounded-xl py-1.5 border border-black/5 dark:border-white/10 focus:border-blue-500 text-sm transition-colors"
                                      />
                                      <span className="text-gray-400 font-bold">x</span>
                                      <input 
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={predInput[match.id]?.away || ''}
                                        onChange={(e) => setPredInput(prev => ({
                                          ...prev,
                                          [match.id]: { ...(prev[match.id] || { home: '' }), away: e.target.value }
                                        }))}
                                        className="w-14 text-center font-black outline-none bg-white dark:bg-slate-900 rounded-xl py-1.5 border border-black/5 dark:border-white/10 focus:border-blue-500 text-sm transition-colors"
                                      />
                                      <span className="text-xs font-black w-10 text-center text-slate-500">{match.awayTeam.substring(0, 3).toUpperCase()}</span>
                                    </div>
                                    <button
                                      onClick={() => handlePredictionSubmit(match.id)}
                                      className="py-3 px-5 bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 rounded-[1.25rem] font-black text-xs transition-all active:scale-95 shadow-md flex items-center justify-center space-x-1.5 flex-1"
                                    >
                                      <span>Enviar Palpite</span>
                                      <Send className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // IF LIVE / FT: Render Match events and Commentary Feed
                              <div className="p-6 space-y-4 max-h-72 overflow-y-auto no-scrollbar scroll-smooth bg-slate-50/50 dark:bg-slate-950/15">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-gray-400 flex items-center space-x-1.5 mb-1 select-none">
                                  <span>Cronologia de Lances e Eventos</span>
                                </h4>
                                
                                {match.events && match.events.length > 0 ? (
                                  <div className="relative pl-4 border-l border-gray-200 dark:border-slate-800 space-y-4 py-2">
                                    {match.events.map((event, index) => {
                                      let dotBg = 'bg-gray-400';
                                      let borderCol = 'border-transparent';
                                      let iconNode = '⏱️';
                                      
                                      if (event.type === 'goal') {
                                        dotBg = 'bg-emerald-500 scale-125';
                                        borderCol = 'border-emerald-200';
                                        iconNode = '⚽';
                                      } else if (event.type === 'card_yellow') {
                                        dotBg = 'bg-amber-400';
                                        iconNode = '🟨';
                                      } else if (event.type === 'card_red') {
                                        dotBg = 'bg-rose-500';
                                        iconNode = '🟥';
                                      } else if (event.type === 'substitution') {
                                        dotBg = 'bg-blue-400';
                                        iconNode = '🔄';
                                      }

                                      return (
                                        <div key={index} className="relative text-xs leading-relaxed group">
                                          {/* Time marker indicator */}
                                          <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${dotBg} border-2 border-white dark:border-slate-900 transition-transform group-hover:scale-125`} />
                                          
                                          <div className="flex items-start gap-2.5">
                                            <span className="font-extrabold text-blue-500 dark:text-blue-400 min-w-[28px] text-[10px] bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-center shrink-0">
                                              {event.minute}'
                                            </span>
                                            <div className="font-medium text-slate-700 dark:text-slate-300 flex-1 flex items-center space-x-1.5">
                                              <span className="shrink-0">{iconNode}</span>
                                              <span>{event.text}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-xs text-gray-500">
                                    Nada notável aconteceu nesta partida ainda.
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
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

          {/* 2. TABELA TAB */}
          {subTab === 'tabela' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {GROUPS_DATA.map((group) => (
                  <div 
                    key={group.name}
                    className="bg-white dark:bg-slate-900/60 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                      <span className="font-black text-sm text-slate-950 dark:text-slate-50 uppercase tracking-wider">{group.name}</span>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Classifica Top 2</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-black/5 dark:border-white/5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="px-5 py-3">Seleção</th>
                            <th className="px-4 py-3 text-center">P</th>
                            <th className="px-2 py-3 text-center">J</th>
                            <th className="px-2 py-3 text-center">V</th>
                            <th className="px-2 py-3 text-center col-span-1 hidden sm:table-cell">E</th>
                            <th className="px-2 py-3 text-center col-span-1 hidden sm:table-cell">D</th>
                            <th className="px-3 py-3 text-center">GP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.teams.map((team, idx) => {
                            const isPromoted = idx < 2; // top 2 crossing
                            return (
                              <tr 
                                key={team.name}
                                className={`border-b last:border-b-0 border-black/5 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors ${
                                  isPromoted ? 'bg-emerald-500/[0.015]' : ''
                                }`}
                              >
                                <td className="px-5 py-3 flex items-center space-x-3 font-bold text-slate-800 dark:text-slate-100">
                                  <span className={`w-1.5 h-6 rounded-full shrink-0 ${isPromoted ? 'bg-emerald-500' : 'bg-transparent'}`} />
                                  <span className="truncate">{team.name}</span>
                                </td>
                                <td className="px-4 py-3 text-center font-black text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-850/10 text-sm">{team.p}</td>
                                <td className="px-2 py-3 text-center text-gray-500">{team.j}</td>
                                <td className="px-2 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{team.v}</td>
                                <td className="px-2 py-3 text-center text-gray-500 col-span-1 hidden sm:table-cell">{team.e}</td>
                                <td className="px-2 py-3 text-center text-gray-500 col-span-1 hidden sm:table-cell">{team.d}</td>
                                <td className="px-3 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{team.gp}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. NOTICIAS TAB */}
          {subTab === 'noticias' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SPORTS_NEWS.map((news) => (
                <div 
                  key={news.id}
                  className="bg-white dark:bg-slate-900/60 rounded-3xl p-5 border border-black/5 dark:border-white/10 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-black/10 hover:-translate-y-0.5 group"
                >
                  <div>
                    {/* Header line news indicator */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">
                      <span className="flex items-center space-x-1.5">
                        <span className="text-lg leading-none">{news.image}</span>
                        <span>Copa 2026</span>
                      </span>
                      <span>{news.time}</span>
                    </div>

                    <h3 className="font-black text-slate-900 dark:text-white text-sm leading-snug tracking-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {news.title}
                    </h3>
                    
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">
                      {news.body}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-400 font-bold bg-slate-150 dark:bg-slate-800 px-2 py-0.5 rounded-md">{news.readers}</span>
                    <button
                      onClick={() => handleShareNews(news.title)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 rounded-xl font-bold flex items-center space-x-1 active:scale-95 transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartilhar</span>
                    </button>
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
