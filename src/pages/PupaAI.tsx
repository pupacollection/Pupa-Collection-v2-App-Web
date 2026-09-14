import React from "react";
import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Terminal } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function PupaAI() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'SISTEMA ONLINE. ACESSO CONCEDIDO. EU SOU PUPA AI. COMO POSSO GUIAR VOCÊ PELO MOVIMENTO?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Format history for Gemini SDK
      const history = messages.slice(1).map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: userMessage,
          history
        })
      });

      if (!res.ok) throw new Error('Failed to fetch from PUPA AI');
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', content: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: 'ERRO NO SISTEMA. CONEXÃO COM A REDE PERDIDA.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-80px)] pt-20 px-4 md:px-12 flex flex-col items-center">
      <div className="w-full max-w-4xl h-full flex flex-col bg-pupa-dark-gray border border-white/5 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-pupa-black/50 backdrop-blur-md flex items-center gap-3">
          <Terminal className="w-5 h-5 text-pupa-neon" />
          <h1 className="font-heading font-bold text-white tracking-widest text-sm uppercase">PUPA // INTERFACE NEURAL</h1>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 font-body text-sm scrollbar-none">
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <span className="text-[9px] font-heading tracking-widest text-gray-500 mb-1 uppercase">
                {msg.role === 'user' ? 'MEMBRO' : 'PUPA AI'}
              </span>
              <div className={`p-4 rounded-sm ${msg.role === 'user' ? 'bg-white text-black' : 'bg-pupa-graphite text-gray-300 border border-white/10'}`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="self-start text-xs font-heading tracking-widest text-pupa-neon animate-pulse uppercase"
            >
              PROCESSANDO...
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-pupa-graphite border-t border-white/5">
          <form onSubmit={handleSend} className="flex gap-4">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="PERGUNTE SOBRE DROPS, PONTOS OU A CULTURA..."
              className="flex-1 bg-transparent border-none outline-none text-white text-sm font-body placeholder:text-gray-500"
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 text-white hover:text-pupa-neon disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
