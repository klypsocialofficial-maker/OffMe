import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, collection, query, where, orderBy, getDoc } from 'firebase/firestore';
import { Post, UserProfile } from '../types';
import PostCard from './PostCard';
import PostForm from './PostForm';
import { ArrowLeft, Loader2, MessageCircle, Quote as QuoteIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const PostView: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [quotes, setQuotes] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'replies' | 'quotes'>('replies');

  useEffect(() => {
    if (!postId) return;

    setLoading(true);
    const unsubscribePost = onSnapshot(doc(db, 'posts', postId), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() } as Post);
      } else {
        setPost(null);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `posts/${postId}`);
      setLoading(false);
    });

    const qReplies = query(
      collection(db, 'posts'),
      where('parentPostId', '==', postId)
    );
    const unsubscribeReplies = onSnapshot(qReplies, (snapshot) => {
      const repliesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      repliesData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setReplies(repliesData);
    });

    const qQuotes = query(
      collection(db, 'posts'),
      where('quotedPostId', '==', postId)
    );
    const unsubscribeQuotes = onSnapshot(qQuotes, (snapshot) => {
      const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      quotesData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setQuotes(quotesData);
    });

    return () => {
      unsubscribePost();
      unsubscribeReplies();
      unsubscribeQuotes();
    };
  }, [postId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-2xl font-black mb-2">Post not found</h2>
        <p className="text-gray-500 mb-6">The post you're looking for doesn't exist or has been deleted.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto border-x border-gray-100 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">Post</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Thread</p>
          </div>
        </div>

        {/* Main Post */}
        <div className="bg-white">
          <PostCard post={post} isDetailed={true} />
        </div>

        {/* Reply Form */}
        <div className="border-b border-gray-100">
          <PostForm replyToPost={post} noBorder={true} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 sticky top-[65px] bg-white/80 backdrop-blur-md z-10 px-2">
          <button
            onClick={() => setActiveTab('replies')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
              activeTab === 'replies' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle className={cn("w-4 h-4", activeTab === 'replies' ? "text-blue-500" : "text-gray-300")} />
              Replies <span className="opacity-50">({replies.length})</span>
            </div>
            {activeTab === 'replies' && (
              <motion.div
                layoutId="activeTabPostView"
                className="absolute bottom-0 left-4 right-4 h-1 bg-black rounded-full"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
              activeTab === 'quotes' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <QuoteIcon className={cn("w-4 h-4", activeTab === 'quotes' ? "text-purple-500" : "text-gray-300")} />
              Quotes <span className="opacity-50">({quotes.length})</span>
            </div>
            {activeTab === 'quotes' && (
              <motion.div
                layoutId="activeTabPostView"
                className="absolute bottom-0 left-4 right-4 h-1 bg-black rounded-full"
              />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="pb-20 bg-gray-50/10">
          <AnimatePresence mode="wait">
            {activeTab === 'replies' ? (
              <motion.div
                key="replies"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="divide-y divide-gray-50"
              >
                {replies.length > 0 ? (
                  replies.map((reply, index) => (
                    <PostCard 
                      key={reply.id} 
                      post={reply} 
                      showThreadLine={index < replies.length - 1} 
                    />
                  ))
                ) : (
                  <div className="p-20 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-gray-200" />
                    </div>
                    <div>
                      <p className="text-black font-black uppercase tracking-widest text-xs mb-1">No replies yet</p>
                      <p className="text-gray-400 text-sm font-medium">Be the first to share your thoughts!</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="quotes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="divide-y divide-gray-50"
              >
                {quotes.length > 0 ? (
                  quotes.map((quote) => <PostCard key={quote.id} post={quote} />)
                ) : (
                  <div className="p-20 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                      <QuoteIcon className="w-8 h-8 text-gray-200" />
                    </div>
                    <div>
                      <p className="text-black font-black uppercase tracking-widest text-xs mb-1">No quotes yet</p>
                      <p className="text-gray-400 text-sm font-medium">This post hasn't been quoted yet.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PostView;
