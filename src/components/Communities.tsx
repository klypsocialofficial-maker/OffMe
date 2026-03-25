import React from 'react';
import { MessageSquare, Users, Plus, Search, MoreHorizontal } from 'lucide-react';

export default function Communities() {
  const communities = [
    { id: '1', name: 'AI Artists', members: 1200, followers: 4500, photo: 'https://picsum.photos/seed/ai/100/100' },
    { id: '2', name: 'Web Devs', members: 850, followers: 2300, photo: 'https://picsum.photos/seed/web/100/100' },
    { id: '3', name: 'Designers', members: 2100, followers: 8900, photo: 'https://picsum.photos/seed/design/100/100' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Communities</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Find your tribe</p>
        </div>
        <button className="p-3 bg-black text-white rounded-full shadow-xl active:scale-90 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="p-4">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
          <input 
            type="text" 
            placeholder="Search for communities" 
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-black outline-none"
          />
        </div>

        <h3 className="text-xl font-black mb-6 tracking-tight">Your Communities</h3>
        <div className="space-y-6">
          {communities.map((community) => (
            <div key={community.id} className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <img src={community.photo} alt={community.name} className="w-14 h-14 rounded-2xl object-cover shadow-md" referrerPolicy="no-referrer" />
                <div>
                  <p className="text-lg font-black text-black group-hover:underline">{community.name}</p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    {community.members} members · {community.followers} followers
                  </p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <MoreHorizontal className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 bg-black text-white rounded-[32px] shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-2 tracking-tight">Discover new communities</h3>
            <p className="text-gray-400 font-medium mb-6">Find people with shared interests and organize your home timeline.</p>
            <button className="px-8 py-3 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-colors">
              Explore
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}
