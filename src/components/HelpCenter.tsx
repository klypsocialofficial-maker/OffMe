import React from 'react';
import { ArrowLeft, Search, HelpCircle, MessageCircle, Shield, CreditCard, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HelpCenter() {
  const navigate = useNavigate();

  const topics = [
    { icon: HelpCircle, label: 'Getting Started', desc: 'New to OffMe? Start here.' },
    { icon: Shield, label: 'Safety & Security', desc: 'Keep your account and data safe.' },
    { icon: CreditCard, label: 'Monetization', desc: 'Learn how to earn with your content.' },
    { icon: MessageCircle, label: 'Communities', desc: 'How to manage and grow tribes.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <div>
          <h2 className="text-xl font-black tracking-tight">Help Center</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Get support</p>
        </div>
      </div>

      <div className="p-6">
        <div className="relative mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
          <input 
            type="text" 
            placeholder="Search for help topics" 
            className="w-full pl-16 pr-6 py-6 bg-gray-50 border-none rounded-[32px] text-lg font-black tracking-tight focus:ring-4 focus:ring-black/5 outline-none transition-all"
          />
        </div>

        <section className="mb-12">
          <h3 className="text-xs text-gray-300 font-black uppercase tracking-widest mb-6 px-4">Popular Topics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topics.map((topic) => (
              <button key={topic.label} className="flex flex-col items-start p-6 bg-gray-50 rounded-[32px] hover:bg-black hover:text-white transition-all group text-left shadow-sm">
                <div className="p-4 bg-white rounded-2xl mb-4 group-hover:bg-white/10 transition-colors">
                  <topic.icon className="w-6 h-6 text-black group-hover:text-white transition-colors" />
                </div>
                <p className="text-lg font-black tracking-tight mb-1">{topic.label}</p>
                <p className="text-xs text-gray-400 font-medium group-hover:text-gray-300">{topic.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs text-gray-300 font-black uppercase tracking-widest mb-6 px-4">Common Questions</h3>
          <div className="space-y-2">
            {[
              'How do I change my username?',
              'What is OffMe Verified?',
              'How to report a post?',
              'How do I delete my account?'
            ].map((q) => (
              <button key={q} className="w-full flex items-center justify-between p-6 hover:bg-gray-50 rounded-[24px] transition-all text-left group">
                <p className="font-black text-black tracking-tight group-hover:underline">{q}</p>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
              </button>
            ))}
          </div>
        </section>

        <div className="mt-12 p-8 bg-black text-white rounded-[40px] text-center shadow-2xl">
          <h3 className="text-2xl font-black mb-2 tracking-tight">Still need help?</h3>
          <p className="text-gray-400 font-medium mb-8">Our support team is available 24/7 to assist you.</p>
          <button className="px-12 py-4 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
