import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Image as ImageIcon, X, BarChart2, Film, Ghost, Clock, Users, Plus, Calendar, Music, Sparkles } from 'lucide-react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToImgBB, optimizeImage } from '../lib/imgbb';
import { awardPoints, trackMissionProgress } from '../services/gamificationService';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';
import LazyImage from './LazyImage';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { getDefaultAvatar } from '../lib/avatar';
import { triggerHaptic } from '../hooks/useHaptic';
import { Grid } from '@giphy/react-components';
import { handleMentions, sendPushNotification, notifyFollowers } from '../lib/notifications';
import { suggestPostContent } from '../services/aiService';
import { useOfflineDrafts } from '../hooks/useOfflineDrafts';

const gf = new GiphyFetch('rJC35Qp0ILjTI6mBlDGRcKCNnCucBBYn');

const FILTER_STYLES: Record<string, string> = {
  none: '',
  sepia: 'sepia(0.85)',
  grayscale: 'grayscale(1)',
  contrast: 'contrast(1.65)',
  bleach: 'contrast(1.4) saturate(0.6)'
};

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  handleFirestoreError: (error: unknown, op: any, path: string) => void;
  OperationType: any;
  replyTo?: any;
  quotePost?: any;
  isAnonymousDefault?: boolean;
  communityId?: string;
  communityName?: string;
  sharedMusic?: {
    id: string;
    title: string;
    artist: string;
    artwork: string;
    previewUrl: string;
    spotifyUrl: string;
  } | null;
}

