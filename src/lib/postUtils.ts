import { collection, query, where, getDocs, doc, writeBatch, deleteDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Deletes a post and cleans up all related documents such as replies,
 * reposts, relevant notifications, and bookmarks of other users.
 *
 * @param postId {string} The ID of the post being deleted.
 */
export async function deletePostAndRelationships(postId: string): Promise<void> {
  if (!db) {
    throw new Error('Database connection is not available');
  }

  // Use Firestore writeBatch for atomicity and speed.
  // We commit chunks if they reach certain limits (limit of 500 operations per batch).
  let batch = writeBatch(db);
  let operationsCount = 0;

  const commitBatchIfNeeded = async () => {
    if (operationsCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      operationsCount = 0;
    }
  };

  try {
    // 1. Find and delete all direct REPOSTS: where('repostedPostId', '==', postId)
    const repostQuery = query(collection(db, 'posts'), where('repostedPostId', '==', postId));
    const repostSnapshot = await getDocs(repostQuery);
    for (const repostDoc of repostSnapshot.docs) {
      batch.delete(doc(db, 'posts', repostDoc.id));
      operationsCount++;
      await commitBatchIfNeeded();
    }

    // 2. Find and delete all REPLIES in the thread where:
    //    - threadId === postId (all nested comments in the thread)
    //    - replyToId === postId (direct replies)
    const repliesQuery1 = query(collection(db, 'posts'), where('threadId', '==', postId));
    const repliesSnapshot1 = await getDocs(repliesQuery1);
    for (const replyDoc of repliesSnapshot1.docs) {
      batch.delete(doc(db, 'posts', replyDoc.id));
      operationsCount++;
      await commitBatchIfNeeded();
    }

    const repliesQuery2 = query(collection(db, 'posts'), where('replyToId', '==', postId));
    const repliesSnapshot2 = await getDocs(repliesQuery2);
    for (const replyDoc of repliesSnapshot2.docs) {
      // Avoid duplicate delete operations in the same batch
      const alreadyDeleted = repliesSnapshot1.docs.some(d => d.id === replyDoc.id);
      if (!alreadyDeleted) {
        batch.delete(doc(db, 'posts', replyDoc.id));
        operationsCount++;
        await commitBatchIfNeeded();
      }
    }

    // 3. Find and delete related NOTIFICATIONS (where postId or parentPostId refers to the deleted post)
    const notificationQuery1 = query(collection(db, 'notifications'), where('postId', '==', postId));
    const notificationSnapshot1 = await getDocs(notificationQuery1);
    for (const notifDoc of notificationSnapshot1.docs) {
      batch.delete(doc(db, 'notifications', notifDoc.id));
      operationsCount++;
      await commitBatchIfNeeded();
    }

    const notificationQuery2 = query(collection(db, 'notifications'), where('parentPostId', '==', postId));
    const notificationSnapshot2 = await getDocs(notificationQuery2);
    for (const notifDoc of notificationSnapshot2.docs) {
      const alreadyDeleted = notificationSnapshot1.docs.some(d => d.id === notifDoc.id);
      if (!alreadyDeleted) {
        batch.delete(doc(db, 'notifications', notifDoc.id));
        operationsCount++;
        await commitBatchIfNeeded();
      }
    }

    // 4. BOOKMARKS: Remove the postId from any user's bookmarks list
    const bookmarksQuery = query(collection(db, 'users'), where('bookmarks', 'array-contains', postId));
    const bookmarksSnapshot = await getDocs(bookmarksQuery);
    for (const userDoc of bookmarksSnapshot.docs) {
      batch.update(doc(db, 'users', userDoc.id), {
        bookmarks: arrayRemove(postId)
      });
      operationsCount++;
      await commitBatchIfNeeded();
    }

    // 5. Delete the main post itself
    batch.delete(doc(db, 'posts', postId));
    operationsCount++;

    // Commit any outstanding operations
    if (operationsCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error during batch deletion of post relationships:', error);
    // Secure Fallback: ensure that we at least delete the main post document if something fails
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (fallbackError) {
      console.error('Fallback deletion failed:', fallbackError);
      throw fallbackError;
    }
  }
}
