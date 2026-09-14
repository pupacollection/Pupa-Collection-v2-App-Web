import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Drop } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function AdminDrops() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [status, setStatus] = useState<'EM BREVE' | 'DISPONÍVEL' | 'QUASE ESGOTADO' | 'ESGOTADO' | 'ENCERRADO'>('EM BREVE');
  const [coverImage, setCoverImage] = useState('');
  const [heroImage, setHeroImage] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
       navigate('/');
    }
  }, [profile, navigate]);

  useEffect(() => {
    fetchDrops();
  }, []);

  async function fetchDrops() {
    try {
      const q = query(collection(db, 'drops'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setDrops(snap.docs.map(d => ({ id: d.id, ...d.data() } as Drop)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;
    try {
      const dropRef = doc(collection(db, 'drops'));
      const newDrop: Drop = {
        id: dropRef.id,
        name,
        slug,
        title,
        description,
        manifesto,
        status,
        coverImage,
        heroImage,
        countdownEnabled: false,
        featured: false,
        limited: false,
        noRestock: false,
        products: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(dropRef, newDrop);
      fetchDrops();
      // Reset
      setName(''); setSlug(''); setTitle(''); setDescription(''); setManifesto('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black pt-28 pb-20 px-6 font-body text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-heading font-bold uppercase tracking-widest mb-8 border-b border-white/10 pb-4">
          Gerenciar Drops
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm font-heading tracking-widest uppercase mb-4 text-pupa-neon">NOVO DROP</h2>
            <form onSubmit={handleCreateDrop} className="space-y-4 bg-pupa-dark-gray p-6 border border-white/5">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Nome do Drop</label>
                <input value={name} onChange={e=>setName(e.target.value)} required className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Slug (URL)</label>
                <input value={slug} onChange={e=>setSlug(e.target.value)} required className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Título Hero</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Descrição Curta</label>
                <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white focus:outline-none h-20" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Manifesto</label>
                <textarea value={manifesto} onChange={e=>setManifesto(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white focus:outline-none h-32" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Status</label>
                <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white focus:outline-none">
                  <option value="EM BREVE">EM BREVE</option>
                  <option value="DISPONÍVEL">DISPONÍVEL</option>
                  <option value="QUASE ESGOTADO">QUASE ESGOTADO</option>
                  <option value="ESGOTADO">ESGOTADO</option>
                  <option value="ENCERRADO">ENCERRADO</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Capa (URL)</label>
                <input value={coverImage} onChange={e=>setCoverImage(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Hero Background (URL)</label>
                <input value={heroImage} onChange={e=>setHeroImage(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-sm focus:border-white focus:outline-none" />
              </div>
              
              <button type="submit" className="w-full bg-white text-black font-heading font-bold uppercase tracking-widest py-3 text-xs hover:bg-gray-200 transition-colors">
                CRIAR DROP
              </button>
            </form>
          </div>

          <div>
             <h2 className="text-sm font-heading tracking-widest uppercase mb-4 text-white">DROPS EXISTENTES</h2>
             {loading ? <p className="text-xs text-gray-500 animate-pulse">CARREGANDO...</p> : (
               <div className="space-y-4">
                 {drops.map(d => (
                   <div key={d.id} className="p-4 border border-white/10 bg-pupa-dark-gray flex justify-between items-center">
                     <div>
                       <h3 className="font-heading font-bold uppercase tracking-widest text-sm">{d.name}</h3>
                       <span className="text-[10px] text-gray-500 uppercase tracking-widest">{d.status} • {d.slug}</span>
                     </div>
                     <span className="text-[10px] bg-pupa-neon/10 text-pupa-neon px-2 py-1 border border-pupa-neon/30">
                       {d.products.length} PROD
                     </span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
