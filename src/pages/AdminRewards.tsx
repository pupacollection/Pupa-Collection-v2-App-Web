import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Reward, RewardType } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminRewards() {
  const { profile } = useAuthStore();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Basic Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Reward>>({
     title: '', description: '', type: 'DISCOUNT', pointsCost: 0, active: true, unlimited: true, oneTimePerUser: true, stock: 0
  });

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchRewards();
  }, [profile]);

  async function fetchRewards() {
    if (!isAdmin) return;
    try {
      const q = query(collection(db, 'rewards'));
      const snap = await getDocs(q);
      setRewards(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reward)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    try {
       const id = editingId || doc(collection(db, 'rewards')).id;
       const data = {
          ...formData,
          id,
          createdAt: editingId ? (rewards.find(r => r.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
          updatedAt: new Date().toISOString()
       };
       await setDoc(doc(db, 'rewards', id), data);
       setEditingId(null);
       setFormData({ title: '', description: '', type: 'DISCOUNT', pointsCost: 0, active: true, unlimited: true, oneTimePerUser: true, stock: 0 });
       fetchRewards();
    } catch (err) {
       console.error("Error saving reward", err);
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingId(reward.id);
    setFormData(reward);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this reward?")) return;
    try {
      await deleteDoc(doc(db, 'rewards', id));
      fetchRewards();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdmin) return <div className="min-h-screen bg-black text-white pt-32 text-center font-heading">ACESSO NEGADO</div>;

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-20 px-6 font-body">
       <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
             <div>
                <h1 className="text-3xl font-heading font-bold uppercase tracking-widest">Admin // Rewards</h1>
                <Link to="/admin" className="text-[10px] text-gray-500 hover:text-pupa-neon tracking-widest uppercase">&larr; Voltar ao Dashboard</Link>
             </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1 bg-pupa-dark-gray border border-white/5 p-6 h-fit">
                <h2 className="text-lg font-heading font-bold uppercase tracking-widest mb-6">{editingId ? 'Editar Recompensa' : 'Nova Recompensa'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                   <div>
                     <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Título</label>
                     <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-white/10 p-3 text-sm text-white" />
                   </div>
                   <div>
                     <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Descrição</label>
                     <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black border border-white/10 p-3 text-sm text-white h-24" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Tipo</label>
                       <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as RewardType})} className="w-full bg-black border border-white/10 p-3 text-sm text-white">
                         <option value="DISCOUNT">Discount</option>
                         <option value="EARLY_ACCESS">Early Access</option>
                         <option value="SECRET_CONTENT">Secret Content</option>
                         <option value="EXCLUSIVE_ITEM">Exclusive Item</option>
                         <option value="TROPHY">Trophy</option>
                         <option value="EXPERIENCE">Experience</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Custo (PTS)</label>
                       <input required type="number" value={formData.pointsCost} onChange={e => setFormData({...formData, pointsCost: Number(e.target.value)})} className="w-full bg-black border border-white/10 p-3 text-sm text-white" />
                     </div>
                   </div>
                   
                   <div className="flex gap-4 border border-white/5 p-4 bg-black/50">
                      <label className="flex items-center gap-2 text-xs font-heading tracking-widest uppercase cursor-pointer">
                        <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="bg-black border-white/20 text-pupa-neon" />
                        Ativo
                      </label>
                      <label className="flex items-center gap-2 text-xs font-heading tracking-widest uppercase cursor-pointer">
                        <input type="checkbox" checked={formData.unlimited} onChange={e => setFormData({...formData, unlimited: e.target.checked})} className="bg-black border-white/20 text-pupa-neon" />
                        Ilimitado
                      </label>
                      <label className="flex items-center gap-2 text-xs font-heading tracking-widest uppercase cursor-pointer">
                        <input type="checkbox" checked={formData.oneTimePerUser} onChange={e => setFormData({...formData, oneTimePerUser: e.target.checked})} className="bg-black border-white/20 text-pupa-neon" />
                        Uma vez por Pupa
                      </label>
                   </div>
                   
                   {!formData.unlimited && (
                     <div>
                       <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Estoque</label>
                       <input type="number" value={formData.stock || 0} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-black border border-white/10 p-3 text-sm text-white" />
                     </div>
                   )}
                   
                   <div>
                     <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Level Mínimo (Opcional)</label>
                     <input type="number" value={formData.requiredLevel || ''} onChange={e => setFormData({...formData, requiredLevel: e.target.value ? Number(e.target.value) : undefined})} className="w-full bg-black border border-white/10 p-3 text-sm text-white" />
                   </div>
                   
                   {formData.type === 'TROPHY' && (
                     <div>
                       <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">ID do Troféu</label>
                       <input type="text" value={formData.rewardTrophyId || ''} onChange={e => setFormData({...formData, rewardTrophyId: e.target.value})} className="w-full bg-black border border-white/10 p-3 text-sm text-white" />
                     </div>
                   )}
                   
                   <div className="flex gap-4 mt-4">
                     <button type="submit" className="flex-1 bg-white text-black font-heading font-bold text-xs py-3 uppercase tracking-widest hover:bg-gray-200">
                        {editingId ? 'Salvar' : 'Criar'}
                     </button>
                     {editingId && (
                       <button type="button" onClick={() => {setEditingId(null); setFormData({ title: '', description: '', type: 'DISCOUNT', pointsCost: 0, active: true, unlimited: true, oneTimePerUser: true, stock: 0 });}} className="px-4 border border-white/10 text-xs font-heading uppercase hover:bg-white/5">
                         Cancelar
                       </button>
                     )}
                   </div>
                </form>
             </div>
             
             <div className="lg:col-span-2">
                <div className="bg-pupa-dark-gray border border-white/5">
                   <div className="p-6 border-b border-white/5 flex justify-between items-center">
                     <h2 className="text-lg font-heading font-bold uppercase tracking-widest">Catálogo de Recompensas</h2>
                   </div>
                   
                   {loading ? (
                     <div className="p-8 text-center text-xs text-gray-500 font-heading uppercase animate-pulse">Carregando...</div>
                   ) : (
                     <div className="divide-y divide-white/5">
                       {rewards.map(reward => (
                         <div key={reward.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.02]">
                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                 {reward.active ? <CheckCircle className="w-4 h-4 text-pupa-neon" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                 <h3 className="font-heading font-bold uppercase tracking-widest text-sm">{reward.title}</h3>
                                 <span className="text-[8px] bg-white/10 px-2 py-0.5 uppercase tracking-widest">{reward.type}</span>
                               </div>
                               <p className="text-[10px] text-gray-400 font-body uppercase tracking-widest mb-2">{reward.description}</p>
                               <div className="flex gap-4 text-[9px] text-gray-500 font-heading tracking-widest uppercase">
                                 <span>{reward.pointsCost} PTS</span>
                                 {!reward.unlimited && <span>| {reward.stock} RESTANTES</span>}
                                 {reward.requiredLevel && <span>| LVL {reward.requiredLevel}+</span>}
                               </div>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => handleEdit(reward)} className="p-2 border border-white/10 hover:border-white/40 text-gray-400 hover:text-white transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(reward.id)} className="p-2 border border-white/10 hover:border-red-500/50 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                         </div>
                       ))}
                       {rewards.length === 0 && (
                          <div className="p-8 text-center text-[10px] text-gray-500 font-heading uppercase">Nenhuma recompensa criada.</div>
                       )}
                     </div>
                   )}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
