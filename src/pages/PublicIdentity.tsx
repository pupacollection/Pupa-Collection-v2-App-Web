import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PublicProfile, Post, Drop, Reward } from '../types';
import { LEVEL_CONFIG } from '../lib/levels';
import { useAuthStore } from '../store/useAuthStore';
import { MessageSquare, Heart, MoreHorizontal, AlertCircle, ShieldCheck } from 'lucide-react';

export default function PublicIdentity() {
  const { username } = useParams();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [posts, setPosts] = useState<(Post & { authorProfile: PublicProfile, hasLiked: boolean })[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [trophies, setTrophies] = useState<Reward[]>([]);
  
  useEffect(() => {
    async function fetchIdentity() {
      if (!username) return;
      try {
        setLoading(true);
        // Fetch public profile
        const q = query(collection(db, 'publicProfiles'), where('username', '==', username), limit(1));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setProfile(null);
          setLoading(false);
          return;
        }
        
        const p = snap.docs[0].data() as PublicProfile;
        setProfile(p);
        document.title = `@${p.username} — PUPA COLLECTION`;
        
        // Fetch Trophies
        if (p.publicTrophies && p.publicTrophies.length > 0) {
          const tProms = p.publicTrophies.map(tId => getDoc(doc(db, 'rewards', tId)));
          const tSnaps = await Promise.all(tProms);
          const trs = tSnaps.map(s => s.exists() ? { id: s.id, ...s.data() } as Reward : null).filter(Boolean) as Reward[];
          setTrophies(trs);
        }
        
        // Fetch Drops
        if (p.publicDrops && p.publicDrops.length > 0) {
          const dProms = p.publicDrops.map(dId => getDoc(doc(db, 'drops', dId)));
          const dSnaps = await Promise.all(dProms);
          const drs = dSnaps.map(s => s.exists() ? { id: s.id, ...s.data() } as Drop : null).filter(Boolean) as Drop[];
          setDrops(drs);
        }
        
        // Fetch Posts
        const postsQ = query(collection(db, 'posts'), where('authorId', '==', p.userId), orderBy('createdAt', 'desc'), limit(20));
        const postsSnap = await getDocs(postsQ);
        const userPosts = postsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Post));
        
        // We also need to know if current user liked these posts
        const feedPosts: any[] = [];
        for (const pt of userPosts) {
           if (pt.active === false) continue;
           let hasLiked = false;
           if (user) {
             const likeQ = query(collection(db, 'postLikes'), where('postId', '==', pt.id), where('userId', '==', user.uid));
             const likeSnap = await getDocs(likeQ);
             hasLiked = !likeSnap.empty;
           }
           feedPosts.push({ ...pt, authorProfile: p, hasLiked });
        }
        setPosts(feedPosts);
        
      } catch (err) {
        console.error("Error loading identity:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchIdentity();
  }, [username, user]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-6">
        <div className="w-12 h-12 border-t-2 border-r-2 border-white rounded-full animate-spin mb-6"></div>
        <h3 className="font-heading font-bold text-sm text-white tracking-widest uppercase animate-pulse">SYNCING IDENTITY...</h3>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-6">
        <AlertCircle className="w-12 h-12 text-gray-600 mb-6" />
        <h3 className="font-heading font-bold text-xl text-white mb-2 tracking-widest uppercase">IDENTIDADE NÃO ENCONTRADA</h3>
        <p className="text-xs text-gray-500 font-body uppercase">Esta identidade não existe no universo PUPA.</p>
        <Link to="/" className="mt-8 px-6 py-3 border border-white/20 text-[10px] font-heading font-bold text-white tracking-widest uppercase hover:bg-white/5 transition-colors">
          VOLTAR AO INÍCIO
        </Link>
      </div>
    );
  }

  const levelInfo = LEVEL_CONFIG.find(l => l.order === profile.level) || LEVEL_CONFIG[0];

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-20 px-4 md:px-6 max-w-4xl mx-auto">
      
      {/* IDENTITY HEADER */}
      <div className="flex flex-col items-center text-center mb-16">
        <div className="w-24 h-24 md:w-32 md:h-32 bg-pupa-graphite rounded-full overflow-hidden flex items-center justify-center border border-white/10 mb-6 shadow-2xl">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500 text-3xl font-heading font-bold">{profile.username.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-white uppercase tracking-wider mb-2">@{profile.username}</h1>
        <div className="flex items-center gap-4 text-[10px] md:text-xs font-heading font-bold tracking-widest uppercase">
          <span className="text-gray-400">PUPA ID <span className="text-white ml-1">{profile.pupaId}</span></span>
          <span className="text-gray-600">•</span>
          <span className="text-pupa-neon">LEVEL {levelInfo.order} <span className="text-white ml-1">{levelInfo.name}</span></span>
        </div>
      </div>

      {/* SECTIONS */}
      <div className="flex flex-col gap-16">
        
        {/* TROPHIES */}
        {trophies.length > 0 && (
          <section>
            <div className="border-b border-white/10 pb-4 mb-6">
              <h2 className="font-heading font-bold text-sm text-white tracking-widest uppercase">TROPHIES</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trophies.map(t => (
                <div key={t.id} className="bg-pupa-dark-gray border border-white/5 p-4 flex flex-col items-center text-center hover:border-white/20 transition-colors">
                  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border border-white/10 mb-4">
                    <ShieldCheck className="w-6 h-6 text-pupa-neon" />
                  </div>
                  <h4 className="font-heading font-bold text-[10px] text-white uppercase tracking-widest mb-2">{t.title}</h4>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DROPS */}
        {drops.length > 0 && (
          <section>
            <div className="border-b border-white/10 pb-4 mb-6">
              <h2 className="font-heading font-bold text-sm text-white tracking-widest uppercase">DROPS</h2>
            </div>
            <div className="flex flex-col gap-4">
              {drops.map(d => (
                <Link key={d.id} to={`/drop/${d.slug}`} className="bg-pupa-dark-gray border border-white/5 p-6 flex justify-between items-center hover:border-white/20 transition-colors group">
                  <div>
                    <span className="text-[10px] text-gray-500 font-heading tracking-widest uppercase mb-1 block">DROP ASSUNTO</span>
                    <h4 className="font-heading font-bold text-sm text-white uppercase tracking-wider">{d.title || d.name}</h4>
                  </div>
                  <div className="text-[10px] font-heading font-bold text-white tracking-widest uppercase group-hover:text-pupa-neon transition-colors">
                    VER DROP
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* COMMUNITY POSTS */}
        {posts.length > 0 && (
          <section>
            <div className="border-b border-white/10 pb-4 mb-6">
              <h2 className="font-heading font-bold text-sm text-white tracking-widest uppercase">COMMUNITY POSTS</h2>
            </div>
            <div className="flex flex-col gap-4">
              {posts.map(post => (
                <div key={post.id} className="bg-pupa-dark-gray border border-white/5 p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pupa-graphite rounded-full overflow-hidden flex items-center justify-center border border-white/10">
                        {post.authorProfile.avatar ? (
                          <img src={post.authorProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-500 text-xs font-heading font-bold">{post.authorProfile.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-heading font-bold text-sm text-white uppercase">{post.authorProfile.username}</h4>
                        <p className="text-[9px] text-gray-500 tracking-widest font-heading uppercase">
                          {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="font-body text-sm text-gray-300 whitespace-pre-wrap">{post.content}</p>

                  {post.dropId && (
                     <Link to={`/drop/${post.dropId}`} className="mt-2 inline-flex items-center hover:opacity-80 transition-opacity">
                        <span className="text-[9px] font-heading font-bold tracking-widest bg-white/5 px-2 py-1 text-pupa-neon border border-pupa-neon/20 uppercase">
                          DROP ASSUNTO
                        </span>
                     </Link>
                  )}
                  
                  {/* Simplistic read-only interaction metrics for the profile view */}
                  <div className="flex items-center gap-6 mt-2 pt-4 border-t border-white/5">
                    <div className={`flex items-center gap-2 ${post.hasLiked ? 'text-pupa-neon' : 'text-gray-500'}`}>
                      <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-current' : ''}`} />
                      <span className="text-[10px] font-heading tracking-widest">{post.likesCount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px] font-heading tracking-widest">{post.commentsCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
