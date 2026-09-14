import React from "react";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/account');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
         setError('E-mail ou senha incorretos.');
      } else {
         setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-160px)] flex items-center justify-center px-6 pt-12 md:pt-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-pupa-dark-gray border border-white/5 p-8"
      >
        <h1 className="text-3xl font-heading font-bold text-white tracking-wider mb-2 text-center uppercase">ENTRAR</h1>
        <p className="text-gray-400 font-body text-xs tracking-widest text-center uppercase mb-8">ACESSE O SISTEMA PUPA</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 mb-6 text-sm font-body uppercase">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-heading tracking-widest text-gray-400">EMAIL</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50 transition-colors"
              required 
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-heading tracking-widest text-gray-400">SENHA</label>
              <Link to="/forgot-password" className="text-[10px] font-heading tracking-widest text-gray-500 hover:text-white transition-colors">
                ESQUECEU A SENHA?
              </Link>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50 transition-colors"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black font-heading font-bold tracking-widest py-4 mt-4 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'AUTENTICANDO...' : 'ACESSAR'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <span className="text-[10px] font-heading tracking-widest text-gray-500">NOVO AQUI? </span>
          <Link to="/register" className="text-[10px] font-heading font-bold tracking-widest text-white hover:text-pupa-neon transition-colors">
            CRIE SUA CONTA
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
