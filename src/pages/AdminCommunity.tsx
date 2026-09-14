import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { CommunityReport, Post, Comment } from '../types';
import { AlertCircle, CheckCircle, EyeOff, Search, Eye } from 'lucide-react';
import { getAuth } from 'firebase/auth';

export default function AdminCommunity() {
  const { user, profile } = useAuthStore();
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Targets cache
  const [targetsData, setTargetsData] = useState<Record<string, any>>({});
  
  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    resolved: 0,
    dismissed: 0,
    total: 0
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const fetchedReports = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityReport));
      setReports(fetchedReports);
      
      const newStats = {
        pending: fetchedReports.filter(r => r.status === 'PENDING').length,
        resolved: fetchedReports.filter(r => r.status === 'RESOLVED').length,
        dismissed: fetchedReports.filter(r => r.status === 'DISMISSED').length,
        total: fetchedReports.length
      };
      setStats(newStats);
      
      // Fetch targets for PENDING
      const pendingReports = fetchedReports.filter(r => r.status === 'PENDING');
      const newTargets = { ...targetsData };
      
      for (const r of pendingReports) {
        if (!newTargets[r.targetId]) {
           let col = '';
           if (r.targetType === 'POST') col = 'posts';
           else if (r.targetType === 'COMMENT') col = 'comments';
           else if (r.targetType === 'PROFILE') col = 'publicProfiles';
           
           if (col) {
             const tDoc = await getDoc(doc(db, col, r.targetId));
             if (tDoc.exists()) {
               newTargets[r.targetId] = tDoc.data();
             }
           }
        }
      }
      setTargetsData(newTargets);
      
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') {
      fetchReports();
    }
  }, [profile]);

  const handleModerate = async (report: CommunityReport, action: 'KEEP' | 'HIDE') => {
    if (!window.confirm(`${action === 'HIDE' ? 'OCULTAR ESTE CONTEÚDO?' : 'MANTER ESTE CONTEÚDO?'}\n\nTIPO: ${report.targetType}\nMOTIVO: ${report.reason}\n\nConfirma?`)) return;
    
    setProcessing(report.id);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Não autenticado");
      
      const response = await fetch('/api/admin/community/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reportId: report.id,
          targetId: report.targetId,
          targetType: report.targetType,
          action
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro na moderação");
      }
      
      // Refresh
      await fetchReports();
      
    } catch (err: any) {
      alert(err.message || 'Erro ao moderar');
    } finally {
      setProcessing(null);
    }
  };

  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    return (
      <div className="w-full min-h-screen pt-12 md:pt-32 px-6 flex items-center justify-center">
        <h1 className="text-2xl font-heading text-red-500 uppercase">ACESSO RESTRITO</h1>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pt-20 md:pt-32 px-6 md:px-12 pb-20">
      <h1 className="text-3xl font-heading font-bold text-white mb-8 tracking-wider uppercase">PUPA // COMMUNITY MODERATION</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
         <div className="bg-pupa-dark-gray border border-white/5 p-6">
           <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-2 uppercase">REPORTS PENDING</span>
           <span className="text-2xl font-body font-bold text-pupa-neon">{stats.pending}</span>
         </div>
         <div className="bg-pupa-dark-gray border border-white/5 p-6">
           <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-2 uppercase">CONTENT FLAGGED (HIDE)</span>
           <span className="text-2xl font-body font-bold text-white">{stats.resolved}</span>
         </div>
         <div className="bg-pupa-dark-gray border border-white/5 p-6">
           <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-2 uppercase">DISMISSED (KEEP)</span>
           <span className="text-2xl font-body font-bold text-gray-500">{stats.dismissed}</span>
         </div>
         <div className="bg-pupa-dark-gray border border-white/5 p-6">
           <span className="text-[10px] font-heading tracking-widest text-gray-500 block mb-2 uppercase">TOTAL</span>
           <span className="text-2xl font-body font-bold text-white">{stats.total}</span>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-pupa-dark-gray border border-white/5 p-6 flex items-center justify-between">
           <h2 className="text-sm font-heading font-bold tracking-widest text-white uppercase">PENDING REPORTS</h2>
           <button onClick={fetchReports} disabled={loading} className="text-[10px] font-heading text-gray-500 hover:text-white uppercase tracking-widest">ATUALIZAR</button>
        </div>
        
        {loading ? (
          <div className="text-center text-white py-12 text-sm font-heading uppercase tracking-widest">LOADING...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.filter(r => r.status === 'PENDING').length === 0 ? (
              <div className="bg-pupa-dark-gray border border-white/5 p-8 text-center text-gray-500 text-xs font-heading uppercase tracking-widest">NENHUMA DENÚNCIA PENDENTE</div>
            ) : (
              reports.filter(r => r.status === 'PENDING').map(report => {
                const target = targetsData[report.targetId];
                
                return (
                  <div key={report.id} className="bg-pupa-dark-gray border border-white/5 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] bg-white/10 px-2 py-1 font-heading text-white tracking-widest uppercase">{report.targetType}</span>
                        <span className="text-[10px] text-gray-500 font-heading tracking-widest uppercase">{new Date(report.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      
                      <div className="text-sm font-body text-red-400 mb-4 uppercase">
                        <strong>MOTIVO:</strong> {report.reason}
                      </div>
                      
                      <div className="bg-black/50 p-4 border border-white/5 rounded-sm">
                        {target ? (
                          <>
                            <div className="text-[10px] text-gray-500 font-heading uppercase tracking-widest mb-2">
                              AUTHOR ID: {target.authorId || target.userId || 'UNKNOWN'}
                            </div>
                            <div className="text-sm font-body text-gray-300 whitespace-pre-wrap">
                              {target.content || target.bio || '(Sem conteúdo em texto)'}
                            </div>
                            {target.image && <img src={target.image} alt="Reported" className="mt-4 max-w-xs border border-white/10" />}
                          </>
                        ) : (
                          <div className="text-[10px] text-gray-500 font-heading uppercase tracking-widest">CARREGANDO CONTEÚDO ALVO... OU JÁ REMOVIDO.</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                      <button
                        onClick={() => handleModerate(report, 'HIDE')}
                        disabled={processing === report.id}
                        className="flex-1 px-6 py-3 bg-red-600 text-white font-bold font-heading text-[10px] tracking-widest uppercase hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <EyeOff className="w-4 h-4" />
                        OCULTAR CONTEÚDO
                      </button>
                      <button
                        onClick={() => handleModerate(report, 'KEEP')}
                        disabled={processing === report.id}
                        className="flex-1 px-6 py-3 bg-transparent border border-white/20 text-white font-bold font-heading text-[10px] tracking-widest uppercase hover:border-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        MANTER
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
