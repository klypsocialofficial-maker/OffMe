import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  addDoc,
  getDoc
} from 'firebase/firestore';
import { NotificationType, UserProfile, Post } from '../types';

export const socialService = {
  async followUser(followerId: string, followingId: string, followerProfile: UserProfile) {
    try {
      const followId = `${followerId}_${followingId}`;
      await setDoc(doc(db, 'follows', followId), {
        followerId,
        followingId,
        createdAt: serverTimestamp()
      });

      // Update counts
      await updateDoc(doc(db, 'users', followerId), {
        followingCount: increment(1)
      });
      await updateDoc(doc(db, 'users', followingId), {
        followersCount: increment(1)
      });

      // Create notification
      await this.createNotification({
        recipientId: followingId,
        senderId: followerId,
        senderName: followerProfile.displayName,
        senderUsername: followerProfile.username,
        senderPhoto: followerProfile.photoURL,
        type: 'follow'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'follows');
    }
  },

  async unfollowUser(followerId: string, followingId: string) {
    try {
      const followId = `${followerId}_${followingId}`;
      await deleteDoc(doc(db, 'follows', followId));

      // Update counts
      await updateDoc(doc(db, 'users', followerId), {
        followingCount: increment(-1)
      });
      await updateDoc(doc(db, 'users', followingId), {
        followersCount: increment(-1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'follows');
    }
  },

  async likePost(userId: string, post: Post, userProfile: UserProfile) {
    try {
      const likeId = `${userId}_${post.id}`;
      await setDoc(doc(db, 'likes', likeId), {
        userId,
        postId: post.id,
        createdAt: serverTimestamp()
      });

      // Update post count
      await updateDoc(doc(db, 'posts', post.id), {
        likesCount: increment(1)
      });

      // Create notification if not self-like
      if (userId !== post.authorUid) {
        await this.createNotification({
          recipientId: post.authorUid,
          senderId: userId,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL,
          type: 'like',
          postId: post.id,
          postContent: post.content
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'likes');
    }
  },

  async unlikePost(userId: string, postId: string) {
    try {
      const likeId = `${userId}_${postId}`;
      await deleteDoc(doc(db, 'likes', likeId));

      // Update post count
      await updateDoc(doc(db, 'posts', postId), {
        likesCount: increment(-1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'likes');
    }
  },

  async repostPost(userId: string, post: Post, userProfile: UserProfile) {
    try {
      const repostRef = doc(collection(db, 'posts'));
      const repostData: Post = {
        id: repostRef.id,
        authorUid: userId,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL,
        content: '',
        createdAt: serverTimestamp() as any,
        likesCount: 0,
        repostsCount: 0,
        repliesCount: 0,
        repostedPostId: post.id
      };

      await setDoc(repostRef, repostData);

      // Update original post count
      await updateDoc(doc(db, 'posts', post.id), {
        repostsCount: increment(1)
      });

      // Update user posts count
      await updateDoc(doc(db, 'users', userId), {
        postsCount: increment(1)
      });

      // Create notification if not self-repost
      if (userId !== post.authorUid) {
        await this.createNotification({
          recipientId: post.authorUid,
          senderId: userId,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL,
          type: 'repost',
          postId: post.id,
          postContent: post.content
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'posts');
    }
  },

  async unrepostPost(userId: string, repostId: string, originalPostId: string) {
    try {
      await deleteDoc(doc(db, 'posts', repostId));

      // Update original post count
      await updateDoc(doc(db, 'posts', originalPostId), {
        repostsCount: increment(-1)
      });

      // Update user posts count
      await updateDoc(doc(db, 'users', userId), {
        postsCount: increment(-1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'posts');
    }
  },

  async createNotification(data: {
    recipientId: string;
    senderId: string;
    senderName: string;
    senderUsername: string;
    senderPhoto?: string;
    type: NotificationType;
    postId?: string;
    postContent?: string;
  }) {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        ...data,
        id: notificationRef.id,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  },

  async markNotificationAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  }
};
