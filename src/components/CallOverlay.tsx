import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import { doc, collection, addDoc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CallOverlayProps {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  callType: 'audio' | 'video';
  isIncoming: boolean;
  callDocId?: string;
  onEndCall: () => void;
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function CallOverlay({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserPhoto,
  callType,
  isIncoming,
  callDocId,
  onEndCall
}: CallOverlayProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(isIncoming ? 'ringing' : 'calling');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const activeCallDocId = useRef<string | null>(callDocId || null);

  useEffect(() => {
    if (!isIncoming) {
      initCall();
    }
    
    return () => {
      handleEndCall();
    };
  }, []);

  const initCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      const remoteStream = new MediaStream();
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      };

      if (isIncoming && activeCallDocId.current) {
        await answerCall(pc, activeCallDocId.current);
      } else {
        await createCall(pc);
      }
    } catch (error) {
      console.error("Error accessing media devices.", error);
      handleEndCall();
    }
  };

  const createCall = async (pc: RTCPeerConnection) => {
    const callDoc = doc(collection(db, 'conversations', conversationId, 'calls'));
    activeCallDocId.current = callDoc.id;
    
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, {
      offer,
      callerId: currentUserId,
      calleeId: otherUserId,
      type: callType,
      status: 'calling',
      createdAt: new Date()
    });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
        setCallStatus('connected');
      }
      if (data?.status === 'ended') {
        handleEndCall();
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
  };

  const answerCall = async (pc: RTCPeerConnection, docId: string) => {
    const callDoc = doc(db, 'conversations', conversationId, 'calls', docId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDoc)).data();
    if (!callData) return;

    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { 
      answer,
      status: 'connected'
    });
    setCallStatus('connected');

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.status === 'ended') {
        handleEndCall();
      }
    });
  };

  const handleEndCall = async () => {
    if (activeCallDocId.current) {
      const callDoc = doc(db, 'conversations', conversationId, 'calls', activeCallDocId.current);
      try {
        await updateDoc(callDoc, { status: 'ended' });
      } catch (e) {
        console.error("Error updating call status", e);
      }
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    setCallStatus('ended');
    onEndCall();
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
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      {/* Remote Video (Full Screen) */}
      {callType === 'video' && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${callStatus !== 'connected' ? 'hidden' : ''}`}
        />
      )}

      {/* Local Video (Picture in Picture) */}
      {callType === 'video' && !isVideoOff && (
        <div className="absolute top-16 right-4 w-24 h-36 bg-gray-800 rounded-xl overflow-hidden shadow-2xl z-10 border-2 border-white/20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Call Info Overlay */}
      <div className="absolute top-20 flex flex-col items-center z-10">
        <div className="w-24 h-24 rounded-full bg-gray-800 overflow-hidden mb-4 border-4 border-white/10 shadow-2xl">
          {otherUserPhoto ? (
            <img src={otherUserPhoto} alt={otherUserName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
              {otherUserName[0]}
            </div>
          )}
        </div>
        <h2 className="text-white text-2xl font-bold shadow-black drop-shadow-md">{otherUserName}</h2>
        <p className="text-white/80 mt-2 shadow-black drop-shadow-md">
          {callStatus === 'calling' && 'Chamando...'}
          {callStatus === 'ringing' && 'Conectando...'}
          {callStatus === 'connected' && 'Em chamada'}
          {callStatus === 'ended' && 'Chamada encerrada'}
        </p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center space-x-6 z-10">
        {isIncoming && callStatus === 'ringing' ? (
          <>
            <button
              onClick={initCall}
              className="p-5 rounded-full bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg shadow-green-500/30 animate-pulse"
            >
              <Phone className="w-8 h-8" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={handleEndCall}
              className="p-5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="w-8 h-8" />
            </button>

            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'}`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
