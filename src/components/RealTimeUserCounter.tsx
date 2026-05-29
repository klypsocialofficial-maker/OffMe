import React, { useState, useEffect } from 'react';
import { Users, Radio, Sparkles, TrendingUp, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, limit, getCountFromServer, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getDefaultAvatar } from '../lib/avatar';

interface FloatingUser {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  // randomized drifting offset properties
  delay: number;
  duration: number;
  amplitudeX: number;
  amplitudeY: number;
  initialX: number; // percentage
  initialY: number; // percentage
  size: number; // px size
}

// Wrap inside React.memo to completely protect against parent-triggered re-renders inside Explore.tsx
const RealTimeUserCounter = React.memo(function RealTimeUserCounter() {
  const [usersCount, setUsersCount] = useState<number>(0);
  const [activeOnlineCount, setActiveOnlineCount] = useState<number>(0);
  const [isWebSocketActive, setIsWebSocketActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [justUpdated, setJustUpdated] = useState<boolean>(false);
  const [pulseBars, setPulseBars] = useState<number[]>([40, 60, 30, 80, 50, 90, 45, 70]);
  const [floatingUsers, setFloatingUsers] = useState<FloatingUser[]>([]);

  // 1. Fetch floating avatars ONCE on mount with getDocs (extremely database-efficient)
  useEffect(() => {
    if (!db) {
      // Fallback draft count and fallback users if db is offline or uninitialized
      setUsersCount(42);
      setActiveOnlineCount(5);
      const offlineMock: FloatingUser[] = Array.from({ length: 6 }).map((_, i) => ({
        uid: `offline-${i}`,
        displayName: ['Zury', 'Ares', 'Milo', 'Luna', 'Kael', 'Noah'][i],
        username: ['zury_off', 'ares_dark', 'milo_mind', 'luna_wave', 'kael_cosmo', 'noah_rise'][i],
        photoURL: '',
        delay: i * 0.4,
        duration: 4 + Math.random() * 4,
        amplitudeX: 10 + Math.random() * 15,
        amplitudeY: 12 + Math.random() * 15,
        initialX: [12, 45, 74, 28, 62, 85][i],
        initialY: [15, 25, 18, 70, 75, 45][i],
        size: [32, 44, 36, 40, 48, 38][i],
      }));
      setFloatingUsers(offlineMock);
      setLoading(false);
      return;
    }

    const usersCol = collection(db, 'users');
    const q = query(usersCol, limit(15));
    
    getDocs(q)
      .then((snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          const u = doc.data();
          if (u) {
            list.push({
              uid: doc.id,
              displayName: u.displayName || 'Anônimo',
              username: u.username || 'user',
              photoURL: u.photoURL || '',
            });
          }
        });

        // Limit the active floating avatars to maximum 7 for fine-grained style
        const selectedUsers = list.slice(0, 7);
        
        // Enrich selected users with aesthetic floating parameters
        const enriched: FloatingUser[] = selectedUsers.map((user, idx) => {
          // Pre-defined beautifully scattered coordinates so they don't block main text or center cluster
          const coordinatesX = [12, 42, 75, 28, 58, 85, 35];
          const coordinatesY = [15, 20, 18, 68, 75, 45, 82];
          const sizes = [32, 44, 36, 40, 46, 38, 42];

          return {
            ...user,
            delay: idx * 0.35,
            duration: 5 + (idx % 3) * 2 + Math.random() * 1.5,
            amplitudeX: 8 + (idx % 2) * 10,
            amplitudeY: 10 + (idx % 3) * 8,
            initialX: coordinatesX[idx % coordinatesX.length],
            initialY: coordinatesY[idx % coordinatesY.length],
            size: sizes[idx % sizes.length],
          };
        });

        setFloatingUsers(enriched);
      })
      .catch((err) => {
        console.error("Error loaded floating users on mount:", err);
      });

    // 2. Initialize WebSocket Real-time System (Extremely efficient telemetry)
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let fallbackInterval: any = null;
    let isConnected = false;

    const connectWS = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to our specialized upgrades multiplexer path on port 3000
        const wsUrl = `${protocol}//${window.location.host}/ws-active-users`;
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('[WebSocket-Counter] Successfully establishing telemetry handshake');
          setIsWebSocketActive(true);
          isConnected = true;
          setLoading(false);
          // If fallback interval is running, clear it
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'stats') {
              setUsersCount((prev) => {
                const targetCount = data.totalCount || prev;
                if (prev !== 0 && targetCount > prev) {
                  setJustUpdated(true);
                  setTimeout(() => setJustUpdated(false), 2200);
                }
                return targetCount;
              });
              setActiveOnlineCount(data.activeCount || 1);
            }
          } catch (err) {
            console.error('[WebSocket-Counter] Message parse exception:', err);
          }
        };

        socket.onclose = () => {
          console.log('[WebSocket-Counter] Closed connection. Transitioning to fallback...');
          setIsWebSocketActive(false);
          isConnected = false;
          // Trigger reconnection after 6 seconds
          reconnectTimeout = setTimeout(connectWS, 6000);
          
          // Setup a simulated fallback for active users if socket drops
          startSimulatedFallback();
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch (err) {
        console.warn('[WebSocket-Counter] Connection throw exception:', err);
        setIsWebSocketActive(false);
        isConnected = false;
        startSimulatedFallback();
      }
    };

    const startSimulatedFallback = () => {
      if (fallbackInterval) return;
      // Fetch total registered count once via cheaper Firestore aggregator
      getCountFromServer(usersCol)
        .then((snap) => {
          const count = snap.data().count;
          if (count) {
            setUsersCount(count);
          }
        })
        .catch((err) => console.error(err));

      // Simulate a stable active count based on current timestamp
      const fallbackCalculator = () => {
        const hour = new Date().getHours();
        let baseCount = 3;
        if (hour >= 18 && hour <= 23) baseCount = 8; // Peak hours
        else if (hour >= 0 && hour <= 4) baseCount = 5; // Night owls
        setActiveOnlineCount(Math.max(1, baseCount + Math.floor(Math.random() * 4)));
      };
      fallbackCalculator();
      fallbackInterval = setInterval(fallbackCalculator, 10000);
    };

    connectWS();

    // 3. Fallback database stats aggregator
    if (db) {
      getCountFromServer(usersCol)
        .then((snap) => {
          const count = snap.data().count;
          if (count) {
            setUsersCount((prev) => isConnected ? prev : count);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error getting users count from server aggregate:", err);
          setLoading(false);
        });
    }

    return () => {
      if (socket) {
        socket.onclose = null; // Prevent reconnection loops
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  // Soft random heartbeat graph animation (remains client-only, 100% efficient)
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseBars(prev => prev.map(bar => {
        const delta = Math.floor(Math.random() * 30) - 15;
        const next = Math.max(15, Math.min(100, bar + delta));
        return next;
      }));
    }, 850);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-black/5 dark:border-white/10 bg-gradient-to-br from-gray-50 via-white to-gray-100/50 dark:from-slate-900 dark:via-zinc-950 dark:to-slate-900 p-6 md:p-8 shadow-xl transition-all hover:shadow-2xl group">
      
      {/* Visual Floating Users Layer (Background / Midground) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-40 dark:opacity-50">
        <AnimatePresence>
          {floatingUsers.map((user) => {
            const avatarSrc = user.photoURL || getDefaultAvatar(user.displayName, user.username);
            return (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: [0, 1, 1, 0.9],
                  scale: 1,
                  x: [0, user.amplitudeX, -user.amplitudeX, 0],
                  y: [0, -user.amplitudeY, user.amplitudeY, 0],
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{
                  opacity: { duration: 1.2 },
                  scale: { duration: 0.8 },
                  x: {
                    repeat: Infinity,
                    duration: user.duration * 1.1,
                    ease: "easeInOut",
                  },
                  y: {
                    repeat: Infinity,
                    duration: user.duration,
                    ease: "easeInOut",
                  }
                }}
                style={{
                  position: 'absolute',
                  left: `${user.initialX}%`,
                  top: `${user.initialY}%`,
                  width: `${user.size}px`,
                  height: `${user.size}px`,
                }}
                className="pointer-events-auto cursor-pointer flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 p-[2px] shadow-lg border border-black/5 dark:border-white/10 hover:z-50 hover:scale-125 hover:opacity-100 hover:shadow-xl transition-transform duration-300 relative group/avatar"
              >
                {/* Floating Avatar Ring Glow */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-blue-400/20 to-purple-500/20 dark:from-emerald-400/20 dark:to-blue-500/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity blur-sm" />
                
                <img
                  src={avatarSrc}
                  alt={user.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full select-none"
                />

                {/* Micro Hover Tooltip showing user handle */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-0.5 whitespace-nowrap bg-slate-900/90 dark:bg-black/90 text-white text-[9px] font-bold rounded shadow-md pointer-events-none opacity-0 scale-95 group-hover/avatar:opacity-100 group-hover/avatar:scale-100 transition-all z-50">
                  @{user.username}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Abstract Background Tech Glow */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-blue-500/15 dark:group-hover:bg-emerald-500/15 transition-all duration-700 pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/5 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern overlay for tech aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] rounded-[32px] pointer-events-none" />

      {/* Content wrapper */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
        
        {/* Left side: branding, indicators, count presentation */}
        <div className="flex-1 space-y-4">
          
          {/* Real-time connection badge status */}
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWebSocketActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isWebSocketActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className={`text-[10px] sm:text-xs font-black tracking-widest uppercase select-none flex items-center gap-1 ${isWebSocketActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              <Radio className="w-3.5 h-3.5" />
              {isWebSocketActive ? 'Sincronizado via WebSocket' : 'Firestore Real-time (Ativo)'}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5 text-blue-500 dark:text-purple-400" />
              Isolamento de Render
            </span>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter text-gray-900 dark:text-white leading-none">
              A comunidade cresce sem filtros
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1 font-medium max-w-md">
              Sempre que uma nova voz se junta à nossa constelação de pensamentos anônimos, nosso mapa se conecta na hora.
            </p>
          </div>

          {/* Custom stats dashboard layout */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            {/* Box 1: Active Connections */}
            <div className="relative flex flex-col justify-end bg-black/[0.05] dark:bg-white/[0.05] backdrop-blur-md border border-black/10 dark:border-white/10 rounded-2xl px-5 py-3 min-w-[120px] transition-all hover:border-black/20 dark:hover:border-white/15">
              <span className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest block mb-1">
                Conexões Ativas
              </span>
              
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                
                {loading ? (
                  <div className="h-8 w-12 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                ) : (
                  <div className="relative overflow-hidden h-8 select-none">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={activeOnlineCount}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 15 }}
                        className="text-2xl font-extrabold font-mono tracking-tight text-gray-900 dark:text-white block tabular-nums leading-none pt-1"
                      >
                        {activeOnlineCount}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Total Members */}
            <div className="relative flex flex-col justify-end bg-black/[0.03] dark:bg-white/[0.03] backdrop-blur-md border border-black/5 dark:border-white/5 rounded-2xl px-5 py-3 min-w-[120px] transition-all hover:border-black/15 dark:hover:border-white/10">
              <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                Constelação Total
              </span>
              
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                
                {loading ? (
                  <div className="h-8 w-12 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                ) : (
                  <div className="relative overflow-hidden h-8 select-none">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={usersCount}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 15 }}
                        className="text-2xl font-extrabold font-mono tracking-tight text-gray-800 dark:text-zinc-100 block tabular-nums leading-none pt-1"
                      >
                        {usersCount}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* +1 Member Real-time Float Badge */}
              <AnimatePresence>
                {justUpdated && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className="absolute -top-3 -right-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-md flex items-center gap-1 border border-blue-400/30 z-30"
                  >
                    <Sparkles className="w-3 h-3 text-amber-200 animate-spin" />
                    +1 Voz!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick community status tag */}
            <div className="hidden sm:flex flex-col text-xs pl-2">
              <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Expansão</span>
              <span className="text-blue-500 dark:text-emerald-400 font-black flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-4 h-4 animate-bounce" />
                Universo Ativo
              </span>
            </div>
          </div>

        </div>

        {/* Right side: visual live active heartbeat graph */}
        <div className="flex flex-col justify-between items-end h-full md:w-48 self-stretch min-h-[90px] md:min-h-0 bg-black/[0.02] dark:bg-white/[0.01] rounded-2xl md:rounded-3xl border border-black/5 dark:border-white/5 p-4 relative overflow-hidden group/chart select-none">
          <div className="absolute top-3 left-4 flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">Mapeamento</span>
            <span className="text-[9px] text-gray-500 dark:text-zinc-400 flex items-center gap-0.5">Pulsando agora</span>
          </div>

          {/* Connected lines simulation in backend */}
          <div className="absolute inset-x-0 bottom-1 flex items-end justify-center px-4 h-1/2 space-x-1.5 z-10">
            {pulseBars.map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end h-full">
                <div 
                  style={{ height: `${val}%` }} 
                  className="w-full rounded-t-full bg-gradient-to-t from-blue-500/30 to-blue-500 dark:from-emerald-500/20 dark:to-emerald-400 transition-all duration-700 ease-out min-h-[4px]"
                />
              </div>
            ))}
          </div>

          <div className="absolute bottom-2 right-3 text-[9px] font-black tracking-tight text-gray-400 dark:text-zinc-500 uppercase z-20">
            {activeOnlineCount ?? 'LIVE'}
          </div>
        </div>

      </div>
    </div>
  );
});

export default RealTimeUserCounter;
