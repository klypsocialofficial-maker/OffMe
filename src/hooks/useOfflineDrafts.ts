import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { uploadToImgBB } from '../lib/imgbb';
import { awardPoints } from '../services/gamificationService';
import { handleMentions, notifyFollowers } from '../lib/notifications';
import { triggerHaptic } from './useHaptic';

export interface OfflineDraft {
  id: string;
  content: string;
  isAnonymous: boolean;
  postAudience: 'public' | 'circle';
  gifUrl: string | null;
  images: { name: string; type: string; base64: string }[];
  showPoll: boolean;
  pollOptions: string[];
  altText: string;
  createdAt: string; // ISO String
  communityId?: string | null;
  communityName?: string | null;
  replyTo?: {
    id: string;
    authorUsername: string;
    authorVerified: boolean;
    threadId: string | null;
    authorId: string | null;
    threadAuthorId: string | null;
  } | null;
  quotePost?: {
    id: string;
    content: string;
    authorName: string;
    authorId: string;
  } | null;
  isSyncing?: boolean;
}

const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

export function useOfflineDrafts() {
  const { userProfile } = useAuth();
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('klyp_cloud_drafts_sync_enabled') === 'true';
  });

  // Load from LocalStorage
  const loadDrafts = useCallback(() => {
    const stored = localStorage.getItem('klyp_offline_drafts_v1');
    if (stored) {
      try {
        setDrafts(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing stored drafts:', e);
      }
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    
    // Listen for storage changes
    const handleStorageChange = () => {
      loadDrafts();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadDrafts]);

  // Handle Online/Offline Status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerHaptic('success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      triggerHaptic('warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Synchronize drafts with userDrafts collection in Firestore
  const performCloudSync = useCallback(async () => {
    if (!navigator.onLine || !db || !userProfile?.uid) return;
    
    setIsCloudSyncing(true);
    try {
      // 1. Fetch remote user drafts
      const q = query(
        collection(db, 'userDrafts'),
        where('userId', '==', userProfile.uid)
      );
      
      const querySnapshot = await getDocs(q).catch((err) => {
        handleFirestoreError(err, OperationType.LIST, 'userDrafts');
        throw err;
      });

      const cloudDrafts: OfflineDraft[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        cloudDrafts.push({
          id: docSnap.id,
          content: data.content || '',
          isAnonymous: data.isAnonymous || false,
          postAudience: data.postAudience || 'public',
          gifUrl: data.gifUrl || null,
          images: data.images || [],
          showPoll: data.showPoll || false,
          pollOptions: data.pollOptions || [],
          altText: data.altText || '',
          createdAt: data.createdAt || new Date().toISOString(),
          communityId: data.communityId || null,
          communityName: data.communityName || null,
          replyTo: data.replyTo || null,
          quotePost: data.quotePost || null
        });
      });

      // 2. Load local drafts
      const stored = localStorage.getItem('klyp_offline_drafts_v1');
      let localDrafts: OfflineDraft[] = [];
      if (stored) {
        try {
          localDrafts = JSON.parse(stored);
        } catch (e) {
          console.error('Error parsing local drafts:', e);
        }
      }

      // 3. Merging
      const mergedMap = new Map<string, OfflineDraft>();
      localDrafts.forEach(d => mergedMap.set(d.id, d));
      cloudDrafts.forEach(cd => {
        const existing = mergedMap.get(cd.id);
        if (!existing) {
          mergedMap.set(cd.id, cd);
        } else {
          // Keep the latest one based on createdAt
          const localTime = new Date(existing.createdAt).getTime();
          const cloudTime = new Date(cd.createdAt).getTime();
          if (cloudTime > localTime) {
            mergedMap.set(cd.id, cd);
          }
        }
      });

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Save merged list locally
      localStorage.setItem('klyp_offline_drafts_v1', JSON.stringify(mergedList));
      setDrafts(mergedList);

      // 4. Update cloud with any drafts that were only local
      const cloudIds = new Set(cloudDrafts.map(d => d.id));
      for (const draft of mergedList) {
        if (!cloudIds.has(draft.id)) {
          await setDoc(doc(db, 'userDrafts', draft.id), {
            ...draft,
            userId: userProfile.uid,
          }).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `userDrafts/${draft.id}`);
          });
        }
      }
    } catch (err) {
      console.error("Cloud draft sync error:", err);
    } finally {
      setIsCloudSyncing(false);
    }
  }, [userProfile?.uid]);

  const toggleCloudSync = useCallback(async (enabled: boolean) => {
    setIsCloudSyncEnabled(enabled);
    localStorage.setItem('klyp_cloud_drafts_sync_enabled', enabled ? 'true' : 'false');
    triggerHaptic('selection');
    if (enabled && userProfile?.uid) {
      await performCloudSync();
    }
  }, [userProfile?.uid, performCloudSync]);

  // Sync on mount or when userProfile/online changes
  useEffect(() => {
    if (isCloudSyncEnabled && userProfile?.uid && isOnline) {
      performCloudSync();
    }
  }, [isCloudSyncEnabled, userProfile?.uid, isOnline, performCloudSync]);

  // Add draft
  const addDraft = useCallback(async (
    content: string,
    isAnonymous: boolean,
    postAudience: 'public' | 'circle',
    imageFiles: File[],
    pollOptions: string[],
    showPoll: boolean,
    gifUrl: string | null = null,
    altText: string = '',
    replyTo: any = null,
    quotePost: any = null,
    communityId: string | null = null,
    communityName: string | null = null
  ) => {
    triggerHaptic('selection');
    
    const convertedImages = await Promise.all(
      imageFiles.map(async (file) => ({
        name: file.name,
        type: file.type,
        base64: await fileToBase64(file),
      }))
    );

    const newDraft: OfflineDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      content,
      isAnonymous,
      postAudience,
      gifUrl,
      images: convertedImages,
      showPoll,
      pollOptions,
      altText,
      createdAt: new Date().toISOString(),
      communityId,
      communityName,
      replyTo: replyTo ? {
        id: replyTo.id,
        authorUsername: replyTo.authorUsername || '',
        authorVerified: replyTo.authorVerified || false,
        threadId: replyTo.threadId || null,
        authorId: replyTo.authorId || null,
        threadAuthorId: replyTo.threadAuthorId || replyTo.authorId || null,
      } : null,
      quotePost: quotePost ? {
        id: quotePost.id,
        content: quotePost.content || '',
        authorName: quotePost.authorName || '',
        authorId: quotePost.authorId || '',
      } : null,
    };

    setDrafts((prev) => {
      const updated = [newDraft, ...prev];
      localStorage.setItem('klyp_offline_drafts_v1', JSON.stringify(updated));
      return updated;
    });

    if (isCloudSyncEnabled && userProfile?.uid && navigator.onLine && db) {
      try {
        await setDoc(doc(db, 'userDrafts', newDraft.id), {
          ...newDraft,
          userId: userProfile.uid,
        }).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `userDrafts/${newDraft.id}`);
        });
      } catch (err) {
        console.error("Failed to sync new draft to Firestore:", err);
      }
    }

    return newDraft;
  }, [isCloudSyncEnabled, userProfile?.uid]);

  // Delete Draft
  const deleteDraft = useCallback(async (id: string) => {
    triggerHaptic('light');
    setDrafts((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem('klyp_offline_drafts_v1', JSON.stringify(updated));
      return updated;
    });

    if (isCloudSyncEnabled && userProfile?.uid && navigator.onLine && db) {
      try {
        await deleteDoc(doc(db, 'userDrafts', id)).catch((err) => {
          handleFirestoreError(err, OperationType.DELETE, `userDrafts/${id}`);
        });
      } catch (err) {
        console.error("Failed to delete draft from Firestore:", err);
      }
    }
  }, [isCloudSyncEnabled, userProfile?.uid]);

  // Sync / Upload pending drafts to Firestore
  const syncDrafts = useCallback(async () => {
    if (!navigator.onLine || isSyncing || !db) return;
    
    const stored = localStorage.getItem('klyp_offline_drafts_v1');
    if (!stored) return;
    
    let list: OfflineDraft[] = [];
    try {
      list = JSON.parse(stored);
    } catch {
      return;
    }
    
    if (list.length === 0) return;

    setIsSyncing(true);
    const updatedList = JSON.parse(JSON.stringify(list)) as OfflineDraft[];

    for (const draft of list) {
      try {
        // Mark as syncing in the state first
        const stateIdx = updatedList.findIndex(d => d.id === draft.id);
        if (stateIdx !== -1) {
          updatedList[stateIdx].isSyncing = true;
          setDrafts([...updatedList]);
          localStorage.setItem('klyp_offline_drafts_v1', JSON.stringify(updatedList));
        }

        // Upload images
        let imageUrls: string[] = draft.gifUrl ? [draft.gifUrl] : [];
        if (draft.images && draft.images.length > 0) {
          const uploads = draft.images.map(img => {
            const fileObj = base64ToFile(img.base64, img.name);
            return uploadToImgBB(fileObj);
          });
          const uploadedUrls = await Promise.all(uploads);
          imageUrls = [...imageUrls, ...uploadedUrls];
        }

        const authorId = draft.isAnonymous ? 'anonymous' : (userProfile?.uid || 'anonymous');
        const authorName = draft.isAnonymous ? 'Anônimo' : (userProfile?.displayName || '');
        const authorUsername = draft.isAnonymous ? 'anonimo' : (userProfile?.username || '');
        const authorPhoto = draft.isAnonymous ? '' : (userProfile?.photoURL || '');
        const authorVerified = draft.isAnonymous ? false : (userProfile?.isVerified || userProfile?.username === 'Rulio' || false);
        const authorPremiumTier = draft.isAnonymous ? null : (userProfile?.premiumTier || null);
        const authorPrivate = draft.isAnonymous ? false : (userProfile?.privateProfile || false);

        const postContent = draft.content.trim();
        const hashtags = postContent.match(/#[a-zA-Z0-9_À-ÿ]+/g)?.map(tag => tag.substring(1).toLowerCase()) || [];

        const postData: any = {
          content: postContent,
          hashtags,
          imageUrls,
          imageFilters: draft.images.map(() => 'none'),
          altText: draft.altText || '',
          authorId,
          authorName,
          authorUsername,
          authorPhoto,
          authorVerified,
          authorPremiumTier,
          authorPrivate,
          ownerId: userProfile?.uid || null,
          isAnonymous: draft.isAnonymous,
          privacy: draft.postAudience,
          audience: draft.postAudience === 'circle' ? (userProfile?.circleMembers || []) : [],
          expiresAt: null,
          status: 'published',
          createdAt: serverTimestamp(),
          likesCount: 0,
          repliesCount: 0,
          repostsCount: 0,
          viewCount: 0,
          likes: [],
          reposts: [],
          replyToId: draft.replyTo?.id || null,
          replyToUsername: draft.replyTo?.authorUsername || null,
          replyToVerified: draft.replyTo?.authorVerified || false,
          replyToAuthorId: draft.replyTo?.authorId || null,
          threadId: draft.replyTo?.threadId || draft.replyTo?.id || null,
          threadAuthorId: draft.replyTo?.threadAuthorId || draft.replyTo?.authorId || null,
          quotedPostId: draft.quotePost?.id || null,
          quotedPostContent: draft.quotePost?.content || null,
          quotedPostAuthor: draft.quotePost?.authorName || null,
          sharedMusic: null
        };

        if (draft.communityId) {
          postData.communityId = draft.communityId;
          postData.communityName = draft.communityName;
        }

        if (draft.showPoll && draft.pollOptions.length > 0) {
          const validOptions = draft.pollOptions.filter(opt => opt.trim() !== '');
          if (validOptions.length >= 2) {
            postData.poll = {
              options: validOptions.map(opt => ({ text: opt, votes: 0 })),
              totalVotes: 0,
              voters: []
            };
          }
        }

        // Add doc
        const newPostRef = await addDoc(collection(db, 'posts'), postData);

        // Missions and point rewards
        if (!draft.isAnonymous && userProfile?.uid) {
          try {
            const missionType = draft.replyTo ? 'reply' : 'post';
            await awardPoints(userProfile.uid, 5, missionType);
          } catch (pe) {
            console.error("Points award error:", pe);
          }

          try {
            const firstImageUrl = imageUrls[0] || null;
            await handleMentions(postContent, newPostRef.id, userProfile, firstImageUrl);
            await notifyFollowers(userProfile, postContent, firstImageUrl);
          } catch (ne) {
            console.error("Mention notify error:", ne);
          }
        }

        // Successfully synced. Remove it from tracking
        const idxToRemove = updatedList.findIndex(d => d.id === draft.id);
        if (idxToRemove !== -1) {
          updatedList.splice(idxToRemove, 1);
        }
      } catch (err) {
        console.error("Sync failed for draft:", draft.id, err);
        const idxToReset = updatedList.findIndex(d => d.id === draft.id);
        if (idxToReset !== -1) {
          updatedList[idxToReset].isSyncing = false;
        }
      }
    }

    setDrafts(updatedList);
    localStorage.setItem('klyp_offline_drafts_v1', JSON.stringify(updatedList));
    setIsSyncing(false);

    const successfulSyncsCount = list.length - updatedList.length;
    if (successfulSyncsCount > 0) {
      triggerHaptic('success');
      window.dispatchEvent(
        new CustomEvent('applet:drafts-synced', {
          detail: { count: successfulSyncsCount },
        })
      );
    }
  }, [userProfile, isSyncing]);

  // Attempt sync when coming back online
  useEffect(() => {
    if (isOnline && drafts.length > 0 && !isSyncing) {
      // Small cooldown before triggering to allow connection stabilization
      const timer = setTimeout(() => {
        syncDrafts();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, drafts.length, isSyncing, syncDrafts]);

  return {
    drafts,
    addDraft,
    deleteDraft,
    syncDrafts,
    isSyncing,
    isOnline,
    isCloudSyncEnabled,
    isCloudSyncing,
    toggleCloudSync,
    performCloudSync,
  };
}
