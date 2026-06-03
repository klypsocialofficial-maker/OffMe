import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, onSnapshot, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface CallProviderProps {
  children: React.ReactNode;
}

interface CallData {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'in-progress' | 'ended' | 'rejected' | 'missed';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  callerInfo?: { displayName: string, username: string, photoURL: string };
  receiverInfo?: { displayName: string, username: string, photoURL: string };
}

interface CallContextType {
  currentCall: CallData | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (receiverId: string, type: 'audio' | 'video', targetInfo: any) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ],
  iceCandidatePoolSize: 10,
};

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const callDocRef = useRef<any>(null);
  const unsubCall = useRef<any>(null);
  const unsubCandidates = useRef<any>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Listen for incoming calls
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as CallData;
          // Only show if we don't have an active call
          if (!currentCall || currentCall.status === 'ended') {
            setCurrentCall({ ...data, id: change.doc.id });
            callDocRef.current = doc(db, 'calls', change.doc.id);
          }
        }
        if (change.type === 'modified') {
          const data = change.doc.data();
          if (data.status === 'ended' || data.status === 'missed' || data.status === 'rejected') {
            if (currentCall && currentCall.id === change.doc.id) {
               cleanupCall();
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, currentCall]);

  const cleanupCall = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    if (unsubCall.current) unsubCall.current();
    if (unsubCandidates.current) unsubCandidates.current();
    
    setLocalStream(null);
    setRemoteStream(null);
    setCurrentCall(null);
    callDocRef.current = null;
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const initWebRTC = async (type: 'audio' | 'video') => {
    pc.current = new RTCPeerConnection(servers);
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: type === 'video',
      audio: true
    });
    setLocalStream(stream);

    const rStream = new MediaStream();
    setRemoteStream(rStream);

    stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

    pc.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => rStream.addTrack(track));
    };

    return stream;
  };

  const startCall = async (receiverId: string, type: 'audio' | 'video', targetInfo: any) => {
    if (!currentUser || !userProfile) return;

    try {
      await initWebRTC(type);

      const callDoc = doc(collection(db, 'calls'));
      callDocRef.current = callDoc;

      // Handle ICE Candidates
      pc.current!.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(collection(callDoc, 'callerCandidates'), event.candidate.toJSON());
        }
      };

      const offerDescription = await pc.current!.createOffer();
      await pc.current!.setLocalDescription(offerDescription);

      const callData: CallData = {
        id: callDoc.id,
        callerId: currentUser.uid,
        receiverId,
        type,
        status: 'ringing',
        offer: { type: offerDescription.type, sdp: offerDescription.sdp },
        callerInfo: {
          displayName: userProfile.displayName,
          username: userProfile.username,
          photoURL: userProfile.photoURL || ''
        },
        receiverInfo: {
          displayName: targetInfo?.displayName || 'Desconhecido',
          username: targetInfo?.username || 'user',
          photoURL: targetInfo?.photoURL || ''
        }
      };

      await updateDoc(callDoc, callData as any).catch(async () => {
         // If doc doesn't exist yet, we use set
         const { setDoc } = await import('firebase/firestore');
         await setDoc(callDoc, callData);
      });

      setCurrentCall(callData);

      // Listen for answer
      unsubCall.current = onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (pc.current && !pc.current.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.current.setRemoteDescription(answerDescription);
        }
        if (data?.status === 'rejected' || data?.status === 'ended') {
          cleanupCall();
        } else if (data) {
          setCurrentCall({ ...data, id: callDoc.id } as CallData);
        }
      });

      // Listen for remote ICE candidates
      unsubCandidates.current = onSnapshot(collection(callDoc, 'receiverCandidates'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.current?.addIceCandidate(candidate);
          }
        });
      });

    } catch (e) {
      console.error(e);
      cleanupCall();
    }
  };

  const answerCall = async () => {
    if (!currentCall || !callDocRef.current) return;

    try {
      await initWebRTC(currentCall.type);

      pc.current!.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(collection(callDocRef.current, 'receiverCandidates'), event.candidate.toJSON());
        }
      };

      const offerDescription = new RTCSessionDescription(currentCall.offer!);
      await pc.current!.setRemoteDescription(offerDescription);

      const answerDescription = await pc.current!.createAnswer();
      await pc.current!.setLocalDescription(answerDescription);

      await updateDoc(callDocRef.current, {
        answer: { type: answerDescription.type, sdp: answerDescription.sdp },
        status: 'in-progress'
      });

      // Listen for remote ICE candidates
      unsubCandidates.current = onSnapshot(collection(callDocRef.current, 'callerCandidates'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.current?.addIceCandidate(candidate);
          }
        });
      });

      // Listen for call ending
      unsubCall.current = onSnapshot(callDocRef.current, (snapshot) => {
        const data = snapshot.data();
        if (data?.status === 'ended') {
          cleanupCall();
        } else if (data) {
          setCurrentCall({ ...data, id: callDocRef.current.id } as CallData);
        }
      });

    } catch (e) {
      console.error(e);
      cleanupCall();
    }
  };

  const rejectCall = async () => {
    if (callDocRef.current) {
      await updateDoc(callDocRef.current, { status: 'rejected' });
    }
    cleanupCall();
  };

  const endCall = async () => {
    if (callDocRef.current) {
      await updateDoc(callDocRef.current, { status: 'ended' });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && currentCall?.type === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <CallContext.Provider value={{
      currentCall,
      localStream,
      remoteStream,
      startCall,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      isMuted,
      isVideoOff
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