export default function CreatePostModal({ 
  isOpen, 
  onClose, 
  userProfile, 
  handleFirestoreError, 
  OperationType, 
  replyTo, 
  quotePost, 
  isAnonymousDefault = false,
  communityId,
  communityName,
  sharedMusic = null
}: CreatePostModalProps) {
  const { addDraft } = useOfflineDrafts();
  const [content, setContent] = useState('');
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFilters, setImageFilters] = useState<string[]>([]);
  const [imageStats, setImageStats] = useState<{
    originalName: string;
    originalSize: number;
    optimizedSize: number;
    savedPercent: number;
  }[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [altText, setAltText] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnonymous, setIsAnonymous] = useState(isAnonymousDefault);
  const [postAudience, setPostAudience] = useState<'public' | 'circle'>('public');

  // Threads state
  const [threadPosts, setThreadPosts] = useState<{
    content: string, 
    imageFiles: File[], 
    imagePreviews: string[], 
    imageFilters: string[],
    gifUrl: string | null, 
    altText?: string
  }[]>([]);

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // GIF state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'mention' | 'hashtag' | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Draft autosave states and helpers
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);

  // Automatically hide the "restored" message after 5 seconds
  useEffect(() => {
    if (showRestoredMessage) {
      const timer = setTimeout(() => {
        setShowRestoredMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showRestoredMessage]);

  // Synchronous refs to prevent stale closures during navigation/unmounting auto-saves
  const contentRef = useRef(content);
  const isAnonymousRef = useRef(isAnonymous);
  const postAudienceRef = useRef(postAudience);
  const imageFilesRef = useRef(imageFiles);
  const pollOptionsRef = useRef(pollOptions);
  const showPollRef = useRef(showPoll);
  const gifUrlRef = useRef(gifUrl);
  const altTextRef = useRef(altText);
  const isDraftLoadedRef = useRef(isDraftLoaded);
  const hasSubmittedOrSaved = useRef(false);

  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { isAnonymousRef.current = isAnonymous; }, [isAnonymous]);
  useEffect(() => { postAudienceRef.current = postAudience; }, [postAudience]);
  useEffect(() => { imageFilesRef.current = imageFiles; }, [imageFiles]);
  useEffect(() => { pollOptionsRef.current = pollOptions; }, [pollOptions]);
  useEffect(() => { showPollRef.current = showPoll; }, [showPoll]);
  useEffect(() => { gifUrlRef.current = gifUrl; }, [gifUrl]);
  useEffect(() => { altTextRef.current = altText; }, [altText]);
  useEffect(() => { isDraftLoadedRef.current = isDraftLoaded; }, [isDraftLoaded]);

  const autoSaveDraftIfNeeded = async () => {
    if (hasSubmittedOrSaved.current || !isDraftLoadedRef.current) return;

    const currentContent = contentRef.current;
    const currentGifUrl = gifUrlRef.current;
    const currentShowPoll = showPollRef.current;
    const currentImageFiles = imageFilesRef.current;

    const hasAnyContent = currentContent.trim() || currentGifUrl || currentShowPoll || (currentImageFiles && currentImageFiles.length > 0);

    if (!hasAnyContent) return;

    hasSubmittedOrSaved.current = true;

    try {
      const validPollOptions = pollOptionsRef.current.filter(opt => opt.trim() !== '');
      const hasValidPoll = currentShowPoll && validPollOptions.length >= 2;

      await addDraft(
        currentContent,
        isAnonymousRef.current,
        postAudienceRef.current,
        currentImageFiles,
        validPollOptions,
        hasValidPoll,
        currentGifUrl,
        altTextRef.current,
        replyTo,
        quotePost,
        communityId,
        communityName
      );

      const composerKey = getDraftKey();
      localStorage.removeItem(composerKey);

      setContent('');
      setImageFiles([]);
      setImagePreviews([]);
      setImageFilters([]);
      setGifUrl(null);
      setThreadPosts([]);
      setShowPoll(false);
      setPollOptions(['', '']);
      setAltText('');

      window.dispatchEvent(new CustomEvent('applet:draft-autosaved'));
    } catch (err) {
      console.error("Auto-save draft failed:", err);
    }
  };

  // Run autoSaveDraftIfNeeded on unmount (navigating away) and when isOpen changes to false
  useEffect(() => {
    return () => {
      autoSaveDraftIfNeeded();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      autoSaveDraftIfNeeded();
    }
  }, [isOpen]);

  const getDraftKey = () => {
    if (replyTo) {
      return `klyp_post_composer_draft_reply_${replyTo.id}`;
    }
    if (quotePost) {
      return `klyp_post_composer_draft_quote_${quotePost.id}`;
    }
    if (communityId) {
      return `klyp_post_composer_draft_community_${communityId}`;
    }
    return 'klyp_post_composer_draft';
  };

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

  // Load draft when modal is opened
  useEffect(() => {
    if (isOpen) {
      hasSubmittedOrSaved.current = false;
      const key = getDraftKey();
      const savedDraft = localStorage.getItem(key);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setContent(parsed.content || '');
          if (parsed.isAnonymous !== undefined) {
            setIsAnonymous(parsed.isAnonymous);
          } else {
            setIsAnonymous(isAnonymousDefault || !userProfile);
          }
          if (parsed.postAudience) setPostAudience(parsed.postAudience);
          setGifUrl(parsed.gifUrl || null);
          setShowPoll(parsed.showPoll || false);
          setPollOptions(parsed.pollOptions || ['', '']);
          setAltText(parsed.altText || '');

          if (parsed.images && parsed.images.length > 0) {
            try {
              const restoredFiles = parsed.images.map((img: any) => base64ToFile(img.base64, img.name));
              setImageFiles(restoredFiles);
              setImagePreviews(parsed.images.map((img: any) => img.base64));
              setImageFilters(parsed.images.map((img: any) => img.filter || 'none'));
            } catch (imgErr) {
              console.error("Error restoring draft images:", imgErr);
            }
          } else {
            setImageFiles([]);
            setImagePreviews([]);
            setImageFilters([]);
          }

          // Check if restored draft has actual content to show a helpful indicator/alert
          const hasContent = (parsed.content || '').trim() || parsed.gifUrl || parsed.showPoll || (parsed.images && parsed.images.length > 0);
          if (hasContent) {
            setShowRestoredMessage(true);
          }
        } catch (e) {
          console.error('Error parsing draft:', e);
          setIsAnonymous(isAnonymousDefault || !userProfile);
        }
      } else {
        setContent('');
        setIsAnonymous(isAnonymousDefault || !userProfile);
        setPostAudience('public');
        setGifUrl(null);
        setShowPoll(false);
        setPollOptions(['', '']);
        setAltText('');
        setImageFiles([]);
        setImagePreviews([]);
        setImageFilters([]);
        setShowRestoredMessage(false);
      }
      setIsDraftLoaded(true);
    } else {
      setIsDraftLoaded(false);
      setShowRestoredMessage(false);
    }
  }, [isOpen, replyTo, quotePost, communityId, isAnonymousDefault, userProfile]);

  // Save/Update draft as the user types or updates options
  useEffect(() => {
    if (!isOpen || !isDraftLoaded) return;

    const key = getDraftKey();
    const hasAnyContent = content.trim() || gifUrl || showPoll || (imageFiles && imageFiles.length > 0);
    
    if (!hasAnyContent) {
      localStorage.removeItem(key);
      return;
    }

    const draft = {
      content,
      isAnonymous,
      postAudience,
      gifUrl,
      showPoll,
      pollOptions,
      altText
    };
    localStorage.setItem(key, JSON.stringify(draft));
  }, [isOpen, isDraftLoaded, content, isAnonymous, postAudience, gifUrl, showPoll, pollOptions, altText, imageFiles]);

  useEffect(() => {
    const handleAutocomplete = async () => {
      const textLine = content.substring(0, cursorPosition);
      const matches = textLine.match(/([@#])([a-zA-Z0-9_À-ÿ]*)$/);
      
      if (matches) {
        const type = matches[1] === '@' ? 'mention' : 'hashtag';
        const queryStr = matches[2].toLowerCase();
        
        setSuggestionType(type);
        setShowSuggestions(true);

        if (type === 'mention') {
          if (queryStr.length > 0) {
            const q = query(
              collection(db, 'users'), 
              where('username', '>=', queryStr), 
              where('username', '<=', queryStr + '\uf8ff'),
              limit(5)
            );
            const snap = await getDocs(q);
            setMentionSuggestions(snap.docs.map(d => d.data()));
          } else {
            // Show recent/followed users if query is empty
            setMentionSuggestions(userProfile?.following?.slice(0, 5) || []);
          }
        } else {
          // Hashtag suggestions (mock popular for now or fetch recent)
          const mockHashtags = ['OffMe', 'Missions', 'Ghost', 'Brasil', 'Premium', 'Crypto', 'Tech'];
          setHashtagSuggestions(mockHashtags.filter(h => h.toLowerCase().startsWith(queryStr)));
        }
      } else {
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(handleAutocomplete, 300);
    return () => clearTimeout(timeoutId);
  }, [content, cursorPosition]);

  const insertSuggestion = (value: string) => {
    const textBefore = content.substring(0, cursorPosition);
    const textAfter = content.substring(cursorPosition);
    
    // Find the start of the current word (@ or #)
    const match = textBefore.match(/([@#])[a-zA-Z0-9_À-ÿ]*$/);
    if (!match) return;
    
    const prefix = textBefore.substring(0, match.index);
    const newContent = prefix + match[1] + value + ' ' + textAfter;
    
    setContent(newContent);
    setShowSuggestions(false);
    
    // Focus back and move cursor
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (imageFiles.length + newFiles.length > 4) {
        alert('Você pode adicionar no máximo 4 imagens.');
        return;
      }
      
      setCompressing(true);
      setGifUrl(null); // Clear GIF if image is uploaded

      try {
        const optimizedResults = await Promise.all(
          newFiles.map(async (file) => {
            try {
              const res = await optimizeImage(file);
              return {
                file: res.file,
                preview: URL.createObjectURL(res.file),
                stat: {
                  originalName: file.name,
                  originalSize: res.originalSize,
                  optimizedSize: res.optimizedSize,
                  savedPercent: res.savedPercent
                }
              };
            } catch (err) {
              console.error("Compression error:", err);
              // Fallback
              return {
                file,
                preview: URL.createObjectURL(file),
                stat: {
                  originalName: file.name,
                  originalSize: file.size,
                  optimizedSize: file.size,
                  savedPercent: 0
                }
              };
            }
          })
        );

        setImageFiles(prev => [...prev, ...optimizedResults.map(r => r.file)]);
        setImagePreviews(prev => [...prev, ...optimizedResults.map(r => r.preview)]);
        setImageStats(prev => [...prev, ...optimizedResults.map(r => r.stat)]);
        setImageFilters(prev => [...prev, ...optimizedResults.map(() => 'none')]);
      } catch (overallErr) {
        console.error("Batch compression failed, adding fallback:", overallErr);
        setImageFiles(prev => [...prev, ...newFiles]);
        setImagePreviews(prev => [...prev, ...newFiles.map(file => URL.createObjectURL(file))]);
        setImageStats(prev => [
          ...prev, 
          ...newFiles.map(f => ({
            originalName: f.name,
            originalSize: f.size,
            optimizedSize: f.size,
            savedPercent: 0
          }))
        ]);
        setImageFilters(prev => [...prev, ...newFiles.map(() => 'none')]);
      } finally {
        setCompressing(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageStats(prev => prev.filter((_, i) => i !== index));
    setImageFilters(prev => prev.filter((_, i) => i !== index));
  };

  const removeGif = () => {
    setGifUrl(null);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-modal');
    } else {
      document.body.classList.remove('has-modal');
    }
    return () => {
      document.body.classList.remove('has-modal');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const fetchGifs = (offset: number) => {
    if (gifSearch) {
      return gf.search(gifSearch, { offset, limit: 10 });
    }
    return gf.trending({ offset, limit: 10 });
  };

  const handleAddThreadPost = () => {
    if (!content.trim() && imageFiles.length === 0 && !gifUrl) return;
    triggerHaptic('selection');
    setThreadPosts(prev => [...prev, { content, imageFiles, imagePreviews, imageFilters, gifUrl }]);
    setContent('');
    setImageFiles([]);
    setImagePreviews([]);
    setImageFilters([]);
    setGifUrl(null);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we have anything to post
    const validPollOptions = pollOptions.filter(opt => opt.trim() !== '');
    const hasValidPoll = showPoll && validPollOptions.length >= 2;
    
    const hasCurrentContent = content.trim() || imageFiles.length > 0 || gifUrl || hasValidPoll;
    if (!hasCurrentContent && threadPosts.length === 0) return;
    
    const canPostAnonymously = isAnonymous;
    if ((!userProfile && !canPostAnonymously) || !db) return;

    if (!navigator.onLine) {
      try {
        setLoading(true);
        await addDraft(
          content,
          isAnonymous,
          postAudience,
          imageFiles,
          validPollOptions,
          hasValidPoll,
          gifUrl,
          altText,
          replyTo,
          quotePost,
          communityId,
          communityName
        );

        const composerKey = getDraftKey();
        localStorage.removeItem(composerKey);

        setContent('');
        setImageFiles([]);
        setImagePreviews([]);
        setImageFilters([]);
        setGifUrl(null);
        setThreadPosts([]);
        setShowPoll(false);
        setPollOptions(['', '']);
        setAltText('');
        
        triggerHaptic('success');
        hasSubmittedOrSaved.current = true;
        window.dispatchEvent(new CustomEvent('applet:offline-post-saved'));
        onClose();
        return;
      } catch (err: any) {
        console.error("Failed to save offline draft:", err);
        alert("Erro ao salvar rascunho offline: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    try {
      setLoading(true);
      
      const authorId = isAnonymous ? 'anonymous' : userProfile.uid;
      const authorName = isAnonymous ? 'Anônimo' : (userProfile.displayName || '');
      const authorUsername = isAnonymous ? 'anonimo' : (userProfile.username || '');
      const authorPhoto = isAnonymous ? '' : (userProfile.photoURL || '');
      const authorVerified = isAnonymous ? false : (userProfile.isVerified || userProfile.username === 'Rulio' || false);
      const authorPremiumTier = isAnonymous ? null : (userProfile.premiumTier || null);
      const authorPrivate = isAnonymous ? false : (userProfile.privateProfile || false);

      // Collect all posts in the thread
      const allPostsToPublish = [...threadPosts];
      if (hasCurrentContent) {
        allPostsToPublish.push({ content, imageFiles, imagePreviews, imageFilters, gifUrl, altText });
      }
      
      let currentReplyToId = replyTo?.id || null;
      let currentReplyToUsername = replyTo?.authorUsername || null;
      let currentReplyToVerified = replyTo?.authorVerified || replyTo?.authorUsername === 'Rulio' || false;
      const mainThreadId = replyTo?.threadId || replyTo?.id || null;
      const mainThreadAuthorId = replyTo?.threadAuthorId || replyTo?.authorId || null;
      
      // Process sequentially
      for (const [index, postItem] of allPostsToPublish.entries()) {
        let imageUrls = postItem.gifUrl ? [postItem.gifUrl] : [];

        if (postItem.imageFiles && postItem.imageFiles.length > 0) {
          const uploadedUrls = await Promise.all(postItem.imageFiles.map(file => uploadToImgBB(file)));
          imageUrls = uploadedUrls;
        }

        const postContent = postItem.content.trim();
        
        // Extract hashtags
        const hashtags = postContent.match(/#[a-zA-Z0-9_À-ÿ]+/g)?.map(tag => tag.substring(1).toLowerCase()) || [];

        const postData: any = {
          content: postContent,
          hashtags,
          imageUrls,
          imageFilters: postItem.imageFilters || [],
          altText: postItem.altText || '',
          authorId,
          authorName,
          authorUsername,
          authorPhoto,
          authorVerified,
          authorPremiumTier,
          authorPrivate,
          ownerId: userProfile?.uid || null,
          isAnonymous,
          privacy: postAudience,
          audience: postAudience === 'circle' ? (userProfile?.circleMembers || []) : [],
          expiresAt: null,
          scheduledAt: scheduledAt ? Timestamp.fromDate(new Date(scheduledAt)) : null,
          status: scheduledAt ? 'scheduled' : 'published',
          createdAt: serverTimestamp(),
          likesCount: 0,
          repliesCount: 0,
          repostsCount: 0,
          viewCount: 0,
          likes: [],
          reposts: [],
          replyToId: currentReplyToId,
          replyToUsername: currentReplyToUsername,
          replyToVerified: currentReplyToVerified,
          replyToAuthorId: replyTo?.authorId || null,
          threadId: mainThreadId,
          threadAuthorId: mainThreadAuthorId,
          // Only the first post in the thread can have the quote or poll logic (to avoid duplicating it)
          quotedPostId: index === allPostsToPublish.length - 1 ? (quotePost?.id || null) : null,
          quotedPostContent: index === allPostsToPublish.length - 1 ? (quotePost?.content || null) : null,
          quotedPostAuthor: index === allPostsToPublish.length - 1 ? (quotePost?.authorName || null) : null,
          sharedMusic: index === 0 ? sharedMusic : null
        };

        if (communityId) {
          postData.communityId = communityId;
          postData.communityName = communityName;
        }

        if (index === allPostsToPublish.length - 1 && hasValidPoll) {
          postData.poll = {
            options: validPollOptions.map(opt => ({ text: opt, votes: 0 })),
            totalVotes: 0,
            voters: []
          };
        }

        const newPostRef = await addDoc(collection(db, 'posts'), postData);
        
        if (!isAnonymous && userProfile) {
          const missionType = replyTo ? 'reply' : 'post';
          await awardPoints(userProfile.uid, 5, missionType);
        }

        // Handle mentions and notifications
        if (postContent || index === allPostsToPublish.length - 1) {
          if (!isAnonymous && userProfile) {
            const firstImageUrl = imageUrls[0] || null;
            await handleMentions(postContent, newPostRef.id, userProfile, firstImageUrl);
            await notifyFollowers(userProfile, postContent, firstImageUrl);
          }
        }
        
        // Notification for replies/quotes
        if (index === allPostsToPublish.length - 1 && (replyTo || quotePost)) {
          const targetAuthorId = replyTo?.authorId || quotePost?.authorId;
          if (targetAuthorId && targetAuthorId !== authorId && targetAuthorId !== 'anonymous') {
            await addDoc(collection(db, 'notifications'), {
              recipientId: targetAuthorId,
              senderId: authorId,
              senderName: authorName,
              senderUsername: authorUsername,
              senderPhoto: authorPhoto || null,
              senderVerified: authorVerified,
              type: replyTo ? 'reply' : 'quote',
              postId: newPostRef.id,
              parentPostId: replyTo?.id || quotePost?.id,
              content: postContent,
              read: false,
              createdAt: serverTimestamp()
            });

            if (replyTo) {
              await updateDoc(doc(db, 'posts', replyTo.id), {
                repliesCount: increment(1)
              });
            }
          }
        }

        currentReplyToId = newPostRef.id;
        currentReplyToUsername = authorUsername;
        currentReplyToVerified = authorVerified;
      }

      // Clear autosaved draft on successful post submission
      const key = getDraftKey();
      localStorage.removeItem(key);

      setContent('');
      setImageFiles([]);
      setImagePreviews([]);
      setImageFilters([]);
      setGifUrl(null);
      setThreadPosts([]);
      setShowPoll(false);
      setPollOptions(['', '']);
      triggerHaptic('success');
      hasSubmittedOrSaved.current = true;
      onClose();
    } catch (error: any) {
      console.error("Erro ao postar:", error);
      triggerHaptic('error');
      alert("Erro ao postar: " + (error.message || "Erro desconhecido"));
      if (handleFirestoreError) {
        handleFirestoreError(error, OperationType.CREATE, 'posts');
      }
    } finally {
      setLoading(false);
    }
  };

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Simple heuristic for keyboard detection
      const isKeyboard = window.innerHeight < window.screen.height * 0.75;
      setIsKeyboardVisible(isKeyboard);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-[70] bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:h-[80vh] sm:max-h-[600px] sm:max-w-2xl sm:mx-auto sm:my-auto ${isKeyboardVisible ? 'sm:top-0' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10 pt-[env(safe-area-inset-top)]">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={onClose} 
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
                <h2 className="font-black italic tracking-tighter text-lg text-gray-900">
                  {replyTo ? 'Responder' : 'Novo post'}
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                {userProfile && !replyTo && (
                  <button 
                    onClick={() => setPostAudience(postAudience === 'public' ? 'circle' : 'public')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      postAudience === 'circle'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md' 
                        : 'bg-white border border-gray-200 text-blue-500 hover:border-blue-300'
                    }`}
                  >
                    <Users className={`w-3.5 h-3.5 ${postAudience === 'circle' ? 'text-white' : 'text-blue-500'}`} />
                    <span className="hidden xs:inline">{postAudience === 'circle' ? 'Meu Círculo' : 'Público'}</span>
                  </button>
                )}
                {userProfile && (
                  <button 
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      isAnonymous 
                        ? 'bg-gradient-to-r from-gray-800 to-black text-white shadow-md' 
                        : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Ghost className={`w-3.5 h-3.5 ${isAnonymous ? 'text-purple-300' : 'text-gray-400'}`} />
                    <span className="hidden xs:inline">{isAnonymous ? 'Anônimo' : 'Modo Público'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const validPollOptions = pollOptions.filter(opt => opt.trim() !== '');
                    const hasValidPoll = showPoll && validPollOptions.length >= 2;
                    setLoading(true);
                    try {
                      await addDraft(
                        content,
                        isAnonymous,
                        postAudience,
                        imageFiles,
                        validPollOptions,
                        hasValidPoll,
                        gifUrl,
                        altText,
                        replyTo,
                        quotePost,
                        communityId,
                        communityName
                      );
                      
                      const composerKey = getDraftKey();
                      localStorage.removeItem(composerKey);

                      setContent('');
                      setImageFiles([]);
                      setImagePreviews([]);
                      setImageFilters([]);
                      setGifUrl(null);
                      setThreadPosts([]);
                      setShowPoll(false);
                      setPollOptions(['', '']);
                      setAltText('');
                      
                      triggerHaptic('success');
                      hasSubmittedOrSaved.current = true;
                      window.dispatchEvent(new CustomEvent('applet:draft-saved-manually'));
                      onClose();
                    } catch (err: any) {
                      console.error("Failed to save draft:", err);
                      alert("Erro ao salvar rascunho: " + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={(!content.trim() && imageFiles.length === 0 && !gifUrl && threadPosts.length === 0) || loading}
                  className="mr-2 text-zinc-500 hover:text-zinc-700 border border-zinc-200 hover:bg-zinc-50 px-3 py-1.5 rounded-full font-bold transition-all text-xs xs:text-sm"
                >
                  Salvar Rascunho
                </button>
                <button
                  onClick={handlePost}
                  disabled={(!content.trim() && imageFiles.length === 0 && !gifUrl && threadPosts.length === 0) || loading || content.length > 1000}
                  className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-bold hover:bg-blue-600 disabled:bg-blue-300 disabled:opacity-50 transition-colors text-sm"
                >
                  {loading ? 'Postando...' : 'Post'}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {showRestoredMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="flex items-start justify-between p-3.5 bg-sky-50 dark:bg-zinc-850 border border-sky-100 dark:border-zinc-700/60 rounded-2xl text-xs text-sky-850 dark:text-sky-200 transition-all shadow-sm z-20 mb-2"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl flex-shrink-0">
                        <Sparkles className="w-4 h-4 animate-pulse text-sky-500" />
                      </div>
                      <div className="pr-2">
                        <span className="font-extrabold block text-gray-950 dark:text-gray-50">Rascunho restaurado!</span>
                        <span className="text-[11px] text-gray-500 dark:text-zinc-400">Recuperamos o seu conteúdo de rascunho anterior de forma segura.</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRestoredMessage(false)}
                      className="p-1 px-2.5 text-[10px] font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors border border-sky-200 dark:border-zinc-600/50 flex-shrink-0 cursor-pointer"
                    >
                      Ok
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {replyTo && (
                <div className="flex space-x-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {replyTo.authorPhoto ? (
                      <LazyImage src={replyTo.authorPhoto} alt={replyTo.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <LazyImage src={getDefaultAvatar(replyTo.authorName, replyTo.authorUsername)} alt={replyTo.authorName} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="font-black text-xs text-gray-900">{replyTo.authorName}</span>
                      <span className="text-gray-400 text-xs">@{replyTo.authorUsername}</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5 truncate">{replyTo.content}</p>
                  </div>
                </div>
              )}

              {/* Render thread previous posts */}
              {threadPosts.map((tp, idx) => (
                <div key={idx} className="flex space-x-3 mb-2">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ${isAnonymous ? 'bg-gradient-to-br from-indigo-50 to-purple-100 border border-purple-200 flex items-center justify-center' : 'bg-gray-200'}`}>
                      {isAnonymous ? (
                        <Ghost className="w-5 h-5 text-indigo-400" />
                      ) : userProfile?.photoURL ? (
                        <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                      ) : (
                        <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt={userProfile?.displayName} className="w-full h-full" />
                      )}
                    </div>
                    <div className="w-0.5 flex-1 bg-gray-300 my-1 min-h-[20px]" />
                  </div>
                  <div className="flex-1 pb-4 pt-1">
                    <p className="text-gray-900 text-lg whitespace-pre-wrap leading-tight">{tp.content}</p>
                    
                    {tp.content === '' && idx === 0 && sharedMusic && (
                      <div className="bg-gray-50 rounded-2xl p-3 border border-black/5 mt-2 flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                          <img src={sharedMusic.artwork} alt={sharedMusic.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs truncate">{sharedMusic.title}</h4>
                          <p className="text-[10px] text-gray-500 truncate">{sharedMusic.artist}</p>
                        </div>
                      </div>
                    )}

                    {tp.imagePreviews.length > 0 && (
                      <div className={`grid gap-2 mt-2 ${tp.imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {tp.imagePreviews.map((preview, imgIdx) => (
                           <div key={imgIdx} className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm aspect-square">
                             <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-80" />
                           </div>
                        ))}
                      </div>
                    )}

                    {tp.gifUrl && tp.imagePreviews.length === 0 && (
                      <div className="relative mt-2 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                        <img src={tp.gifUrl} alt="GIF" className="w-full h-auto max-h-64 object-cover opacity-80" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex space-x-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex-shrink-0 overflow-hidden ${isAnonymous ? 'bg-gradient-to-br from-indigo-50 to-purple-100 border border-purple-200 flex items-center justify-center' : 'bg-gray-200'}`}>
                  {isAnonymous ? (
                    <Ghost className="w-5 h-5 text-indigo-400" />
                  ) : userProfile?.photoURL ? (
                    <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                  ) : (
                    <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt={userProfile?.displayName} className="w-full h-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <textarea
                    ref={textInputRef}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      setCursorPosition(e.target.selectionStart);
                    }}
                    onKeyUp={(e) => setCursorPosition((e.target as any).selectionStart)}
                    onClick={(e) => setCursorPosition((e.target as any).selectionStart)}
                    placeholder={replyTo ? "Postar sua resposta" : "What's up?"}
                    className="w-full bg-transparent text-xl outline-none resize-none min-h-[120px] placeholder-gray-500"
                    autoFocus
                  />
                  



                  {sharedMusic && (
                    <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100 mb-4 flex items-center space-x-4 relative group">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
                        <img src={sharedMusic.artwork} alt={sharedMusic.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-blue-900 truncate">{sharedMusic.title}</h4>
                        <p className="text-xs text-blue-700 truncate">{sharedMusic.artist}</p>
                        <div className="flex items-center space-x-1 mt-1">
                           <Music className="w-3 h-3 text-blue-400" />
                           <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Música Compartilhada</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Autocomplete Suggestions */}
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute z-50 left-10 mt-1 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden"
                      >
                        <div className="p-2 border-b border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sugestões</span>
                          <button onClick={() => setShowSuggestions(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
                            <X className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {suggestionType === 'mention' && mentionSuggestions.map((user, idx) => (
                            <button
                              key={idx}
                              onClick={() => insertSuggestion(user.username)}
                              className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors border-b border-gray-50 dark:border-white/5 last:border-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                <LazyImage src={user.photoURL || getDefaultAvatar(user.displayName, user.username)} alt={user.displayName} className="w-full h-full" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{user.displayName}</p>
                                <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                              </div>
                            </button>
                          ))}
                          {suggestionType === 'hashtag' && hashtagSuggestions.map((tag, idx) => (
                            <button
                              key={idx}
                              onClick={() => insertSuggestion(tag)}
                              className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center space-x-3"
                            >
                              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center font-black text-gray-400 text-xs">#</div>
                              <span className="font-bold text-sm">#{tag}</span>
                            </button>
                          ))}
                          {((suggestionType === 'mention' && mentionSuggestions.length === 0) || (suggestionType === 'hashtag' && hashtagSuggestions.length === 0)) && (
                            <div className="px-4 py-4 text-center text-gray-400 italic text-xs">Nenhuma sugestão encontrada</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  
                  {compressing && (
                    <div className="flex items-center space-x-2 py-3 px-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl mb-4 animate-pulse">
                      <div className="w-5 h-5 border-2 border-t-transparent border-black dark:border-white rounded-full animate-spin" />
                      <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Otimizando e comprimindo imagens...</span>
                    </div>
                  )}

                  {imagePreviews.length > 0 && (
                    <div className="space-y-3 mt-2 mb-4">
                      <div className={`grid gap-2 ${imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm group aspect-square">
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all scale-90 group-hover:scale-100 z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <img 
                              src={preview} 
                              alt={`Preview ${index}`} 
                              style={{ filter: FILTER_STYLES[imageFilters[index] || 'none'] }} 
                              className="w-full h-full object-cover transition-all duration-300" 
                            />
                            {imageStats[index] && imageStats[index].savedPercent > 0 && (
                              <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md text-[10px] text-white px-2.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-lg border border-white/10 select-none">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span>Otimizado: -{imageStats[index].savedPercent}%</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* CSS Photo Filter Presets Panel */}
                      <div className="bg-gray-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-black/5 dark:border-zinc-800 shadow-sm">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2.5 block">
                          Filtros de Imagem (CSS Filters)
                        </label>
                        <div className="space-y-3">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="flex items-center space-x-3 bg-white dark:bg-zinc-800/50 p-2 rounded-xl border border-gray-100 dark:border-zinc-805">
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-205">
                                <img 
                                  src={preview} 
                                  style={{ filter: FILTER_STYLES[imageFilters[index] || 'none'] }} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                              <div className="flex-1 overflow-x-auto flex items-center space-x-1.5 py-1 no-scrollbar scrollbar-none">
                                {[
                                  { key: 'none', label: 'Normal' },
                                  { key: 'sepia', label: 'Sepia' },
                                  { key: 'grayscale', label: 'P&B' },
                                  { key: 'contrast', label: 'Contraste' },
                                  { key: 'bleach', label: 'Bleach Bypass' }
                                ].map((item) => (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('selection');
                                      setImageFilters(prev => {
                                        const updated = [...prev];
                                        updated[index] = item.key;
                                        return updated;
                                      });
                                    }}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all border shrink-0 ${
                                      (imageFilters[index] || 'none') === item.key
                                        ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                        : 'bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {imageStats.length > 0 && imageStats.some(s => s.savedPercent > 0) && (
                        <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/40 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                          <div className="flex items-center space-x-2.5">
                            <div className="bg-emerald-100 dark:bg-emerald-900/60 p-1.5 rounded-full text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <span className="font-bold block text-xs">Compressão Inteligente Ativa</span>
                              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-medium">
                                Reduziu de {(imageStats.reduce((acc, cur) => acc + cur.originalSize, 0) / (1024 * 1024)).toFixed(2)} MB para {(imageStats.reduce((acc, cur) => acc + cur.optimizedSize, 0) / (1024 * 1024)).toFixed(2)} MB.
                              </p>
                            </div>
                          </div>
                          <div className="bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-lg font-black text-[10px] text-emerald-800 dark:text-emerald-300 select-none">
                            -{Math.round((1 - (imageStats.reduce((acc, cur) => acc + cur.optimizedSize, 0) / imageStats.reduce((acc, cur) => acc + cur.originalSize, 0))) * 100)}% PESO
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-gray-50 dark:bg-zinc-900 p-3 rounded-2xl border border-black/5 dark:border-zinc-800">
                        <label className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 mb-1 block">Acessibilidade (Alt Text)</label>
                        <input 
                          type="text" 
                          value={altText}
                          onChange={(e) => setAltText(e.target.value)}
                          placeholder="Descreva a(s) imagem(ns) para quem não pode ver..."
                          className="w-full bg-transparent outline-none text-sm border-b border-gray-200 dark:border-zinc-800 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 py-1 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {gifUrl && imagePreviews.length === 0 && (
                    <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
                      <button
                        onClick={removeGif}
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all scale-90 group-hover:scale-100 z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <img src={gifUrl} alt="GIF" className="w-full h-auto max-h-64 object-cover" />
                    </div>
                  )}

                  {showSchedule && (
                    <div className="mt-4 mb-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
                      <div className="flex justify-between items-center w-full mb-3">
                        <h4 className="font-bold text-sm flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>Agendar Post</span>
                        </h4>
                        <button onClick={() => { setShowSchedule(false); setScheduledAt(''); }} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input 
                        type="datetime-local" 
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500/20 font-medium text-sm"
                      />
                      <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase italic">O post será publicado automaticamente na data escolhida.</p>
                    </div>
                  )}

                  {/* Poll & GIF Picker */}
                  {showPoll && (
                    <div className="mt-4 mb-4 border border-gray-200 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm">Enquete</h4>
                        <button onClick={() => { setShowPoll(false); setPollOptions(['', '']); }} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {pollOptions.map((opt, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handlePollOptionChange(index, e.target.value)}
                              placeholder={`Opção ${index + 1}`}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                              maxLength={25}
                            />
                            {pollOptions.length > 2 && (
                              <button onClick={() => handleRemovePollOption(index)} className="p-2 text-gray-400 hover:text-red-500">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {pollOptions.length < 4 && (
                        <button 
                          onClick={handleAddPollOption}
                          className="mt-3 text-sm font-bold text-blue-500 hover:text-blue-600"
                        >
                          + Adicionar opção
                        </button>
                      )}
                    </div>
                  )}

                  {showGifPicker && (
                    <div className="mt-4 mb-4 border border-gray-200 rounded-2xl p-4 h-64 flex flex-col">
                      <div className="flex justify-between items-center mb-3">
                        <input
                          type="text"
                          placeholder="Pesquisar GIFs..."
                          value={gifSearch}
                          onChange={(e) => setGifSearch(e.target.value)}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black mr-2"
                        />
                        <button onClick={() => setShowGifPicker(false)} className="text-gray-400 hover:text-red-500 p-2">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto rounded-xl">
                        <Grid 
                          width={300} 
                          columns={2} 
                          fetchGifs={fetchGifs} 
                          key={gifSearch} // Force re-render on search change
                          onGifClick={(gif, e) => {
                            e.preventDefault();
                            setGifUrl(gif.images.original.url);
                            setImageFiles([]);
                            setImagePreviews([]);
                            setShowGifPicker(false);
                          }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white pb-[env(safe-area-inset-bottom)] shrink-0">
              <div className="flex items-center space-x-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()} 
                  className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowPoll(!showPoll); setShowGifPicker(false); }} 
                  className={`p-2 rounded-full transition-colors ${showPoll ? 'bg-blue-50 text-blue-500' : 'text-blue-500 hover:bg-blue-50'}`}
                >
                  <BarChart2 className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowGifPicker(!showGifPicker); setShowPoll(false); }} 
                  className={`p-2 rounded-full transition-colors ${showGifPicker ? 'bg-blue-50 text-blue-500' : 'text-blue-500 hover:bg-blue-50'}`}
                >
                  <Film className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => { setShowSchedule(!showSchedule); setShowPoll(false); setShowGifPicker(false); }} 
                  className={`p-2 rounded-full transition-colors ${showSchedule ? 'bg-blue-50 text-blue-500' : 'text-blue-500 hover:bg-blue-50'}`}
                >
                   <Clock className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={handleAddThreadPost}
                  disabled={!content.trim() && imageFiles.length === 0 && !gifUrl}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Adicionar ao fio"
                >
                  <Plus className="w-5 h-5" />
                </button>
                {content.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="relative w-7 h-7 flex items-center justify-center">
                      <svg className="w-7 h-7 transform -rotate-90">
                        {/* Background track */}
                        <circle
                          cx="14"
                          cy="14"
                          r="9"
                          className="stroke-gray-100"
                          strokeWidth="2"
                          fill="transparent"
                        />
                        {/* Progress track */}
                        <motion.circle
                          cx="14"
                          cy="14"
                          r="9"
                          className={`${content.length > 1000 ? 'stroke-red-500' : content.length > 900 ? 'stroke-amber-500' : 'stroke-blue-500'} transition-colors duration-200`}
                          strokeWidth="2"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 9}
                          animate={{ strokeDashoffset: (2 * Math.PI * 9) - (Math.min((content.length / 1000) * 100, 100) / 100) * (2 * Math.PI * 9) }}
                          transition={{ duration: 0.1 }}
                          strokeLinecap="round"
                        />
                      </svg>
                      {content.length >= 900 && (
                        <span className={`absolute text-[9px] font-black ${content.length > 1000 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                          {1000 - content.length}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
