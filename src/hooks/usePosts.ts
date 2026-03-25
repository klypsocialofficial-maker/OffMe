import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { Post } from '../types';

export function usePosts(userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(
      collection(db, 'posts'),
      where('parentPostId', '==', null), // Only top-level posts
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (userId) {
      q = query(
        collection(db, 'posts'),
        where('authorUid', '==', userId),
        where('parentPostId', '==', null),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (err) => {
      console.error('usePosts error:', err);
      handleFirestoreError(err, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [userId]);

  return { posts, loading };
}
