import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Notification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, UserPlus, MessageCircle, Repeat2, Loader2, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { socialService } from '../services/socialService';

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
      setLoading(false);

      // Mark unread as read
      notifs.forEach(n => {
        if (!n.read) {
          socialService.markNotificationAsRead(n.id);
        }
      });
    }, (err) => {
      console.error('Notifications error:', err);
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-current" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'reply': return <MessageCircle className="w-5 h-5 text-green-500" />;
      case 'repost': return <Repeat2 className="w-5 h-5 text-purple-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case 'like': return 'liked your post';
      case 'follow': return 'started following you';
      case 'reply': return 'replied to your post';
      case 'repost': return 'reposted your post';
      default: return 'interacted with you';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-black">Notifications</h1>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Notifications...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => n.postId && navigate(`/post/${n.postId}`)}
                className={cn(
                  "p-4 sm:p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4",
                  !n.read && "bg-blue-50/30"
                )}
              >
                <div className="mt-1">{getIcon(n.type)}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={n.senderPhoto || 'https://picsum.photos/seed/user/100/100'}
                      alt={n.senderName}
                      className="w-8 h-8 rounded-full object-cover border border-gray-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-wrap items-center gap-x-1">
                      <span className="font-black text-black text-sm">{n.senderName}</span>
                      <span className="text-gray-500 text-sm">{getMessage(n)}</span>
                    </div>
                  </div>
                  {n.postContent && (
                    <p className="text-sm text-gray-400 line-clamp-2 italic">"{n.postContent}"</p>
                  )}
                  <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                    {formatDistanceToNow(n.createdAt.toDate())} ago
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center mb-6">
              <Bell className="w-10 h-10 text-gray-200" />
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">No notifications yet</h2>
            <p className="text-gray-400 font-medium">When people interact with you, you'll see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
