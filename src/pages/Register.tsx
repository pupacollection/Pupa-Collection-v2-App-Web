import React from "react";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    cpf: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Create PUPA ID (Format: PUPA-XXXXXX)
      const pupaId = `PUPA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const profileData = {
        uid: user.uid,
        pupaId,
        username: formData.username.startsWith('@') ? formData.username : `@${formData.username}`,
        displayName: formData.name,
        cpf: formData.cpf, // In a real app, CPF needs validation and security rules to keep private
        phone: formData.phone,
        email: formData.email,
        level: 1,
        xp: 0,
        points: 0,
        role: 'USER',
        isBlocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'profiles', user.uid), profileData);
      navigate('/account');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
         setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
         setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
         setError('Erro ao criar conta. Tente novamente.');
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
        className="w-full max-w-lg bg-pupa-dark-gray border border-white/5 p-8"
      >
        <h1 className="text-3xl font-heading font-bold text-white tracking-wider mb-2 text-center uppercase">CRIAR CONTA</h1>
        <p className="text-gray-400 font-body text-xs tracking-widest text-center uppercase mb-8">ENTRE PARA O MOVIMENTO</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 mb-6 text-sm font-body uppercase">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-heading tracking-widest text-gray-400">NOME COMPLETO</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-heading tracking-widest text-gray-400">USERNAME</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-heading tracking-widest text-gray-400">CPF</label>
              <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-heading tracking-widest text-gray-400">TELEFONE</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" required />
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-[10px] font-heading tracking-widest text-gray-400">EMAIL</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-heading tracking-widest text-gray-400">SENHA</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-heading tracking-widest text-gray-400">CONFIRMAR SENHA</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="bg-pupa-graphite border border-white/10 px-4 py-3 text-white font-body text-sm outline-none focus:border-pupa-neon/50" required />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black font-heading font-bold tracking-widest py-4 mt-6 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'CRIANDO CONTA...' : 'CADASTRAR'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <span className="text-[10px] font-heading tracking-widest text-gray-500">JÁ TEM UMA CONTA? </span>
          <Link to="/login" className="text-[10px] font-heading font-bold tracking-widest text-white hover:text-pupa-neon transition-colors">
            FAÇA LOGIN
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
