import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Send, Image as ImageIcon, MoreHorizontal, Trash2, Edit2, BarChart2, Plus } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useOutletContext } from 'react-router-dom';
import CreatePostModal from '../components/CreatePostModal';
import { uploadToImgBB } from '../lib/imgbb';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Home() {
  const { userProfile, logout } = useAuth();
  const { openDrawer } = useOutletContext<{ openDrawer: () => void }>();
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  useEffect(() => {
    if (!db) return;
    
    let q;
    if (activeTab === 'foryou') {
      q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    } else {
      const following = userProfile?.following || [];
      if (following.length === 0) {
        setPosts([]);
        return;
      }
      q = query(collection(db, 'posts'), where('authorId', 'in', following), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return unsubscribe;
  }, [activeTab, userProfile]);

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
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!db || !userProfile) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setActiveMenuPostId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!db || !userProfile || !editContent.trim()) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: editContent.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingPost(null);
      setEditContent('');
      setActiveMenuPostId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const canEditPost = (post: any) => {
    if (post.authorId !== userProfile?.uid) return false;
    if (userProfile?.isPremium) return true;
    
    if (!post.createdAt) return false;
    const postTime = post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postTime) / (1000 * 60);
    return diffMinutes <= 3;
  };

  return (
    <div className="w-full h-full bg-white/50 relative">
      {/* Sticky Header with Liquid Glass & Tabs */}
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 pt-[calc(0.5rem+env(safe-area-inset-top))] border-b border-gray-100/50">
        
        {/* Mobile Top Bar (Avatar + Logo) */}
        <div className="flex items-center justify-between px-4 pb-2 sm:hidden">
          <button onClick={openDrawer} className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-1.5 text-gray-400" />
            )}
          </button>
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold">
            O
          </div>
          <div className="w-8 h-8" /> {/* Spacer for centering */}
        </div>

        {/* Tabs */}
        <div className="flex w-full">
          <button 
            onClick={() => setActiveTab('foryou')} 
            className={`flex-1 hover:bg-black/5 transition-colors relative py-4 text-center font-bold ${activeTab === 'foryou' ? 'text-black' : 'text-gray-500'}`}
          >
            Para você
            {activeTab === 'foryou' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('following')} 
            className={`flex-1 hover:bg-black/5 transition-colors relative py-4 text-center font-bold ${activeTab === 'following' ? 'text-black' : 'text-gray-500'}`}
          >
            Seguindo
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

        {/* Create Post (Desktop Only) */}
        <div className="hidden sm:flex p-4 border-b border-white/20 space-x-4 bg-white/20">
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
              {activeTab === 'foryou' 
                ? "Nenhum post ainda. Seja o primeiro a postar!"
                : "Você ainda não segue ninguém ou eles não postaram nada."}
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
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold truncate">{post.authorName}</span>
                      <span className="text-gray-500 truncate">@{post.authorUsername}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-500 text-sm">
                        {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'Agora mesmo'}
                      </span>
                      {post.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-full transition-colors text-gray-500 hover:text-blue-500"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      
                      {activeMenuPostId === post.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10" onClick={(e) => e.stopPropagation()}>
                          {post.authorId === userProfile?.uid && (
                            <>
                              <button 
                                onClick={() => handleDeletePost(post.id)}
                                className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50 flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Apagar post</span>
                              </button>
                              
                              <button 
                                onClick={() => {
                                  if (canEditPost(post)) {
                                    setEditingPost(post);
                                    setEditContent(post.content);
                                    setActiveMenuPostId(null);
                                  } else {
                                    alert('O tempo de edição (3 minutos) expirou. Assine o Premium para editar a qualquer momento.');
                                    setActiveMenuPostId(null);
                                  }
                                }}
                                className={`w-full text-left px-4 py-2 flex items-center space-x-2 ${canEditPost(post) ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                <Edit2 className="w-4 h-4" />
                                <span>Editar post</span>
                              </button>
                            </>
                          )}
                          
                          <button 
                            onClick={() => {
                              if (userProfile?.isPremium) {
                                setIsStatsModalOpen(true);
                                setActiveMenuPostId(null);
                              } else {
                                alert('Estatísticas avançadas são um recurso Premium.');
                                setActiveMenuPostId(null);
                              }
                            }}
                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <BarChart2 className="w-4 h-4" />
                            <span>Ver estatísticas</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {editingPost?.id === post.id ? (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none resize-none min-h-[80px]"
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <button 
                          onClick={() => setEditingPost(null)}
                          className="px-4 py-1.5 rounded-full font-bold hover:bg-gray-100 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => handleEditPost(post.id)}
                          disabled={!editContent.trim() || editContent === post.content}
                          className="bg-black text-white px-4 py-1.5 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
                      {post.imageUrl && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                          <img src={post.imageUrl} alt="Post attachment" className="w-full h-auto max-h-96 object-cover" />
                        </div>
                      )}
                    </>
                  )}
                  
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

        {/* Mobile FAB */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors z-40"
        >
          <Plus className="w-6 h-6" />
        </button>

        <CreatePostModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          userProfile={userProfile}
          handleFirestoreError={handleFirestoreError}
          OperationType={OperationType}
        />

        {/* Stats Modal Placeholder */}
        {isStatsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-xl font-bold mb-4">Estatísticas do Post</h3>
              <div className="space-y-4 text-gray-600">
                <div className="flex justify-between border-b pb-2">
                  <span>Visualizações</span>
                  <span className="font-bold text-black">1,234</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Engajamento</span>
                  <span className="font-bold text-black">5.6%</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Cliques no perfil</span>
                  <span className="font-bold text-black">42</span>
                </div>
              </div>
              <button 
                onClick={() => setIsStatsModalOpen(false)}
                className="mt-6 w-full bg-black text-white py-2 rounded-full font-bold hover:bg-gray-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
