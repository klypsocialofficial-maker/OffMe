import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
  bannerURL?: string;
  bio?: string;
  createdAt: Timestamp;
  role?: 'user' | 'admin';
  followersCount: number;
  followingCount: number;
  postsCount: number;
  interests?: { [topic: string]: number };
  interactions?: { [userId: string]: number };
}

export type User = UserProfile;

export type NotificationType = 'like' | 'follow' | 'reply' | 'repost' | 'quote';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderPhoto?: string;
  type: NotificationType;
  postId?: string;
  postContent?: string;
  createdAt: Timestamp;
  read: boolean;
}

export interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorUsername: string;
  authorPhoto?: string;
  content: string;
  createdAt: Timestamp;
  likesCount: number;
  repostsCount: number;
  repliesCount: number;
  quotesCount: number;
  parentPostId?: string | null;
  repostedPostId?: string | null;
  quotedPostId?: string | null;
  type: 'post' | 'reply' | 'repost' | 'quote';
  imageUrl?: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  scheduledFor?: Timestamp;
  communityId?: string;
}

export interface Like {
  userId: string;
  postId: string;
  createdAt: Timestamp;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Timestamp;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt: Timestamp;
  lastMessageSenderId?: string;
  participantInfo?: {
    [userId: string]: {
      displayName: string;
      username: string;
      photoURL?: string;
    }
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Timestamp;
}
