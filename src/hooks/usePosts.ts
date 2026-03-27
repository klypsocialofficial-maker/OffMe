import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { Post, UserProfile } from '../types';

export interface PostFilters {
  hasMedia?: boolean;
  hasLocation?: boolean;
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
}

export function usePosts(userId?: string, followingOnly?: boolean, filters?: PostFilters) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    let q;
    
    if (followingOnly && user) {
      q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
    } else if (userId) {
      // To avoid requiring a composite index on authorUid and createdAt,
      // we query by authorUid and sort in memory.
      // Note: This might not get the absolute newest if the user has > 100 posts,
      // but it avoids the "missing index" error which breaks the profile.
      q = query(
        collection(db, 'posts'),
        where('authorUid', '==', userId),
        limit(100)
      );
    } else {
      q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(200) // Fetch more for scoring
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];

      // Sort in memory for the userId query
      if (userId) {
        postsData.sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return dateB - dateA;
        });
      }

      // Filter out replies in memory to avoid composite index requirement
      postsData = postsData.filter(post => !post.parentPostId);

      // Apply custom filters
      if (filters) {
        if (filters.hasMedia) {
          postsData = postsData.filter(post => !!post.imageUrl);
        }
        if (filters.hasLocation) {
          postsData = postsData.filter(post => !!post.location);
        }
        if (filters.dateRange) {
          const { start, end } = filters.dateRange;
          postsData = postsData.filter(post => {
            if (!post.createdAt) return false;
            const postDate = post.createdAt.toDate();
            if (start && postDate < start) return false;
            
            // For end date, we want to include the whole day, so we adjust the end date to the end of the day
            if (end) {
              const endOfDay = new Date(end);
              endOfDay.setHours(23, 59, 59, 999);
              if (postDate > endOfDay) return false;
            }
            return true;
          });
        }
      }

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
  }, [userId, followingOnly, user?.uid, filters?.hasMedia, filters?.hasLocation, filters?.dateRange?.start, filters?.dateRange?.end]);

  return { posts, loading };
}
