import React from 'react';
import { List as ListIcon, Plus, Search, MoreHorizontal } from 'lucide-react';

export default function Lists() {
  const lists = [
    { id: '1', name: 'Tech News', members: 120, followers: 450, photo: 'https://picsum.photos/seed/tech/100/100' },
    { id: '2', name: 'Design Inspo', members: 85, followers: 230, photo: 'https://picsum.photos/seed/design/100/100' },
    { id: '3', name: 'AI Research', members: 210, followers: 890, photo: 'https://picsum.photos/seed/ai/100/100' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Lists</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Organize your feed</p>
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
            placeholder="Search for lists" 
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-black outline-none"
          />
        </div>

        <h3 className="text-xl font-black mb-6 tracking-tight">Your Lists</h3>
        <div className="space-y-6">
          {lists.map((list) => (
            <div key={list.id} className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <img src={list.photo} alt={list.name} className="w-14 h-14 rounded-2xl object-cover shadow-md" referrerPolicy="no-referrer" />
                <div>
                  <p className="text-lg font-black text-black group-hover:underline">{list.name}</p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    {list.members} members · {list.followers} followers
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
            <h3 className="text-2xl font-black mb-2 tracking-tight">Discover new lists</h3>
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
