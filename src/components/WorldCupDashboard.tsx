import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, TrendingUp, Newspaper, Clock, ChevronDown, ChevronUp, 
  Share2, Send, Sparkles, Award, Check, RotateCcw, Info, Bell, BellRing, Square
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

  // -------------------------------------------------------------
  // INITIAL SEEDING
  // We initialize matches and restore them from localStorage if they exist to keep state persistent
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
    } else {
      // Default matches for June 2026 World Cup Stage
      const initialMatches: Match[] = [
        {
          id: 'wc-1',
          group: 'Grupo B',
          homeTeam: 'Brasil',
          homeFlag: '🇧🇷',
          awayTeam: 'Marrocos',
          awayFlag: '🇲🇦',
          homeScore: 1,
          awayScore: 1,
          status: 'LIVE',
          minute: 68,
          time: '17:00',
          date: 'Hoje',
          events: [
            { minute: 58, type: 'goal', text: '⚽ GOL DO BRASIL! Neymar Jr. converte o pênalti com extrema frieza!', team: 'home' },
            { minute: 42, type: 'goal', text: '⚽ GOL DE MARROCOS! Ziyech cruza rasteiro e En-Nesyri chuta de primeira!', team: 'away' },
            { minute: 30, type: 'card_yellow', text: '🟨 Cartão Amarelo para Casemiro por falta tática.', team: 'home' },
            { minute: 15, type: 'commentary', text: '📢 Grande chance! Vinicius Jr passa por dois marcadores e chuta pra fora.' }
          ]
        },
        {
          id: 'wc-2',
          group: 'Grupo A',
          homeTeam: 'EUA',
          homeFlag: '🇺🇸',
          awayTeam: 'Suécia',
          awayFlag: '🇸🇪',
          homeScore: 2,
          awayScore: 1,
          status: 'LIVE',
          minute: 84,
          time: '16:30',
          date: 'Hoje',
          events: [
            { minute: 81, type: 'goal', text: '⚽ GOL DOS EUA! Pulisic cruza cabeceado de McKennie para as redes!', team: 'home' },
            { minute: 61, type: 'card_yellow', text: '🟨 Cartão Amarelo para Lindelöf após segurar Reyna no contra-ataque.', team: 'away' },
            { minute: 49, type: 'goal', text: '⚽ GOL DA SUÉCIA! Alexander Isak aproveita rebote na área e empata!', team: 'away' },
            { minute: 18, type: 'goal', text: '⚽ GOL DOS EUA! Reyna solta uma bomba sem chances para o goleiro!', team: 'home' }
          ]
        },
        {
          id: 'wc-3',
          group: 'Grupo A',
          homeTeam: 'México',
          homeFlag: '🇲🇽',
          awayTeam: 'Canadá',
          awayFlag: '🇨🇦',
          homeScore: 2,
          awayScore: 2,
          status: 'FT',
          minute: 90,
          time: '14:00',
          date: 'Hoje',
          events: [
            { minute: 90, type: 'commentary', text: '🏁 Fim de papo! Um clássico eletrizante da CONCACAF termina tudo igual.' },
            { minute: 88, type: 'goal', text: '⚽ GOL DO CANADÁ! Jonathan David empata no apagar das luzes do jogo!', team: 'away' },
            { minute: 72, type: 'goal', text: '⚽ GOL DO MÉXICO! Santiago Giménez faz um golaço por cobertura!', team: 'home' },
            { minute: 55, type: 'goal', text: '⚽ GOL DO MÉXICO! Lozano marca após grande tabelinha!', team: 'home' },
            { minute: 23, type: 'goal', text: '⚽ GOL DO CANADÁ! Alphonso Davies abre o placar em jogada espetacular!', team: 'away' }
          ]
        },
        {
          id: 'wc-4',
          group: 'Grupo C',
          homeTeam: 'Argentina',
          homeFlag: '🇦🇷',
          awayTeam: 'Arábia Saudita',
          awayFlag: '🇸🇦',
          homeScore: 0,
          awayScore: 0,
          status: 'UPCOMING',
          minute: 0,
          time: '19:30',
          date: 'Hoje',
          events: []
        },
        {
          id: 'wc-5',
          group: 'Grupo C',
          homeTeam: 'Austrália',
          homeFlag: '🇦🇺',
          awayTeam: 'Turquia',
          awayFlag: '🇹🇷',
          homeScore: 0,
          awayScore: 0,
          status: 'UPCOMING',
          minute: 0,
          time: '22:00',
          date: 'Hoje',
          events: []
        },
        {
          id: 'wc-6',
          group: 'Grupo D',
          homeTeam: 'França',
          homeFlag: '🇫🇷',
          awayTeam: 'Senegal',
          awayFlag: '🇸🇳',
          homeScore: 0,
          awayScore: 0,
          status: 'UPCOMING',
          minute: 0,
          time: '12:00',
          date: 'Amanhã',
          events: []
        },
        {
          id: 'wc-7',
          group: 'Grupo D',
          homeTeam: 'Inglaterra',
          homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
          awayTeam: 'Japão',
          awayFlag: '🇯🇵',
          homeScore: 0,
          awayScore: 0,
          status: 'UPCOMING',
          minute: 0,
          time: '15:00',
          date: 'Amanhã',
          events: []
        }
      ];
      setMatches(initialMatches);
      localStorage.setItem('world_cup_dashboard_matches', JSON.stringify(initialMatches));
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
  // REAL-TIME TICKER & MATCH PROGRESSION
  // Runs every 15 seconds to simulate minute ticking and live events!
  // -------------------------------------------------------------
  useEffect(() => {
    const runSimulationTick = () => {
      setMatches(prevMatches => {
        let updated = false;
        const nextMatches = prevMatches.map((match): Match => {
          if (match.status !== 'LIVE') return match;

          updated = true;
          const nextMinute = match.minute + 1;
          
          if (nextMinute >= 90) {
            // End the game
            const finishedEvents: MatchEvent[] = [
              { minute: 90, type: 'commentary', text: `🏁 Apito final! Fim de partida em Copa do Mundo. Resultado: ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}.` },
              ...match.events
            ];
            
            if (trackedMatches.includes(match.id)) {
              showToast(`🏁 Fim de Jogo: ${match.homeFlag} ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam} ${match.awayFlag}!`, 'info');
            }

            // Check if user has prediction and award points if they matched
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

            return {
              ...match,
              status: 'FT',
              minute: 90,
              events: finishedEvents
            };
          }

          // Random incident generation (15% chance per tick)
          const randomChance = Math.random();
          if (randomChance < 0.18) {
            const isHome = Math.random() > 0.45;
            const scoringTeam = isHome ? match.homeTeam : match.awayTeam;
            const scoringFlag = isHome ? match.homeFlag : match.awayFlag;
            const scoringSide = isHome ? 'home' : 'away';

            // Determine incident type
            const subChance = Math.random();
            if (subChance < 0.25) {
              // 1. Goal!
              const newHomeScore = isHome ? match.homeScore + 1 : match.homeScore;
              const newAwayScore = isHome ? match.awayScore : match.awayScore + 1;

              const goalPlayers = isHome 
                ? ['Neymar Jr.', 'Vinicius Jr.', 'Rodrygo', 'Richarlison', 'Reyna', 'Pulisic', 'Balogun']
                : ['Ziyech', 'En-Nesyri', 'Boufal', 'Isak', 'Kulusevski', 'Gyökeres'];
              
              const chosenPlayer = goalPlayers[Math.floor(Math.random() * goalPlayers.length)];
              const goalCommentaries = [
                `⚽ GOL! ${chosenPlayer} solta o pé de fora da área e estufa as redes!`,
                `⚽ GOL! Que categoria de ${chosenPlayer}, tocando com sutileza no canto!`,
                `⚽ GOL! Após escanteio perfeito, ${chosenPlayer} cabeceia forte para o chão!`,
                `⚽ GOL! Incrível falha da zaga e ${chosenPlayer} só empurra para o fundo do gol!`
              ];
              const text = goalCommentaries[Math.floor(Math.random() * goalCommentaries.length)];

              if (trackedMatches.includes(match.id)) {
                showToast(`⚽ GOL! ${scoringFlag} ${scoringTeam} marca! Placar agora: ${newHomeScore} x ${newAwayScore}`, 'success');
              }

              return {
                ...match,
                homeScore: newHomeScore,
                awayScore: newAwayScore,
                minute: nextMinute,
                events: [
                  { minute: nextMinute, type: 'goal', text, team: scoringSide },
                  ...match.events
                ]
              };
            } else if (subChance < 0.55) {
              // 2. Yellow Card
              const cardPlayers = isHome 
                ? ['Casemiro', 'Marquinhos', 'Militao', 'Adams', 'Robinson']
                : ['Amrabat', 'Saiss', 'Hakimi', 'Lindelöf', 'Augustinsson'];
              const cardPlayer = cardPlayers[Math.floor(Math.random() * cardPlayers.length)];
              const text = `🟨 Cartão Amarelo para ${cardPlayer} (${scoringTeam}) por interromper contra-ataque com falta.`;

              return {
                ...match,
                minute: nextMinute,
                events: [
                  { minute: nextMinute, type: 'card_yellow', text, team: scoringSide },
                  ...match.events
                ]
              };
            } else if (subChance < 0.70) {
              // 3. Substitution
              const text = `🔄 Substituição no ${scoringTeam}: sai fadigado para entrada de fôlego novo no ataque.`;
              return {
                ...match,
                minute: nextMinute,
                events: [
                  { minute: nextMinute, type: 'substitution', text, team: scoringSide },
                  ...match.events
                ]
              };
            } else {
              // 4. Highlight Commentary
              const highlights = [
                `🔥 Perigo! Chute perigoso de ${scoringTeam} carimba a trave! Que susto!`,
                `🧤 Milagre do goleiro! Defesa sensacional impedindo o gol certo de ${scoringTeam}!`,
                `📣 O juiz consulta o VAR por possível penalidade, mas manda o jogo seguir!`,
                `📈 Pressão total! ${scoringTeam} encurrala a defesa adversária e busca furar o bloqueio.`
              ];
              const text = highlights[Math.floor(Math.random() * highlights.length)];
              return {
                ...match,
                minute: nextMinute,
                events: [
                  { minute: nextMinute, type: 'commentary', text },
                  ...match.events
                ]
              };
            }
          }

          // Standard progression commentary once in a while
          if (nextMinute % 10 === 0) {
            return {
              ...match,
              minute: nextMinute,
              events: [
                { minute: nextMinute, type: 'commentary', text: `⏱️ Partida segue equilibrada. Posse de bola disputada intensamente no miolo de campo.` },
                ...match.events
              ]
            };
          }

          return {
            ...match,
            minute: nextMinute
          };
        });

        return updated ? nextMatches : prevMatches;
      });
    };

    const interval = setInterval(runSimulationTick, 15000); // tick every 15s
    return () => clearInterval(interval);
  }, [trackedMatches, predictions, userProfile]);

  // -------------------------------------------------------------
  // FORCE GOAL (Simulate / Test button)
  // -------------------------------------------------------------
  const forceLiveGoal = (matchId: string) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const isHome = Math.random() > 0.5;
      const scoringSide = isHome ? 'home' : 'away';
      const scoringTeam = isHome ? match.homeTeam : match.awayTeam;
      const scoringFlag = isHome ? match.homeFlag : match.awayFlag;
      
      const newHomeScore = isHome ? match.homeScore + 1 : match.homeScore;
      const newAwayScore = isHome ? match.awayScore : match.awayScore + 1;
      
      const comment = `⚽ GOL SENSACIONAL! ${scoringTeam} estufa as redes com um chute espetacular em simulação de teste!`;
      
      showToast(`⚽ GOL! ${scoringFlag} ${scoringTeam} marcou em teste! Placar: ${newHomeScore} x ${newAwayScore}`, 'success');

      return {
        ...match,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        events: [
          { minute: match.minute, type: 'goal', text: comment, team: scoringSide },
          ...match.events
        ]
      };
    }));
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
  // TOGGLE MATCH NOTIFICATION
  // -------------------------------------------------------------
  const toggleTrackMatch = (matchId: string) => {
    setTrackedMatches(prev => {
      const isTracking = prev.includes(matchId);
      if (isTracking) {
        showToast('Você cancelou o recebimento de notificações para este jogo.', 'info');
        return prev.filter(id => id !== matchId);
      } else {
        showToast('🔔 Notificações ativadas! Avisaremos você de todos os gols e gols ao vivo deste jogo.', 'success');
        return [...prev, matchId];
      }
    });
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
              {/* Filter Row */}
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

              {/* Match Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((match) => {
                  const isExpanded = expandedMatchId === match.id;
                  const isTracking = trackedMatches.includes(match.id);
                  const pred = predictions[match.id];
                  
                  return (
                    <div 
                      key={match.id}
                      className="bg-white dark:bg-slate-900/60 rounded-3xl border border-black/5 dark:border-white/10 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-black/10"
                    >
                      {/* Top Header info (Group and Status Badge) */}
                      <div className="px-5 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-950/20">
                        <span className="font-bold text-gray-500 uppercase tracking-widest">{match.group}</span>
                        {match.status === 'LIVE' ? (
                          <div className="flex items-center space-x-1.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest text-[10px] animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>AO VIVO {match.minute}'</span>
                          </div>
                        ) : match.status === 'FT' ? (
                          <span className="bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest text-[10px]">Encerrado</span>
                        ) : (
                          <span className="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest text-[10px]">Hoje • {match.time}</span>
                        )}
                      </div>

                      {/* Scoreboard line */}
                      <div className="p-5 flex items-center justify-between gap-2">
                        {/* Home team */}
                        <div className="flex flex-col items-center text-center flex-1 min-w-0">
                          <span className="text-4xl filter drop-shadow-sm mb-1.5" role="img" aria-label={match.homeTeam}>{match.homeFlag}</span>
                          <span className="font-black text-sm truncate text-slate-800 dark:text-slate-100 w-full">{match.homeTeam}</span>
                        </div>

                        {/* Score display */}
                        <div className="flex flex-col items-center justify-center px-4">
                          {match.status !== 'UPCOMING' ? (
                            <div className="flex items-center space-x-4">
                              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter score-digit">{match.homeScore}</span>
                              <span className="text-gray-300 dark:text-gray-700 font-black text-xl">:</span>
                              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter score-digit">{match.awayScore}</span>
                            </div>
                          ) : (
                            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-2xl text-xs font-black text-slate-500 dark:text-slate-400">
                              {match.time}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{match.date}</span>
                        </div>

                        {/* Away team */}
                        <div className="flex flex-col items-center text-center flex-1 min-w-0">
                          <span className="text-4xl filter drop-shadow-sm mb-1.5" role="img" aria-label={match.awayTeam}>{match.awayFlag}</span>
                          <span className="font-black text-sm truncate text-slate-800 dark:text-slate-100 w-full">{match.awayTeam}</span>
                        </div>
                      </div>

                      {/* Display prediction status if any */}
                      {pred && pred.submitted && (
                        <div className="mx-5 mb-4 p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="emoji-icon">🔮</span>
                            <span className="font-bold text-amber-800 dark:text-amber-400">Seu palpite:</span>
                          </div>
                          <span className="font-black text-amber-900 dark:text-amber-300 text-sm bg-white dark:bg-slate-850 px-2 py-0.5 rounded-lg shadow-sm">
                            {pred.homeScore} x {pred.awayScore}
                          </span>
                        </div>
                      )}

                      {/* Interactive Footer Controls */}
                      <div className="px-5 py-3.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 bg-slate-50/20 dark:bg-slate-950/5 text-xs">
                        {/* Expand Details Accordion */}
                        <button
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                          className="flex items-center space-x-1 font-black text-gray-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                          <span>Lances</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <div className="flex items-center space-x-2">
                          {/* Force Goal Button (For live test environment) */}
                          {match.status === 'LIVE' && (
                            <button
                              onClick={() => forceLiveGoal(match.id)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-xl font-bold flex items-center space-x-1 border border-rose-100 dark:border-rose-900/20 transition-all active:scale-95"
                              title="Gerar gol fictício para testar o tempo real"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Gol Teste</span>
                            </button>
                          )}

                          {/* Track Notifications */}
                          {match.status === 'LIVE' && (
                            <button
                              onClick={() => toggleTrackMatch(match.id)}
                              className={`p-1.5 rounded-xl border transition-all active:scale-95 ${
                                isTracking 
                                  ? 'bg-rose-500 text-white border-rose-500' 
                                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-black/5 dark:border-white/10 hover:bg-gray-100'
                              }`}
                              title={isTracking ? 'Deselecione avisos' : 'Ative avisos de gols'}
                            >
                              {isTracking ? <BellRing className="w-4 h-4 animate-swing" /> : <Bell className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Share Score Button */}
                          <button
                            onClick={() => shareMatchToFeed(match)}
                            className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-black/5 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
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
                              <div className="p-5 bg-gradient-to-tr from-blue-50/30 to-purple-50/30 dark:from-slate-900/40 dark:to-slate-900/20">
                                <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-1.5 mb-3">
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                  <span>Enviar Meu Palpite</span>
                                </h4>
                                <p className="text-gray-500 text-xs mb-4">
                                  Palpites encerram na hora de kickoff. Acertar o vencedor dá <span className="font-bold text-slate-700 dark:text-slate-300">20 pts</span> e cravar o placar dá <span className="font-bold text-amber-500">50 pts bonus!</span>
                                </p>
                                
                                {pred && pred.submitted ? (
                                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-2 text-emerald-800 dark:text-emerald-400 text-xs">
                                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span className="font-bold">Seu palpite está registrado! Torça pelo resultado final em tempo real.</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-black/5 dark:border-white/10 shadow-inner">
                                      <span className="text-xs font-black w-6 text-center">{match.homeTeam.substring(0, 3).toUpperCase()}</span>
                                      <input 
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={predInput[match.id]?.home || ''}
                                        onChange={(e) => setPredInput(prev => ({
                                          ...prev,
                                          [match.id]: { ...(prev[match.id] || { away: '' }), home: e.target.value }
                                        }))}
                                        className="w-12 text-center font-black outline-none bg-slate-50 dark:bg-slate-900 rounded-lg py-1 border border-black/5 dark:border-white/10"
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
                                        className="w-12 text-center font-black outline-none bg-slate-50 dark:bg-slate-900 rounded-lg py-1 border border-black/5 dark:border-white/10"
                                      />
                                      <span className="text-xs font-black w-6 text-center">{match.awayTeam.substring(0, 3).toUpperCase()}</span>
                                    </div>
                                    <button
                                      onClick={() => handlePredictionSubmit(match.id)}
                                      className="flex-1 py-3 bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-md flex items-center justify-center space-x-1"
                                    >
                                      <span>Enviar</span>
                                      <Send className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // IF LIVE / FT: Render Match events and Commentary Feed
                              <div className="p-5 space-y-4 max-h-72 overflow-y-auto no-scrollbar scroll-smooth bg-slate-50/50 dark:bg-slate-900/20">
                                <h4 className="font-black text-[11px] uppercase tracking-wider text-gray-400 flex items-center space-x-1.5 mb-1">
                                  <span>Cronologia de Lances e Eventos</span>
                                </h4>
                                
                                {match.events && match.events.length > 0 ? (
                                  <div className="relative pl-4 border-l border-gray-200 dark:border-slate-800 space-y-4 py-2">
                                    {match.events.map((event, index) => {
                                      let dotBg = 'bg-gray-400';
                                      let borderCol = 'border-transparent';
                                      
                                      if (event.type === 'goal') {
                                        dotBg = 'bg-emerald-500 scale-125';
                                        borderCol = 'border-emerald-200';
                                      } else if (event.type === 'card_yellow') {
                                        dotBg = 'bg-amber-400';
                                      } else if (event.type === 'card_red') {
                                        dotBg = 'bg-rose-500';
                                      } else if (event.type === 'substitution') {
                                        dotBg = 'bg-blue-400';
                                      }

                                      return (
                                        <div key={index} className="relative text-xs leading-relaxed group">
                                          {/* Time marker indicator */}
                                          <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${dotBg} border-2 border-white dark:border-slate-900 transition-transform group-hover:scale-125`} />
                                          
                                          <div className="flex items-start gap-2">
                                            <span className="font-black text-slate-400 min-w-[24px]">{event.minute}'</span>
                                            <p className="font-medium text-slate-700 dark:text-slate-300 flex-1">{event.text}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-xs text-gray-500">
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
