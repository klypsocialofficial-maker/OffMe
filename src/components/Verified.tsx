import React from 'react';
import { ShieldCheck, CheckCircle2, Star, Zap, Globe } from 'lucide-react';

export default function Verified() {
  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4">
        <h2 className="text-2xl font-black tracking-tight">Verified</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Upgrade your experience</p>
      </div>

      <div className="p-6">
        <div className="bg-black text-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden mb-12">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-md">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter">Get Verified</h3>
            <p className="text-gray-400 font-medium mb-8 text-lg leading-relaxed">Join the elite community of verified creators and unlock exclusive features to amplify your voice.</p>
            
            <div className="space-y-6 mb-10">
              {[
                { icon: CheckCircle2, title: 'Blue Checkmark', desc: 'Show everyone you are the real deal.' },
                { icon: Star, title: 'Priority Ranking', desc: 'Your posts and replies appear at the top.' },
                { icon: Zap, title: 'Early Access', desc: 'Try new features before anyone else.' },
                { icon: Globe, title: 'Global Reach', desc: 'Boost your visibility across the platform.' }
              ].map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="mt-1">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-widest">{feature.title}</p>
                    <p className="text-gray-400 text-sm font-medium">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-5 bg-white text-black rounded-full font-black text-lg uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 shadow-2xl">
              Subscribe Now
            </button>
            <p className="text-center mt-4 text-xs text-gray-500 font-bold uppercase tracking-widest">Starting at $8/month</p>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-32 -mb-32" />
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-black tracking-tight">Frequently Asked Questions</h3>
          <div className="space-y-6">
            {[
              { q: 'What is OffMe Verified?', a: 'OffMe Verified is a subscription service that provides a blue checkmark and early access to select features.' },
              { q: 'How do I get the checkmark?', a: 'Once you subscribe and your account is reviewed, the checkmark will appear on your profile.' },
              { q: 'Can I cancel anytime?', a: 'Yes, you can manage your subscription in your settings at any time.' }
            ].map((faq) => (
              <div key={faq.q} className="border-b border-gray-50 pb-6">
                <p className="font-black text-black mb-2 tracking-tight">{faq.q}</p>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
