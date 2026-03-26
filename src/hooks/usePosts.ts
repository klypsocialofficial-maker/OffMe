import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { Post, UserProfile } from '../types';

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
        limit(150) // Fetch more for scoring
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
      } else if (!userId && user) {
        // Personalize 'For You' feed
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            const interests = userData.interests || {};
            const interactions = userData.interactions || {};

            postsData = postsData.map(post => {
              let score = 0;
              
              // 1. Interaction Score (most interacted authors)
              if (interactions[post.authorUid]) {
                score += interactions[post.authorUid] * 2;
              }

              // 2. Interest Score (topic similarity)
              const topics = post.content.match(/#\w+/g) || [];
              const words = post.content.toLowerCase().split(/\W+/).filter(w => w.length > 3);
              const allTopics = [...new Set([...topics, ...words])];

              allTopics.forEach(topic => {
                if (interests[topic]) {
                  score += interests[topic];
                }
              });

              // 3. Popularity Score
              score += (post.likesCount || 0) * 0.5;
              score += (post.repostsCount || 0) * 1;

              // 4. Recency decay (posts are already ordered by desc, but we can add a small boost)
              // Since they are already ordered, we don't strictly need this unless we want to mix them up.
              
              return { ...post, score };
            }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
            .slice(0, 50); // Return top 50
          }
        } catch (error) {
          console.error('Error personalizing feed:', error);
        }
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
