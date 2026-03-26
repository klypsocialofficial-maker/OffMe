import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, collection, query, where, orderBy, getDoc } from 'firebase/firestore';
import { Post, UserProfile } from '../types';
import PostCard from './PostCard';
import PostForm from './PostForm';
import { ArrowLeft, Loader2, MessageCircle, Quote as QuoteIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
      where('parentPostId', '==', postId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeReplies = onSnapshot(qReplies, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    });

    const qQuotes = query(
      collection(db, 'posts'),
      where('quotedPostId', '==', postId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeQuotes = onSnapshot(qQuotes, (snapshot) => {
      setQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
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

      <div className="max-w-2xl mx-auto">
        {/* Main Post */}
        <div className="border-b-4 border-gray-50">
          <PostCard post={post} />
        </div>

        {/* Reply Form */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 ml-2">Post your reply</h3>
          <PostForm replyToPost={post} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('replies')}
            className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors relative ${
              activeTab === 'replies' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Replies ({replies.length})
            </div>
            {activeTab === 'replies' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-black"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors relative ${
              activeTab === 'quotes' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <QuoteIcon className="w-4 h-4" />
              Quotes ({quotes.length})
            </div>
            {activeTab === 'quotes' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-black"
              />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="pb-20">
          <AnimatePresence mode="wait">
            {activeTab === 'replies' ? (
              <motion.div
                key="replies"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="divide-y divide-gray-50"
              >
                {replies.length > 0 ? (
                  replies.map((reply) => <PostCard key={reply.id} post={reply} />)
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-400 font-medium">No replies yet. Be the first to reply!</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="quotes"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="divide-y divide-gray-50"
              >
                {quotes.length > 0 ? (
                  quotes.map((quote) => <PostCard key={quote.id} post={quote} />)
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-400 font-medium">No quotes yet.</p>
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
