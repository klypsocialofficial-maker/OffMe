import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs } from 'firebase/firestore';
import { Post } from '../types';

export function usePosts(userId?: string, followingOnly?: boolean) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    let q;
    
    if (followingOnly && user) {
      // This is complex in Firestore without a separate collection for following posts
      // For now, we'll fetch all posts and filter in memory if the following list is small
      // OR we fetch from a 'feed' collection if we had one.
      // Since we don't have a 'feed' collection, we'll fetch all and filter for now
      // (In a real app, we'd use a cloud function to populate a user's feed)
      q = query(
        collection(db, 'posts'),
        where('parentPostId', '==', null),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    } else if (userId) {
      q = query(
        collection(db, 'posts'),
        where('authorUid', '==', userId),
        where('parentPostId', '==', null),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'posts'),
        where('parentPostId', '==', null),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];

      if (followingOnly && user) {
        // Fetch following list
        const followsSnapshot = await getDocs(query(collection(db, 'follows'), where('followerId', '==', user.uid)));
        const followingIds = followsSnapshot.docs.map(doc => doc.data().followingId);
        followingIds.push(user.uid); // Include own posts
        postsData = postsData.filter(post => followingIds.includes(post.authorUid));
      }

      setPosts(postsData);
      setLoading(false);
    }, (err) => {
      console.error('usePosts error:', err);
      handleFirestoreError(err, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [userId, followingOnly, user?.uid]);

  return { posts, loading };
}
