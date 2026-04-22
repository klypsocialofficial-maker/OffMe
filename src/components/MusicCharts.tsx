import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Disc, TrendingUp, TrendingDown, Minus, Music } from 'lucide-react';

const HOT_100_SONGS = [
  { rank: 1, title: "TEXAS HOLD 'EM", artist: "Beyoncé", trend: 'up', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4e/7f/05/4e7f0529-684a-ee82-9386-35fe6be58348/196589088497.jpg/300x300bb.jpg" },
  { rank: 2, title: "Beautiful Things", artist: "Benson Boone", trend: 'up', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/ee/af/df/eeafdfee-7dc8-8dd5-eaca-db47ce56bd33/054391307611.jpg/300x300bb.jpg" },
  { rank: 3, title: "Lose Control", artist: "Teddy Swims", trend: 'down', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/bf/d7/81/bfd781b0-c0ab-13a8-fa8e-90f7a55225af/054391456203.jpg/300x300bb.jpg" },
  { rank: 4, title: "Carnival", artist: "¥$, Kanye West, Ty Dolla $ign", trend: 'up', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/fc/c4/fd/fcc4fd3a-ebfc-1fcd-0738-f938d9fc12d1/198002951756.png/300x300bb.jpg" },
  { rank: 5, title: "Lovin On Me", artist: "Jack Harlow", trend: 'down', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/d5/d3/18/d5d318e8-76ad-e2f9-af00-a5fc00ce4da2/075679694246.jpg/300x300bb.jpg" },
  { rank: 6, title: "I Remember Everything (feat. Kacey Musgraves)", artist: "Zach Bryan", trend: 'same', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/0d/da/51/0dda51f9-d8ab-6a4a-f32a-dd9b70b4f8d5/093624855219.jpg/300x300bb.jpg" },
  { rank: 7, title: "Cruel Summer", artist: "Taylor Swift", trend: 'same', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/13/2e/38/132e38c9-dedf-3580-c116-f3cc61730cfb/19mcU00k0D.jpg/300x300bb.jpg" },
  { rank: 8, title: "Greedy", artist: "Tate McRae", trend: 'down', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/91/97/35/919735d4-e696-2580-0442-990e79ec8db4/886444855529.jpg/300x300bb.jpg" },
  { rank: 9, title: "Snooze", artist: "SZA", trend: 'same', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/fa/1c/71/fa1c7188-7577-bb89-72c0-aab0bb1b4731/196589578653.jpg/300x300bb.jpg" },
  { rank: 10, title: "Paint The Town Red", artist: "Doja Cat", trend: 'down', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/c3/b2/e3/c3b2e3e5-9c9c-54a7-b088-7e1ff6bd1cfd/886444634285.jpg/300x300bb.jpg" },
];

const HOT_200_ALBUMS = [
  { rank: 1, title: "VULTURES 1", artist: "¥$, Kanye West, Ty Dolla $ign", trend: 'up', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/fc/c4/fd/fcc4fd3a-ebfc-1fcd-0738-f938d9fc12d1/198002951756.png/300x300bb.jpg" },
  { rank: 2, title: "One Thing At A Time", artist: "Morgan Wallen", trend: 'same', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/6e/0f/ba/6e0fba2c-35cd-26b2-03e9-aab28b26edb5/23UMGIM10183.rgb.jpg/300x300bb.jpg" },
  { rank: 3, title: "Stick Season", artist: "Noah Kahan", trend: 'down', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/24/bc/99/24bc9901-ab47-0eab-cd82-359ad5ae0da3/1440612_UMG_cvr.jpg/300x300bb.jpg" },
  { rank: 4, title: "SOS", artist: "SZA", trend: 'up', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/fa/1c/71/fa1c7188-7577-bb89-72c0-aab0bb1b4731/196589578653.jpg/300x300bb.jpg" },
  { rank: 5, title: "1989 (Taylor's Version)", artist: "Taylor Swift", trend: 'down', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/0b/48/46/0b48466e-2b5d-00eb-144f-f1bbd0676eed/23UMGIM86066.rgb.jpg/300x300bb.jpg" },
  { rank: 6, title: "For All The Dogs", artist: "Drake", trend: 'same', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e5/74/4d/e5744d03-e61b-cc16-1681-ba2e0fc504bb/23UMGIM92534.rgb.jpg/300x300bb.jpg" },
  { rank: 7, title: "Zach Bryan", artist: "Zach Bryan", trend: 'up', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/0d/da/51/0dda51f9-d8ab-6a4a-f32a-dd9b70b4f8d5/093624855219.jpg/300x300bb.jpg" },
  { rank: 8, title: "Midnights", artist: "Taylor Swift", trend: 'down', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a7/67/6c/a7676c8c-10bc-9d06-03c0-3796dcfcdef2/22UMGIM94451.rgb.jpg/300x300bb.jpg" },
  { rank: 9, title: "Lover", artist: "Taylor Swift", trend: 'same', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/13/2e/38/132e38c9-dedf-3580-c116-f3cc61730cfb/19mcU00k0D.jpg/300x300bb.jpg" },
  { rank: 10, title: "Scarlet", artist: "Doja Cat", trend: 'down', cover: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/c3/b2/e3/c3b2e3e5-9c9c-54a7-b088-7e1ff6bd1cfd/886444634285.jpg/300x300bb.jpg" },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-gray-400" />;
};

export default function MusicCharts() {
  const [activeTab, setActiveTab] = useState<'hot100' | 'hot200'>('hot100');

  const items = activeTab === 'hot100' ? HOT_100_SONGS : HOT_200_ALBUMS;

  return (
    <div className="px-4">
      <div className="relative mb-6 rounded-[2rem] overflow-hidden bg-black text-white p-6 shadow-xl">
        <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 mix-blend-overlay" />
        <div className="absolute top-0 right-0 p-6 opacity-20">
          <Music className="w-24 h-24 rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full mb-4">
             <Trophy className="w-3.5 h-3.5 text-yellow-400" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white">Billboard Charts</span>
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter mb-1">Música em Alta</h2>
          <p className="text-white/80 text-sm font-medium">Os hits mais ouvidos no momento.</p>
        </div>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
        <button
          onClick={() => setActiveTab('hot100')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'hot100' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Hot 100 (Sons)
        </button>
        <button
          onClick={() => setActiveTab('hot200')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'hot200' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Billboard 200 (Álbuns)
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={`${activeTab}-${item.rank}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center bg-white p-3 rounded-2xl border border-black/5 shadow-sm group hover:border-black/10 transition-colors"
          >
            <div className="w-8 flex flex-col items-center justify-center flex-shrink-0">
              <span className={`text-base font-black italic ${item.rank <= 3 ? 'text-black' : 'text-gray-400'}`}>
                {item.rank}
              </span>
              <TrendIcon trend={item.trend} />
            </div>

            <div className="w-14 h-14 rounded-xl overflow-hidden ml-2 flex-shrink-0 relative">
              <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {activeTab === 'hot100' ? (
                  <Play className="w-6 h-6 text-white fill-white" />
                ) : (
                  <Disc className="w-6 h-6 text-white" />
                )}
              </div>
            </div>

            <div className="ml-4 flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 truncate text-sm">{item.title}</h4>
              <p className="text-gray-500 text-xs truncate mt-0.5">{item.artist}</p>
            </div>
            
          </motion.div>
        ))}
      </div>
    </div>
  );
}
