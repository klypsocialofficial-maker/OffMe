import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { Conversation, Message, UserProfile } from '../types';

export const chatService = {
  async getOrCreateConversation(user1: UserProfile, user2: UserProfile) {
    try {
      // Sort UIDs to have a consistent ID for 1-on-1 chats
      const participants = [user1.uid, user2.uid].sort();
      const conversationId = participants.join('_');
      
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      
      if (!convSnap.exists()) {
        const newConv: any = {
          id: conversationId,
          participants,
          lastMessageAt: serverTimestamp(),
          participantInfo: {
            [user1.uid]: {
              displayName: user1.displayName,
              username: user1.username,
              photoURL: user1.photoURL
            },
            [user2.uid]: {
              displayName: user2.displayName,
              username: user2.username,
              photoURL: user2.photoURL
            }
          }
        };
        await setDoc(convRef, newConv);
        return conversationId;
      }
      
      return conversationId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'conversations');
      return null;
    }
  },

  async sendMessage(conversationId: string, senderId: string, content: string) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const messageRef = doc(messagesRef);
      
      const messageData = {
        id: messageRef.id,
        conversationId,
        senderId,
        content,
        createdAt: serverTimestamp()
      };
      
      await setDoc(messageRef, messageData);
      
      // Update conversation last message
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: senderId
      });
      
      return messageRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}/messages`);
      return null;
    }
  }
};
