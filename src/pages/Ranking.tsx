import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getLevelInfo } from '../lib/levels';
import { useAuthStore } from '../store/useAuthStore';

interface RankedUser {
  id: string;
  username: string;
  points: number;
}

// NOTE: rankingPoints/publicPoints != saldo financeiro mutável pelo frontend. O saldo real fica em profiles.points.
export default function Ranking() {
  const { user, profile } = useAuthStore();
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      try {
        const q = query(
          collection(db, 'publicProfiles'),
          orderBy('rankingPoints', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        const users: RankedUser[] = [];
        snap.forEach(d => {
          const data = d.data();
          users.push({
            id: d.id,
            username: data.username || 'anon',
            points: data.rankingPoints || 0
          });
        });
        setRankedUsers(users);
      } catch (err) {
        console.error('Error fetching ranking:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRanking();
  }, []);

  const myRank = rankedUsers.findIndex(u => u.id === user?.uid);

  return (
    <div className="w-full min-h-screen pt-20 md:pt-32 px-6 md:px-12 pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-heading font-bold text-white tracking-wider mb-2 uppercase">RANKING GLOBAL</h1>
        <p className="text-gray-400 font-body text-xs tracking-widest uppercase mb-12">OS MAIORES MOVIMENTADORES DA PUPA.</p>

        {myRank !== -1 && profile && (
          <div className="bg-pupa-dark-gray border border-white/5 p-6 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-heading font-bold text-3xl text-pupa-neon">#{myRank + 1}</span>
              <div>
                <span className="font-heading font-bold text-white block uppercase">{profile.username}</span>
                <span className="text-[10px] text-gray-500 font-heading tracking-widest uppercase">VOCÊ</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-heading font-bold text-white block">{profile.points} PTS</span>
              <span className="text-[10px] text-gray-500 font-heading tracking-widest uppercase">{getLevelInfo(profile.points).currentLevel.name}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-[10px] text-gray-500 font-heading tracking-widest uppercase animate-pulse">CARREGANDO RANKING...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {rankedUsers.map((u, i) => {
              const level = getLevelInfo(u.points).currentLevel.name;
              return (
                <div key={u.id} className="bg-pupa-dark-gray border border-white/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`font-heading font-bold w-8 ${i < 3 ? 'text-white' : 'text-gray-500'}`}>#{i + 1}</span>
                    <div>
                      <span className="font-heading font-bold text-white block uppercase">{u.username}</span>
                      <span className="text-[9px] text-gray-500 font-heading tracking-widest uppercase">{level}</span>
                    </div>
                  </div>
                  <span className="font-heading font-bold text-white">{u.points} PTS</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
