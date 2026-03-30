import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home as HomeIcon, Search, Bell, Mail, User as UserIcon, Send, Image as ImageIcon } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Home() {
  const { userProfile, logout } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!db) return;
    
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });

    return unsubscribe;
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !userProfile || !db) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'posts'), {
        content: newPost,
        authorId: userProfile.uid,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL,
        createdAt: serverTimestamp(),
        likesCount: 0,
        repliesCount: 0
      });
      setNewPost('');
    } catch (error) {
      console.error("Error adding post: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-900 flex justify-center relative">
      {/* Decorative background blobs for Home */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/10 blur-[120px] pointer-events-none" />
      
      {/* Sidebar Navigation */}
      <header className="hidden sm:flex flex-col w-64 border-r border-white/20 px-4 py-6 sticky top-0 h-screen liquid-glass-card z-20">
        <div className="flex items-center mb-8 px-4">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-xl">
            O
          </div>
          <span className="ml-3 font-bold text-xl tracking-tight">OffMe</span>
        </div>
        
        <nav className="flex-1 space-y-2 mt-8">
          <a href="#" className="flex items-center space-x-4 px-4 py-3 bg-black/5 rounded-2xl font-bold transition-all hover:bg-black/10">
            <HomeIcon className="w-6 h-6" />
            <span className="text-lg">Início</span>
          </a>
          <a href="#" className="flex items-center space-x-4 px-4 py-3 hover:bg-black/5 rounded-2xl transition-all">
            <Search className="w-6 h-6" />
            <span className="text-lg">Explorar</span>
          </a>
          <a href="#" className="flex items-center space-x-4 px-4 py-3 hover:bg-black/5 rounded-2xl transition-all">
            <Bell className="w-6 h-6" />
            <span className="text-lg">Notificações</span>
          </a>
          <a href="#" className="flex items-center space-x-4 px-4 py-3 hover:bg-black/5 rounded-2xl transition-all">
            <Mail className="w-6 h-6" />
            <span className="text-lg">Mensagens</span>
          </a>
          <a href="#" className="flex items-center space-x-4 px-4 py-3 hover:bg-black/5 rounded-2xl transition-all">
            <UserIcon className="w-6 h-6" />
            <span className="text-lg">Perfil</span>
          </a>
        </nav>

        <div className="mt-auto">
          <button 
            onClick={logout}
            className="flex items-center space-x-4 px-4 py-3 w-full hover:bg-red-500/10 rounded-2xl transition-all text-red-500"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-lg font-medium">Sair</span>
          </button>
          
          {userProfile && (
            <div className="mt-4 flex items-center px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-full h-full p-2 text-gray-400" />
                )}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="font-bold text-sm truncate">{userProfile.displayName}</p>
                <p className="text-gray-500 text-sm truncate">@{userProfile.username}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Feed */}
      <main className="w-full max-w-2xl min-h-[100dvh] pb-24 sm:pb-0 liquid-glass-card z-10">
        <div className="sticky top-0 bg-white/40 backdrop-blur-xl z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <h1 className="text-xl font-bold">Início</h1>
        </div>

        {/* Create Post */}
        <div className="p-4 border-b border-white/20 flex space-x-4 bg-white/20">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-2 text-gray-400" />
            )}
          </div>
          <form onSubmit={handlePost} className="flex-1">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="O que está acontecendo?"
              className="w-full bg-transparent text-xl outline-none resize-none min-h-[80px] placeholder-gray-500"
            />
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/20">
              <div className="flex space-x-2 text-blue-500">
                <button type="button" className="p-2 hover:bg-blue-500/10 rounded-full transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!newPost.trim() || loading}
                className="bg-black/90 text-white px-6 py-2 rounded-full font-bold hover:bg-black disabled:opacity-50 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Postar
              </button>
            </div>
          </form>
        </div>

        {/* Posts List */}
        <div>
          {posts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum post ainda. Seja o primeiro a postar!
            </div>
          ) : (
            posts.map(post => (
              <article key={post.id} className="p-4 border-b border-white/20 hover:bg-white/30 transition-all cursor-pointer flex space-x-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {post.authorPhoto ? (
                    <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-full h-full p-2 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold truncate">{post.authorName}</span>
                    <span className="text-gray-500 truncate">@{post.authorUsername}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500 text-sm">
                      {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'Agora mesmo'}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
                  
                  <div className="flex justify-between mt-4 text-gray-500 max-w-md">
                    <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors group">
                      <div className="p-2 group-hover:bg-blue-50 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                      </div>
                      <span className="text-sm">{post.repliesCount || 0}</span>
                    </button>
                    <button className="flex items-center space-x-2 hover:text-green-500 transition-colors group">
                      <div className="p-2 group-hover:bg-green-50 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                      </div>
                    </button>
                    <button className="flex items-center space-x-2 hover:text-red-500 transition-colors group">
                      <div className="p-2 group-hover:bg-red-50 rounded-full">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                      </div>
                      <span className="text-sm">{post.likesCount || 0}</span>
                    </button>
                    <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors group">
                      <div className="p-2 group-hover:bg-blue-50 rounded-full">
                        <Send className="w-5 h-5" />
                      </div>
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-xl flex justify-around p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 shadow-[0_-8px_32px_0_rgba(0,0,0,0.05)]">
        <a href="#" className="p-2 text-black"><HomeIcon className="w-6 h-6" /></a>
        <a href="#" className="p-2 text-gray-500"><Search className="w-6 h-6" /></a>
        <a href="#" className="p-2 text-gray-500"><Bell className="w-6 h-6" /></a>
        <a href="#" className="p-2 text-gray-500"><Mail className="w-6 h-6" /></a>
      </nav>
    </div>
  );
}
