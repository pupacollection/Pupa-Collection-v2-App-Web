import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { Post, PublicProfile } from '../../types';
import { MessageSquare, Heart, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeedPost extends Post {
  authorProfile?: PublicProfile;
  hasLiked?: boolean;
}

export default function CommunityDiscussion({ dropId, dropName }: { dropId?: string, dropName?: string }) {
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilesCache, setProfilesCache] = useState<Record<string, PublicProfile>>({});
  
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Comment Modal state
  const [activePostForComments, setActivePostForComments] = useState<FeedPost | null>(null);

  
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchComments = async (postId: string) => {
    try {
      setLoadingComments(true);
      const q = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const feedComments: any[] = [];
      const newCache = { ...profilesCache };

      for (const d of snap.docs) {
        const data = d.data();
        if (data.postId !== postId || !data.active) continue;
        
        let authorProfile = newCache[data.authorId];
        if (!authorProfile) {
          const profileSnap = await getDoc(doc(db, 'publicProfiles', data.authorId));
          if (profileSnap.exists()) {
            authorProfile = profileSnap.data() as PublicProfile;
            newCache[data.authorId] = authorProfile;
          }
        }
        
        feedComments.push({ ...data, id: d.id, authorProfile });
      }
      
      setProfilesCache(newCache);
      setComments(feedComments);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (activePostForComments) {
      fetchComments(activePostForComments.id);
    } else {
      setComments([]);
      setNewCommentContent('');
    }
  }, [activePostForComments]);

  const handleCreateComment = async () => {
    if (!user || !activePostForComments || newCommentContent.trim().length < 1) return;
    setIsSubmittingComment(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId: activePostForComments.id, content: newCommentContent })
      });
      
      if (!res.ok) throw new Error('Failed to create comment');
      
      setNewCommentContent('');
      fetchComments(activePostForComments.id);
      
      // Optimistic UI for feed post commentsCount
      setPosts(prev => prev.map(p => {
        if (p.id === activePostForComments.id) {
          return { ...p, commentsCount: p.commentsCount + 1 };
        }
        return p;
      }));
    } catch (err: any) {
      alert(err.message === 'Rate limit exceeded' ? 'Aguarde antes de comentar novamente.' : 'Erro ao publicar comentário.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Report Modal state
  const [reportTarget, setReportTarget] = useState<{ id: string, type: 'POST' | 'COMMENT' } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const fetchProfile = async (uid: string) => {
    if (profilesCache[uid]) return profilesCache[uid];
    const snap = await getDoc(doc(db, 'publicProfiles', uid));
    if (snap.exists()) {
      const data = snap.data() as PublicProfile;
      setProfilesCache(prev => ({ ...prev, [uid]: data }));
      return data;
    }
    return undefined;
  };

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const q = dropId 
        ? query(collection(db, 'posts'), where('dropId', '==', dropId), orderBy('createdAt', 'desc'), limit(20))
        : query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      const feedPosts: FeedPost[] = [];
      
      const newCache = { ...profilesCache };
      
      for (const d of snap.docs) {
        const data = d.data() as Post;
        if (!data.active) continue;
        
        let authorProfile = newCache[data.authorId];
        if (!authorProfile) {
          const profileSnap = await getDoc(doc(db, 'publicProfiles', data.authorId));
          if (profileSnap.exists()) {
            authorProfile = profileSnap.data() as PublicProfile;
            newCache[data.authorId] = authorProfile;
          }
        }
        
        // We could fetch postLikes here to check if the user has liked it,
        // but for now we'll do it lazily or leave hasLiked=false initially
        
        feedPosts.push({
          ...data,
          authorProfile
        });
      }
      
      setProfilesCache(newCache);
      setPosts(feedPosts);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleCreatePost = async () => {
    if (!user) return;
    if (newPostContent.trim().length < 1) return;
    
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newPostContent, dropId })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create post');
      }
      
      setNewPostContent('');
      setSuccessMsg('PUBLICADO COM SUCESSO.');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchFeed(); // Refresh feed
    } catch (err: any) {
      setErrorMsg(err.message === 'Rate limit exceeded' ? 'Você está indo rápido demais. Aguarde alguns instantes e tente novamente.' : 'Não foi possível publicar agora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string, isUnlike = false) => {
    if (!user) return;
    
    // Optimistic UI Update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { 
          ...p, 
          hasLiked: !isUnlike, 
          likesCount: isUnlike ? Math.max(0, p.likesCount - 1) : p.likesCount + 1 
        };
      }
      return p;
    }));

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/community/${isUnlike ? 'unlike' : 'like'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetId: postId, targetType: 'POST' })
      });
      
      if (!res.ok) {
        // Rollback on error
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { 
              ...p, 
              hasLiked: isUnlike, 
              likesCount: isUnlike ? p.likesCount + 1 : Math.max(0, p.likesCount - 1) 
            };
          }
          return p;
        }));
      }
    } catch (err) {
      // Rollback on error
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { 
            ...p, 
            hasLiked: isUnlike, 
            likesCount: isUnlike ? p.likesCount + 1 : Math.max(0, p.likesCount - 1) 
          };
        }
        return p;
      }));
    }
  };

  const submitReport = async () => {
    if (!user || !reportTarget || !reportReason) return;
    setIsReporting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          targetId: reportTarget.id, 
          targetType: reportTarget.type, 
          reason: reportReason 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert('Denúncia enviada com sucesso.');
      setReportTarget(null);
      setReportReason('');
    } catch (err: any) {
      alert(err.message === 'Rate limit exceeded' ? 'Aguarde antes de enviar outra denúncia.' : 'Erro ao enviar denúncia.');
    } finally {
      setIsReporting(false);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}S`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}M`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}H`;
    return `${Math.floor(diffInSeconds / 86400)}D`;
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${dropId ? "" : "min-h-screen pt-20 md:pt-32 px-6 md:px-12 pb-20"}`}>
      {!dropId && (
        <div className="flex flex-col mb-12 border-b border-white/10 pb-6">
          <h1 className="text-3xl md:text-5xl font-heading font-bold text-white tracking-wider mb-2 uppercase">PUPA // COMMUNITY</h1>
          <p className="text-gray-400 font-body text-xs tracking-widest uppercase">THE MOVEMENT IS ALIVE.</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full flex flex-col gap-6">
          
          {/* Feed Header */}
          <div className="flex gap-6 border-b border-white/5 pb-4 mb-2">
             <button className="text-xs font-heading font-bold tracking-widest text-white uppercase">LATEST</button>
             <button className="text-xs font-heading tracking-widest text-gray-500 uppercase">ALL</button>
          </div>
          
          {/* Create Post Composer */}
          {user ? (
            <div className="bg-pupa-dark-gray border border-white/5 p-6 flex flex-col gap-4">
              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder={dropId ? "O que esse Drop representa para você?" : "Compartilhe com o movimento..."}
                className="w-full bg-transparent border-none outline-none text-white font-body text-sm resize-none placeholder-gray-600 focus:ring-0 p-0"
                rows={2}
                maxLength={500}
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                <span className="text-[10px] font-heading tracking-widest text-gray-600">
                  {newPostContent.length}/500
                </span>
                <div className="flex items-center gap-4">
                  {errorMsg && <span className="text-[10px] text-red-500 font-heading uppercase">{errorMsg}</span>}
                  {successMsg && <span className="text-[10px] text-pupa-neon font-heading uppercase">{successMsg}</span>}
                  <button 
                    onClick={handleCreatePost}
                    disabled={isSubmitting || newPostContent.trim().length === 0}
                    className="text-[10px] font-heading font-bold tracking-widest bg-white text-black px-6 py-2 hover:bg-gray-200 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-pupa-dark-gray border border-white/5 p-6 flex flex-col items-center text-center gap-4">
               <p className="text-xs text-gray-400 font-heading tracking-widest uppercase">VOCÊ PRECISA ESTAR CONECTADO PARA PUBLICAR</p>
               <a href="/login" className="text-[10px] font-heading font-bold tracking-widest bg-white text-black px-6 py-2 hover:bg-gray-200 transition-colors uppercase">
                 ENTRAR NA PUPA
               </a>
            </div>
          )}

          {/* Feed */}
          {loading ? (
            <div className="flex flex-col items-center py-20 text-center gap-4">
               <div className="w-8 h-8 border-t-2 border-r-2 border-white rounded-full animate-spin"></div>
               <p className="text-[10px] text-gray-500 font-heading tracking-widest uppercase animate-pulse">SYNCING COMMUNITY...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-pupa-dark-gray border border-white/5 p-12 flex flex-col items-center text-center">
              <h3 className="font-heading font-bold text-sm text-white mb-2 tracking-widest uppercase">{dropId ? "NINGUÉM FALOU SOBRE ESTE DROP AINDA." : "THE MOVEMENT IS WAITING."}</h3>
              <p className="text-[10px] text-gray-500 font-body mb-6 uppercase">SEJA O PRIMEIRO A DEIXAR SUA MARCA.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map(post => (
                <div key={post.id} className="bg-pupa-dark-gray border border-white/5 p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Link to={`/u/${post.authorProfile?.username}`} className="w-10 h-10 bg-pupa-graphite rounded-full overflow-hidden flex items-center justify-center border border-white/10 hover:opacity-80 transition-opacity">
                        {post.authorProfile?.avatar ? (
                           <img src={post.authorProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                           <span className="text-gray-500 text-xs font-heading font-bold">{(post.authorProfile?.username || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </Link>
                      <div>
                        <Link to={`/u/${post.authorProfile?.username}`} className="font-heading font-bold text-sm text-white uppercase hover:text-pupa-neon transition-colors block">{post.authorProfile?.username || 'ANON'}</Link>
                        <p className="text-[9px] text-gray-500 tracking-widest font-heading uppercase">
                          {post.authorProfile?.level ? `NÍVEL ${post.authorProfile.level} • ` : ''}{formatRelativeTime(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Report Menu */}
                    <div className="relative group">
                      <button className="text-gray-500 hover:text-white transition-colors p-2">
                         <MoreHorizontal className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-32 bg-black border border-white/10 hidden group-hover:block z-10 shadow-2xl">
                         <button 
                           onClick={() => setReportTarget({ id: post.id, type: 'POST' })}
                           className="w-full text-left px-4 py-3 text-[10px] font-heading tracking-widest text-gray-400 hover:text-white hover:bg-white/5 uppercase flex items-center gap-2"
                         >
                           <AlertCircle className="w-3 h-3" /> DENUNCIAR
                         </button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="font-body text-sm text-gray-300 whitespace-pre-wrap">{post.content}</p>
                  
                  {post.dropId && !dropId && (
                     <div className="mt-2 inline-flex items-center">
                        <span className="text-[9px] font-heading font-bold tracking-widest bg-white/5 px-2 py-1 text-pupa-neon border border-pupa-neon/20 uppercase">
                          DROP ASSUNTO
                        </span>
                     </div>
                  )}
                  
                  <div className="flex items-center gap-6 mt-2 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => handleLike(post.id, post.hasLiked)}
                      className={`flex items-center gap-2 transition-colors ${post.hasLiked ? 'text-pupa-neon' : 'text-gray-500 hover:text-white'}`}
                    >
                      <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-current' : ''}`} />
                      <span className="text-[10px] font-heading tracking-widest">{post.likesCount}</span>
                    </button>
                    <button 
                      onClick={() => setActivePostForComments(post)}
                      className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px] font-heading tracking-widest">{post.commentsCount}</span>
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center mt-4">
                 <button className="text-[10px] font-heading font-bold tracking-widest border border-white/20 text-white px-8 py-3 hover:bg-white hover:text-black transition-colors uppercase">
                   CARREGAR MAIS
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COMMENTS MODAL */}
      {activePostForComments && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-6" onClick={() => setActivePostForComments(null)}>
           <div 
             className="w-full md:w-[500px] h-[80vh] md:h-[600px] bg-pupa-dark-gray border border-white/10 flex flex-col shadow-2xl" 
             onClick={e => e.stopPropagation()}
           >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black">
                 <h3 className="font-heading font-bold text-sm text-white tracking-widest uppercase">COMENTÁRIOS</h3>
                 <button onClick={() => setActivePostForComments(null)} className="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                 {/* Original Post Context */}
                 <div className="pb-6 border-b border-white/5">
                    <p className="font-body text-sm text-gray-300 whitespace-pre-wrap">{activePostForComments.content}</p>
                 </div>
                 
                 
                 {loadingComments ? (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-t-2 border-r-2 border-white rounded-full animate-spin"></div>
                    </div>
                 ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center gap-2 text-gray-500">
                      <MessageSquare className="w-6 h-6 mb-2 opacity-50" />
                      <p className="text-[10px] font-heading tracking-widest uppercase">Nenhum comentário ainda.</p>
                    </div>
                 ) : (
                    <div className="flex flex-col gap-6">
                      {comments.map(c => (
                         <div key={c.id} className="flex gap-4">
                           <Link to={`/u/${c.authorProfile?.username}`} className="w-8 h-8 bg-pupa-graphite rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/10 hover:opacity-80 transition-opacity">
                             {c.authorProfile?.avatar ? (
                               <img src={c.authorProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                             ) : (
                               <span className="text-gray-500 text-[10px] font-heading font-bold">{(c.authorProfile?.username || '?').charAt(0).toUpperCase()}</span>
                             )}
                           </Link>
                           <div className="flex flex-col flex-1">
                             <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                 <Link to={`/u/${c.authorProfile?.username}`} className="font-heading font-bold text-xs text-white uppercase hover:text-pupa-neon transition-colors">{c.authorProfile?.username || 'ANON'}</Link>
                                 <span className="text-[8px] text-gray-500 tracking-widest font-heading uppercase">{formatRelativeTime(c.createdAt)}</span>
                               </div>
                               <button 
                                 onClick={() => setReportTarget({ id: c.id, type: 'COMMENT' })}
                                 className="text-gray-500 hover:text-white transition-colors p-1"
                               >
                                 <AlertCircle className="w-3 h-3" />
                               </button>
                             </div>
                             <p className="font-body text-xs text-gray-300 mt-1 whitespace-pre-wrap">{c.content}</p>
                           </div>
                         </div>
                      ))}
                    </div>
                 )}

              </div>
              
              <div className="p-4 border-t border-white/10 bg-black">
                 {user ? (
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       value={newCommentContent}
                       onChange={e => setNewCommentContent(e.target.value)}
                       placeholder="Escreva algo..." 
                       disabled={isSubmittingComment}
                       className="flex-1 bg-white/5 border border-white/10 px-4 py-2 text-white font-body text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
                       onKeyDown={e => { if (e.key === 'Enter') handleCreateComment(); }}
                     />
                     <button 
                       onClick={handleCreateComment}
                       disabled={isSubmittingComment || newCommentContent.trim().length === 0}
                       className="text-[10px] font-heading font-bold tracking-widest bg-white text-black px-6 hover:bg-gray-200 transition-colors uppercase disabled:opacity-50"
                     >
                       {isSubmittingComment ? '...' : 'ENVIAR'}
                     </button>
                   </div>
                 ) : (
                   <p className="text-[10px] text-gray-500 font-heading tracking-widest text-center uppercase">CONECTE-SE PARA COMENTAR</p>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {reportTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6" onClick={() => setReportTarget(null)}>
           <div className="w-full max-w-sm bg-black border border-white/10 p-6 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-heading font-bold text-sm text-white mb-4 tracking-widest uppercase">DENUNCIAR CONTEÚDO</h3>
              <p className="text-[10px] text-gray-400 font-body mb-6 uppercase">Selecione o motivo da denúncia. A equipe PUPA revisará o caso.</p>
              
              <select 
                value={reportReason} 
                onChange={e => setReportReason(e.target.value)}
                className="w-full bg-pupa-dark-gray border border-white/10 text-white font-body text-sm p-3 mb-6 outline-none focus:border-white/30"
              >
                 <option value="">Selecione um motivo...</option>
                 <option value="SPAM">SPAM</option>
                 <option value="ASSEDIO">ASSÉDIO</option>
                 <option value="CONTEUDO_OFENSIVO">CONTEÚDO OFENSIVO</option>
                 <option value="IMPERSONACAO">IMPERSONAÇÃO</option>
                 <option value="OUTRO">OUTRO</option>
              </select>
              
              <div className="flex gap-4">
                 <button 
                   onClick={() => setReportTarget(null)}
                   className="flex-1 text-[10px] font-heading font-bold tracking-widest border border-white/20 text-white py-3 hover:bg-white/5 transition-colors uppercase"
                 >
                   CANCELAR
                 </button>
                 <button 
                   onClick={submitReport}
                   disabled={!reportReason || isReporting}
                   className="flex-1 text-[10px] font-heading font-bold tracking-widest bg-white text-black py-3 hover:bg-gray-200 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isReporting ? 'ENVIANDO...' : 'ENVIAR'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
