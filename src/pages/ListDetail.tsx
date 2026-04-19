import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Users, Settings, Plus, Info } from 'lucide-react';
import PostCard from '../components/PostCard';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import UserListModal from '../components/UserListModal';

export default function ListDetail() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [list, setList] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [membersProfiles, setMembersProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (!listId || !db) return;

    const fetchList = async () => {
      const listSnap = await getDoc(doc(db, 'lists', listId));
      if (listSnap.exists()) {
        const listData = listSnap.data();
        setList({ id: listSnap.id, ...listData });
        
        if (listData.memberIds?.length > 0) {
          // Fetch members' full profiles
          const q = query(collection(db, 'users'), where('uid', 'in', listData.memberIds.slice(0, 10)));
          const snap = await getDocs(q);
          setMembersProfiles(snap.docs.map(d => d.data()));
          
          // Fetch posts from members
          const postsQ = query(
            collection(db, 'posts'),
            where('authorId', 'in', listData.memberIds),
            orderBy('createdAt', 'desc'),
            limit(40)
          );
          
          const unsubscribe = onSnapshot(postsQ, (snapshot) => {
            setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
          });
          
          return unsubscribe;
        } else {
          setLoading(false);
        }
      } else {
        navigate('/lists');
      }
    };

    fetchList();
  }, [listId, db, navigate]);

  return (
    <div className="w-full min-h-screen bg-transparent pb-20">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 p-4 flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black truncate">{list?.name || 'Carregando...'}</h1>
          <p className="text-xs text-gray-500 font-medium">@{userProfile?.username}</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {list?.description && (
        <div className="p-4 border-b border-gray-100">
          <p className="text-gray-600 text-sm">{list.description}</p>
        </div>
      )}

      <div className="flex items-center space-x-2 px-4 py-3 border-b border-gray-100 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setShowMembers(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-bold active:scale-95 transition-all"
        >
          <Users className="w-4 h-4" />
          <span>Membros ({list?.memberIds?.length || 0})</span>
        </button>
        <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-bold active:scale-95 transition-all">
          <Plus className="w-4 h-4" />
          <span>Adicionar</span>
        </button>
      </div>

      <div className="divide-y divide-black/5">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando feed da lista...</div>
        ) : posts.length > 0 ? (
          posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onLike={() => {}}
              onRepost={() => {}}
              onDelete={() => {}}
              onEdit={() => {}}
              onShare={() => {}}
              onReply={() => {}}
              onQuote={() => {}}
              onImageClick={() => {}}
              canEdit={() => false}
            />
          ))
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-black mb-1">Nenhum post aqui</p>
            <p className="text-sm">Os posts aparecerão quando os membros da lista publicarem algo.</p>
          </div>
        )}
      </div>

      {showMembers && list?.memberIds && (
        <UserListModal 
          isOpen={showMembers}
          onClose={() => setShowMembers(false)}
          title="Membros da Lista"
          uids={list.memberIds}
        />
      )}
    </div>
  );
}
