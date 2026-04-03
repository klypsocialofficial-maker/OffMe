import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy, serverTimestamp, addDoc, deleteDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, ArrowLeft, MoreHorizontal, Trash2, Edit2, BarChart2, Heart, Repeat, MessageCircle, Share2 } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import { motion, AnimatePresence } from 'motion/react';
import CreatePostModal from '../components/CreatePostModal';
import { auth } from '../firebase';

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

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [replyToPost, setReplyToPost] = useState<any>(null);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [activeMenuReplyId, setActiveMenuReplyId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuPostId(null);
      setActiveMenuReplyId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!postId || !db) return;

    setLoading(true);
    const postRef = doc(db, 'posts', postId);
    const unsubscribePost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    });

    const repliesQuery = query(
      collection(db, 'posts'),
      where('threadId', '==', postId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeReplies = onSnapshot(repliesQuery, (snapshot) => {
      const repliesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReplies(repliesData);
    });

    return () => {
      unsubscribePost();
      unsubscribeReplies();
    };
  }, [postId]);

  const handleDeleteReply = async (replyId: string) => {
    if (!db || !userProfile) return;
    if (window.confirm('Tem certeza que deseja excluir esta resposta?')) {
      try {
        await deleteDoc(doc(db, 'posts', replyId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `posts/${replyId}`);
      }
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!db || !userProfile) return;
    if (window.confirm('Tem certeza que deseja apagar este post?')) {
      try {
        await deleteDoc(doc(db, 'posts', id));
        if (id === postId) {
          navigate(-1);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
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

  const handleEditPost = async (id: string) => {
    if (!db || !userProfile?.uid || !editContent.trim()) return;
    
    try {
      await updateDoc(doc(db, 'posts', id), {
        content: editContent.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingPost(null);
      setEditContent('');
      setActiveMenuPostId(null);
      setActiveMenuReplyId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${id}`);
    }
  };

  const handleLikePost = async (postToLike: any) => {
    if (!userProfile?.uid || !db) return;
    
    const isLiked = postToLike.likes?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', postToLike.id);
    
    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        likesCount: isLiked ? Math.max(0, (postToLike.likesCount || 0) - 1) : (postToLike.likesCount || 0) + 1
      });
      
      if (!isLiked && postToLike.authorId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: postToLike.authorId,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL || null,
          senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          type: 'like',
          postId: postToLike.id,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  const handleRepost = async (postToRepost: any) => {
    if (!userProfile?.uid || !db) return;
    
    const isReposted = postToRepost.reposts?.includes(userProfile.uid);
    const postRef = doc(db, 'posts', postToRepost.id);
    
    try {
      await updateDoc(postRef, {
        reposts: isReposted ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid),
        repostsCount: isReposted ? Math.max(0, (postToRepost.repostsCount || 0) - 1) : (postToRepost.repostsCount || 0) + 1
      });
      
      if (!isReposted && postToRepost.authorId !== userProfile.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: postToRepost.authorId,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL || null,
          senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          type: 'repost',
          postId: postToRepost.id,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-gray-600 mb-4">
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>
        <div className="bg-white p-8 rounded-2xl text-center shadow-sm">
          <p className="text-gray-500">Este post não foi encontrado ou foi removido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Main Post */}
        <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex space-x-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {post.authorPhoto ? (
                <img src={post.authorPhoto} alt={post.authorName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-full h-full p-2 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1">
                    <div className="font-bold text-lg leading-tight">{post.authorName}</div>
                    {(post.authorVerified || post.authorUsername === 'Rulio') && <VerifiedBadge />}
                  </div>
                  <div className="text-gray-500">@{post.authorUsername}</div>
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  
                  {activeMenuPostId === post.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10" onClick={(e) => e.stopPropagation()}>
                      {post.authorId === userProfile?.uid ? (
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
                      ) : (
                        <div className="px-4 py-2 text-gray-500 text-sm">Nenhuma ação disponível</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {post.replyToUsername && (
              <div className="mb-2 text-gray-500 flex items-center space-x-1">
                <span>Respondendo a</span>
                <span className="text-blue-500">@{post.replyToUsername}</span>
                {(post.replyToVerified || post.replyToUsername === 'Rulio') && <VerifiedBadge className="w-3.5 h-3.5 text-blue-500" />}
              </div>
            )}
            
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
                <p className="text-xl text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                  {post.content}
                </p>
                {post.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
              </>
            )}
            
            {post.imageUrl && (
              <div className="mt-4 rounded-2xl overflow-hidden border border-gray-100">
                <img src={post.imageUrl} alt="Post attachment" className="w-full h-auto max-h-[500px] object-cover" />
              </div>
            )}
            <div className="mt-4 py-3 border-y border-gray-50 text-gray-500 flex space-x-4 text-sm">
              <span>
                <strong className="text-gray-900">{post.repostsCount || 0}</strong> Reposts
              </span>
              <span>
                <strong className="text-gray-900">{post.likesCount || 0}</strong> Curtidas
              </span>
            </div>

            <div className="flex justify-around mt-2 py-1 text-gray-500">
              <button 
                onClick={() => {
                  setReplyToPost(post);
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center space-x-2 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50"
              >
                <MessageCircle className="w-6 h-6" />
              </button>
              <button 
                onClick={() => handleRepost(post)}
                className={`flex items-center space-x-2 transition-colors p-2 rounded-full ${post.reposts?.includes(userProfile?.uid) ? 'text-green-500 bg-green-50' : 'hover:text-green-500 hover:bg-green-50'}`}
              >
                <Repeat className={`w-6 h-6 ${post.reposts?.includes(userProfile?.uid) ? 'stroke-[3px]' : ''}`} />
              </button>
              <button 
                onClick={() => handleLikePost(post)}
                className={`flex items-center space-x-2 transition-colors p-2 rounded-full ${post.likes?.includes(userProfile?.uid) ? 'text-red-500 bg-red-50' : 'hover:text-red-500 hover:bg-red-50'}`}
              >
                <Heart className={`w-6 h-6 ${post.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
              </button>
              <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50">
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </article>

        {/* Reply Input Area */}
        <div 
          onClick={() => {
            setReplyToPost(post);
            setIsCreateModalOpen(true);
          }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-4 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Your profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-2 text-gray-400" />
            )}
          </div>
          <span className="text-gray-500 text-lg">Postar sua resposta</span>
        </div>

        {/* Conversation / Replies */}
        <div className="space-y-3">
          <h2 className="px-2 font-bold text-gray-700">Respostas</h2>
          {replies.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center shadow-sm border border-gray-100">
              <p className="text-gray-500">Nenhuma resposta ainda. Seja o primeiro a responder!</p>
            </div>
          ) : (
            (() => {
              const buildTree = (replies: any[], parentId: string | null): any[] => {
                return replies
                  .filter(reply => reply.replyToId === parentId)
                  .map(reply => ({
                    ...reply,
                    children: buildTree(replies, reply.id)
                  }));
              };

              const ReplyComponent: React.FC<{ reply: any, depth?: number }> = ({ reply, depth = 0 }) => (
                <div style={{ marginLeft: depth * 20 }}>
                  <article 
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex space-x-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/post/${reply.id}`);
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {reply.authorPhoto ? (
                        <img src={reply.authorPhoto} alt={reply.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-full h-full p-2 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className="font-bold truncate">{reply.authorName}</span>
                          {(reply.authorVerified || reply.authorUsername === 'Rulio') && <VerifiedBadge />}
                          <span className="text-gray-500 truncate text-sm">@{reply.authorUsername}</span>
                        </div>
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuReplyId(activeMenuReplyId === reply.id ? null : reply.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          
                          {activeMenuReplyId === reply.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10" onClick={(e) => e.stopPropagation()}>
                              {reply.authorId === userProfile?.uid ? (
                                <>
                                  <button 
                                    onClick={() => handleDeleteReply(reply.id)}
                                    className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50 flex items-center space-x-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Apagar resposta</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (canEditPost(reply)) {
                                        setEditingPost(reply);
                                        setEditContent(reply.content);
                                        setActiveMenuReplyId(null);
                                      } else {
                                        alert('O tempo de edição (3 minutos) expirou. Assine o Premium para editar a qualquer momento.');
                                        setActiveMenuReplyId(null);
                                      }
                                    }}
                                    className={`w-full text-left px-4 py-2 flex items-center space-x-2 ${canEditPost(reply) ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    <span>Editar resposta</span>
                                  </button>
                                </>
                              ) : (
                                <div className="px-4 py-2 text-gray-500 text-sm">Nenhuma ação disponível</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {editingPost?.id === reply.id ? (
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
                              onClick={() => handleEditPost(reply.id)}
                              disabled={!editContent.trim() || editContent === reply.content}
                              className="bg-black text-white px-4 py-1.5 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-gray-900 whitespace-pre-wrap break-words">{reply.content}</p>
                          {reply.isEdited && <span className="text-gray-400 text-xs">(editado)</span>}
                        </>
                      )}
                      
                      {reply.imageUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                          <img src={reply.imageUrl} alt="Reply attachment" className="w-full h-auto max-h-60 object-cover" />
                        </div>
                      )}
                      <div className="flex justify-between mt-3 text-gray-500 max-w-[200px]">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyToPost(reply);
                            setIsCreateModalOpen(true);
                          }}
                          className="flex items-center space-x-1 hover:text-blue-500"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">{reply.repliesCount || 0}</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRepost(reply);
                          }}
                          className={`flex items-center space-x-1 transition-colors ${reply.reposts?.includes(userProfile?.uid) ? 'text-green-500' : 'hover:text-green-500'}`}
                        >
                          <Repeat className={`w-4 h-4 ${reply.reposts?.includes(userProfile?.uid) ? 'stroke-[3px]' : ''}`} />
                          <span className="text-xs">{reply.repostsCount || 0}</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikePost(reply);
                          }}
                          className={`flex items-center space-x-1 transition-colors ${reply.likes?.includes(userProfile?.uid) ? 'text-red-500' : 'hover:text-red-500'}`}
                        >
                          <Heart className={`w-4 h-4 ${reply.likes?.includes(userProfile?.uid) ? 'fill-current' : ''}`} />
                          <span className="text-xs">{reply.likesCount || 0}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                  {reply.children.map((child: any) => (
                    <ReplyComponent key={child.id} reply={child} depth={depth + 1} />
                  ))}
                </div>
              );

              const replyTree = buildTree(replies, postId || null);
              return replyTree.map(reply => <ReplyComponent key={reply.id} reply={reply} />);
            })()
          )}
        </div>
      </div>

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
