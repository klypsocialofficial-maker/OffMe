import { withRetry } from "./lib/gemini";

const fallbackMatches = [
  {
    id: 'wc-1',
    group: 'Group A',
    homeTeam: 'México',
    homeFlag: '🇲🇽',
    awayTeam: 'África do Sul',
    awayFlag: '🇿🇦',
    homeScore: 2,
    awayScore: 1,
    status: 'FT',
    minute: 90,
    time: '17:00',
    date: '11 de Junho',
    events: [
      { minute: 90, type: 'commentary', text: '🏁 Fim de jogo! México estreia com vitória espetacular no Estádio Azteca!' },
      { minute: 78, type: 'goal', text: '⚽ GOL DO MÉXICO! Santiago Giménez cabeceia firme no canto!', team: 'home' },
      { minute: 48, type: 'goal', text: '⚽ GOL DE ÁFRICA DO SUL! Percy Tau empata aproveitando contra-ataque!', team: 'away' },
      { minute: 23, type: 'goal', text: '⚽ GOL DO MÉXICO! Lozano abre o placar com chute cruzado sensacional!', team: 'home' }
    ]
  },
  {
    id: 'wc-2',
    group: 'Group B',
    homeTeam: 'EUA',
    homeFlag: '🇺🇸',
    awayTeam: 'Bolívia',
    awayFlag: '🇧🇴',
    homeScore: 3,
    awayScore: 0,
    status: 'FT',
    minute: 90,
    time: '20:00',
    date: '11 de Junho',
    events: [
      { minute: 90, type: 'commentary', text: '🏁 Apito final! Domínio absoluto dos Estados Unidos no SoFi Stadium.' },
      { minute: 82, type: 'goal', text: '⚽ GOL DOS EUA! Balogun chuta rasteiro e fecha a goleada de 3x0!', team: 'home' },
      { minute: 55, type: 'goal', text: '⚽ GOL DOS EUA! Timothy Weah amplia com categoria após bela jogada.', team: 'home' },
      { minute: 12, type: 'goal', text: '⚽ GOL DOS EUA! Christian Pulisic acerta uma falta cirúrgica na gaveta!', team: 'home' }
    ]
  },
  {
    id: 'wc-3',
    group: 'Group B',
    homeTeam: 'Canadá',
    homeFlag: '🇨🇦',
    awayTeam: 'Suécia',
    awayFlag: '🇸🇪',
    homeScore: 1,
    awayScore: 1,
    status: 'FT',
    minute: 90,
    time: '14:00',
    date: '12 de Junho',
    events: [
      { minute: 90, type: 'commentary', text: '🏁 Jogo eletrizante termina empatado em Toronto por 1 a 1!' },
      { minute: 81, type: 'goal', text: '⚽ GOL DO CANADÁ! Jonathan David converte pênalti sofrido por Davies!', team: 'home' },
      { minute: 34, type: 'goal', text: '⚽ GOL DA SUÉCIA! Isak marca de cabeça após escanteio milimétrico.', team: 'away' }
    ]
  },
  {
    id: 'wc-4',
    group: 'Group C',
    homeTeam: 'Uruguai',
    homeFlag: '🇺🇾',
    awayTeam: 'Japão',
    awayFlag: '🇯🇵',
    homeScore: 2,
    awayScore: 2,
    status: 'FT',
    minute: 90,
    time: '18:00',
    date: '12 de Junho',
    events: [
      { minute: 90, type: 'commentary', text: '🏁 Um empate que entra para a história! Grande exibição futebolística em Boston.' },
      { minute: 88, type: 'goal', text: '⚽ GOL DO JAPÃO! Mitoma empata com um chute colocado incrível!', team: 'away' },
      { minute: 71, type: 'goal', text: '⚽ GOL DO URUGUAI! Darwin Núñez recoloca os celestes em vantagem!', team: 'home' },
      { minute: 45, type: 'goal', text: '⚽ GOL DO URUGUAI! Fede Valverde cobra falta perfeita e empata o jogo!', team: 'home' },
      { minute: 18, type: 'goal', text: '⚽ GOL DO JAPÃO! Kubo abre o placar em jogada brilhante de velocidade!', team: 'away' }
    ]
  },
  {
    id: 'wc-5',
    group: 'Group D',
    homeTeam: 'Brasil',
    homeFlag: '🇧🇷',
    awayTeam: 'Marrocos',
    awayFlag: '🇲🇦',
    homeScore: 1,
    awayScore: 1,
    status: 'LIVE',
    minute: 74,
    time: '17:00',
    date: 'Hoje (13 de Junho)',
    events: [
      { minute: 68, type: 'commentary', text: '📢 Abafando! O Brasil pressiona muito e busca a consagração no placar.' },
      { minute: 58, type: 'goal', text: '⚽ GOL DO BRASIL! Rodrygo finaliza com extrema precisão de canhota após baita assistência de Vinicius Jr!', team: 'home' },
      { minute: 42, type: 'goal', text: '⚽ GOL DE MARROCOS! Ziyech cruza rasteiro na área e En-Nesyri chuta certeiro no canto de Éderson!', team: 'away' },
      { minute: 30, type: 'card_yellow', text: '🟨 Cartão Amarelo para Casemiro por falta dura tática no meio de campo.', team: 'home' },
      { minute: 15, type: 'commentary', text: '📢 Quase! Vinicius Jr finta o lateral direito marroquino e acerta um chute forte na trave exterior.' }
    ]
  },
  {
    id: 'wc-6',
    group: 'Group E',
    homeTeam: 'Espanha',
    homeFlag: '🇪🇸',
    awayTeam: 'Austrália',
    awayFlag: '🇦🇺',
    homeScore: 2,
    awayScore: 0,
    status: 'LIVE',
    minute: 48,
    time: '14:00',
    date: 'Hoje (13 de Junho)',
    events: [
      { minute: 45, type: 'commentary', text: '⏱️ Intervalo de jogo em Seattle! Domínio espanhol com grande circulação de passes.' },
      { minute: 41, type: 'goal', text: '⚽ GOL DA ESPANHA! Nico Williams amplia com categoria após receber grande enfiada de Pedri!', team: 'home' },
      { minute: 14, type: 'goal', text: '⚽ GOL DA ESPANHA! Dani Olmo acerta um chutaço de fora da área indefensável para o goleiro!', team: 'home' }
    ]
  },
  {
    id: 'wc-7',
    group: 'Group F',
    homeTeam: 'França',
    homeFlag: '🇫🇷',
    awayTeam: 'Arábia Saudita',
    awayFlag: '🇸🇦',
    homeScore: 0,
    awayScore: 0,
    status: 'UPCOMING',
    minute: 0,
    time: '20:00',
    date: 'Hoje (13 de Junho)',
    events: []
  },
  {
    id: 'wc-8',
    group: 'Group G',
    homeTeam: 'Argentina',
    homeFlag: '🇦🇷',
    awayTeam: 'Coreia do Sul',
    awayFlag: '🇰🇷',
    homeScore: 0,
    awayScore: 0,
    status: 'UPCOMING',
    minute: 0,
    time: '15:00',
    date: 'Amanhã (14 de Junho)',
    events: []
  },
  {
    id: 'wc-9',
    group: 'Group H',
    homeTeam: 'Alemanha',
    homeFlag: '🇩🇪',
    awayTeam: 'Camarões',
    awayFlag: '🇨🇲',
    homeScore: 0,
    awayScore: 0,
    status: 'UPCOMING',
    minute: 0,
    time: '18:00',
    date: 'Amanhã (14 de Junho)',
    events: []
  }
];

let matchCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const TEAM_MAP: Record<string, { nome: string, flag: string }> = {
  'Mexico': { nome: 'México', flag: '🇲🇽' },
  'South Africa': { nome: 'África do Sul', flag: '🇿🇦' },
  'USA': { nome: 'EUA', flag: '🇺🇸' },
  'United States': { nome: 'EUA', flag: '🇺🇸' },
  'Bolivia': { nome: 'Bolívia', flag: '🇧🇴' },
  'Canada': { nome: 'Canadá', flag: '🇨🇦' },
  'Sweden': { nome: 'Suécia', flag: '🇸🇪' },
  'Uruguay': { nome: 'Uruguai', flag: '🇺🇾' },
  'Japan': { nome: 'Japão', flag: '🇯🇵' },
  'Brazil': { nome: 'Brasil', flag: '🇧🇷' },
  'Morocco': { nome: 'Marrocos', flag: '🇲🇦' },
  'Spain': { nome: 'Espanha', flag: '🇪🇸' },
  'Australia': { nome: 'Austrália', flag: '🇦🇺' },
  'France': { nome: 'França', flag: '🇫🇷' },
  'Saudi Arabia': { nome: 'Arábia Saudita', flag: '🇸🇦' },
  'Argentina': { nome: 'Argentina', flag: '🇦🇷' },
  'South Korea': { nome: 'Coreia do Sul', flag: '🇰🇷' },
  'Germany': { nome: 'Alemanha', flag: '🇩🇪' },
  'Cameroon': { nome: 'Camarões', flag: '🇨🇲' },
  'England': { nome: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Portugal': { nome: 'Portugal', flag: '🇵🇹' },
  'Italy': { nome: 'Itália', flag: '🇮🇹' },
  'Netherlands': { nome: 'Holanda', flag: '🇳🇱' },
  'Belgium': { nome: 'Bélgica', flag: '🇧🇪' },
  'Croatia': { nome: 'Croácia', flag: '🇭🇷' },
  'Senegal': { nome: 'Senegal', flag: '🇸🇳' },
  'Ghana': { nome: 'Gana', flag: '🇬🇭' },
  'Tunisia': { nome: 'Tunísia', flag: '🇹🇳' },
  'Poland': { nome: 'Polônia', flag: '🇵🇱' },
  'Switzerland': { nome: 'Suíça', flag: '🇨🇭' },
  'Serbia': { nome: 'Sérvia', flag: '🇷🇸' },
  'Denmark': { nome: 'Dinamarca', flag: '🇩🇰' },
};

async function fetchFromSportsAPI() {
  const sources = [
    'https://worldcupjson.net/matches',
    'https://fixturedownload.com/feed/json/fifa-world-cup-2026',
    'https://raw.githubusercontent.com/lsv/fifa-worldcup-2026/master/data.json'
  ];

  for (const url of sources) {
    try {
      console.log(`[Real-time Match API] Attempting to fetch from: ${url}`);
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data.map((m: any, idx: number) => {
          const homeName = m.home_team_country || m.HomeTeam || m.home_team?.name || 'Time A';
          const awayName = m.away_team_country || m.AwayTeam || m.away_team?.name || 'Time B';
          const homeInfo = TEAM_MAP[homeName] || { nome: homeName, flag: '🏳️' };
          const awayInfo = TEAM_MAP[awayName] || { nome: awayName, flag: '🏳️' };
          
          const apiStatus = m.status || '';
          let status: 'LIVE' | 'FT' | 'UPCOMING' = 'UPCOMING';
          if (apiStatus === 'completed' || m.finished === true || m.HomeTeamScore !== undefined) {
             status = 'FT';
          } else if (apiStatus === 'in_progress' || apiStatus === 'live') {
             status = 'LIVE';
          }

          return {
            id: m.id || m.MatchNumber || `api-${idx}`,
            group: m.group || m.Group || 'Mundial',
            homeTeam: homeInfo.nome,
            homeFlag: homeInfo.flag,
            awayTeam: awayInfo.nome,
            awayFlag: awayInfo.flag,
            homeScore: m.home_team_score ?? m.HomeTeamScore ?? 0,
            awayScore: m.away_team_score ?? m.AwayTeamScore ?? 0,
            status: status,
            minute: m.time === 'full-time' ? 90 : (parseInt(m.time) || 0),
            time: m.datetime ? new Date(m.datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : (m.time || '15:00'),
            date: m.datetime ? new Date(m.datetime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : (m.date || 'Hoje'),
            events: m.events || []
          };
        });
      }
    } catch (e) {
      console.error(`[Real-time Match API] Failed to fetch from ${url}:`, e);
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (matchCache && Date.now() - matchCache.timestamp < CACHE_DURATION) {
    return res.status(200).json({ ...matchCache.data, source: 'cache' });
  }

  try {
    const matchesFromAPI = await fetchFromSportsAPI();
    
    if (matchesFromAPI && matchesFromAPI.length > 0) {
      const result = { matches: matchesFromAPI.slice(0, 15), source: 'external_sports_api' };
      matchCache = { data: result, timestamp: Date.now() };
      return res.status(200).json(result);
    }

    console.log("[Real-time Match API] All external APIs failed. Using high-quality curated fallback.");
    return res.status(200).json({ matches: fallbackMatches, source: 'curated_fallback' });

  } catch (error: any) {
    console.error("[Real-time Match API] Fatal error:", error);
    return res.status(200).json({ matches: fallbackMatches, source: 'curated_error_fallback' });
  }
}
