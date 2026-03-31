import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Calendar, MapPin, Link as LinkIcon, Edit2, Trash2, BarChart2, MessageCircle, Heart, Send, MoreHorizontal } from 'lucide-react';
import EditProfileModal from '../components/EditProfileModal';
import CreatePostModal from '../components/CreatePostModal';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayRemove, arrayUnion, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

export default function Profile() {
  const { userProfile } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyToPost, setReplyToPost] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!userProfile?.uid || !db) return;

    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile?.uid]);

  const handleLikePost = async (post: any) => {
    if (!userProfile?.uid || !db) return;
    
    const isLiked = post.likes?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', post.id);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        likesCount: isLiked ? Math.max(0, (post.likesCount || 0) - 1) : (post.likesCount || 0) + 1
      });
      
      if (!isLiked && post.authorId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: post.authorId,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderPhoto: userProfile.photoURL || null,
          type: 'like',
          postId: post.id,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!db || !userProfile?.uid) return;
    if (window.confirm('Tem certeza que deseja apagar este post?')) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
        setActiveMenuPostId(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
      }
    }
  };

  const canEditPost = (post: any) => {
    if (post.authorId !== userProfile?.uid) return false;
    if ((userProfile as any)?.isPremium) return true;
    
    if (!post.createdAt) return true;
    
    const postTime = post.createdAt.toDate ? post.createdAt.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - postTime) / (1000 * 60);
    return diffMinutes <= 3;
  };

  const handleEditPost = async (postId: string) => {
    if (!db || !userProfile?.uid || !editContent.trim()) return;
    
    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: editContent.trim()
      });
      setEditingPost(null);
      setEditContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100/50">
        <h1 className="text-xl font-bold">{userProfile.displayName}</h1>
        <p className="text-xs text-gray-500">0 posts</p>
      </div>
      
      {/* Cover Photo */}
      <div className="h-32 sm:h-48 bg-gray-200 w-full relative">
        {(userProfile as any)?.bannerURL && (
          <img src={(userProfile as any).bannerURL} alt="Banner" className="w-full h-full object-cover" />
        )}
        {/* Profile Photo */}
        <div className="absolute -bottom-16 left-4 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
          {userProfile.photoURL ? (
            <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-full h-full p-4 text-gray-400 bg-gray-100" />
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-20 pb-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{userProfile.displayName}</h2>
            <p className="text-gray-500">@{userProfile.username}</p>
          </div>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-1.5 border border-gray-300 rounded-full font-bold hover:bg-gray-50 transition-colors"
          >
            Editar perfil
          </button>
        </div>

        <p className="mt-4 text-gray-900 whitespace-pre-wrap">
          {(userProfile as any)?.bio || 'Bem-vindo ao meu perfil no OffMe! 🚀'}
        </p>

        <div className="flex flex-wrap gap-y-2 gap-x-4 mt-4 text-gray-500 text-sm">
          {(userProfile as any)?.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{(userProfile as any).location}</span>
            </div>
          )}
          {(userProfile as any)?.website && (
            <div className="flex items-center space-x-1">
              <LinkIcon className="w-4 h-4" />
              <a href={(userProfile as any).website.startsWith('http') ? (userProfile as any).website : `https://${(userProfile as any).website}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                {(userProfile as any).website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>Entrou em Março de 2026</span>
          </div>
        </div>

        <div className="flex space-x-4 mt-4 text-sm">
          <button className="hover:underline">
            <span className="font-bold text-black">{userProfile.following?.length || 0}</span> <span className="text-gray-500">Seguindo</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold text-black">{userProfile.followers?.length || 0}</span> <span className="text-gray-500">Seguidores</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button className="flex-1 py-4 font-bold text-black relative hover:bg-black/5 transition-colors">
          Posts
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-full" />
        </button>
        <button className="flex-1 py-4 font-medium text-gray-500 hover:bg-black/5 transition-colors">
          Respostas
        </button>
        <button className="flex-1 py-4 font-medium text-gray-500 hover:bg-black/5 transition-colors">
          Mídia
        </button>
        <button className="flex-1 py-4 font-medium text-gray-500 hover:bg-black/5 transition-colors">
          Curtidas
        </button>
      </div>

      <div className="pb-20">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando posts...</div>
        ) : posts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <article key={post.id} className="p-4 hover:bg-black/5 transition-colors cursor-pointer">
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-2 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 truncate">
                        <span className="font-bold text-gray-900 truncate">{post.authorName}</span>
                        <span className="text-gray-500 truncate">@{post.authorUsername}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500 flex-shrink-0">
                          {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : 'Agora'}
                        </span>
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
                                  // setIsStatsModalOpen(true);
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
                        {post.replyToUsername && (
                          <div className="mt-1 text-sm text-gray-500">
                            Respondendo a <span className="text-blue-500">@{post.replyToUsername}</span>
                          </div>
                        )}
                        <p className="mt-1 text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
                        {post.imageUrl && (
                          <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                            <img src={post.imageUrl} alt="Post attachment" className="w-full h-auto max-h-96 object-cover" />
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between mt-4 text-gray-500 max-w-md">
                      <button 
                        onClick={() => {
                          setReplyToPost(post);
                          setIsCreateModalOpen(true);
                        }}
                        className="flex items-center space-x-2 hover:text-blue-500 transition-colors group"
                      >
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
                      <button 
                        onClick={() => handleLikePost(post)}
                        className={`flex items-center space-x-2 transition-colors group ${post.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
                      >
                        <div className="p-2 group-hover:bg-red-50 rounded-full">
                          <svg className="w-5 h-5" fill={post.likes?.includes(userProfile?.uid) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
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
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Ainda não há posts.
          </div>
        )}
      </div>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
      />

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setReplyToPost(null);
        }} 
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
        replyTo={replyToPost}
      />
    </div>
  );
}
