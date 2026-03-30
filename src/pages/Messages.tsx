import React from 'react';
import { Mail } from 'lucide-react';

export default function Messages() {
  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100/50 flex justify-between items-center">
        <h1 className="text-xl font-bold">Mensagens</h1>
        <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
          <Mail className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 mt-10">
        <p className="text-3xl font-bold text-black mb-4">Bem-vindo à sua caixa de entrada!</p>
        <p className="mb-8">Envie uma mensagem, compartilhe posts e converse de forma privada.</p>
        <button className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors">
          Nova mensagem
        </button>
      </div>
    </div>
  );
}
