import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../contexts/CallContext';
import { useAuth } from '../contexts/AuthContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, PhoneCall } from 'lucide-react';
import { getDefaultAvatar } from '../lib/avatar';

export default function CallModal() {
  const { currentCall, localStream, remoteStream, answerCall, rejectCall, endCall, toggleMute, toggleVideo, isMuted, isVideoOff } = useCall();
  const { currentUser } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentCall?.status === 'in-progress') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentCall?.status]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, currentCall?.status]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, currentCall?.status]);

  if (!currentCall || currentCall.status === 'ended' || currentCall.status === 'rejected' || currentCall.status === 'missed') {
    return null;
  }

  const isRinging = currentCall.status === 'ringing';
  const isReceiver = currentUser?.uid === currentCall.receiverId;
  const isVideo = currentCall.type === 'video';

  const displayInfo = isReceiver ? currentCall.callerInfo : currentCall.receiverInfo;

  return (
    <div className={`fixed inset-0 z-[100] flex bg-gray-900/90 backdrop-blur-sm ${isVideo && !isRinging ? 'flex-col p-0' : 'items-center justify-center p-4'}`}>
      
      {/* Video Call Full Screen Structure */}
      {(!isRinging && isVideo) ? (
        <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
          {/* Remote Video (Full Screen) */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
          />
             
          {/* Gradient Overlay for Top Info */}
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
          
          {/* Video Call Info Overlay */}
          <div className="absolute top-12 left-6 z-20 text-white drop-shadow-md pointer-events-none">
            <h2 className="text-3xl font-bold tracking-tight">{displayInfo?.displayName}</h2>
            <p className="text-lg font-medium font-mono mt-1 opacity-90">{formatDuration(callDuration)}</p>
          </div>

          {/* Local Video (Floating) */}
          <div className="absolute top-12 right-6 w-28 h-40 sm:w-36 sm:h-52 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl z-20 border border-white/20">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Controls - Pinned to bottom */}
          <div className="absolute bottom-0 inset-x-0 pb-12 pt-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 flex justify-center items-center">
             <div className="flex items-center gap-6 sm:gap-8 px-8 py-4 bg-white/10 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-2xl">
               <button 
                 onClick={toggleMute}
                 className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105 ${
                   isMuted ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'
                 }`}
               >
                 {isMuted ? <MicOff className="w-6 h-6 sm:w-7 sm:h-7" /> : <Mic className="w-6 h-6 sm:w-7 sm:h-7" />}
               </button>
                  
               <button 
                 onClick={toggleVideo}
                 className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 hover:scale-105 ${
                   isVideoOff ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'
                 }`}
               >
                 {isVideoOff ? <VideoOff className="w-6 h-6 sm:w-7 sm:h-7" /> : <Video className="w-6 h-6 sm:w-7 sm:h-7" />}
               </button>

               <button 
                 onClick={endCall}
                 className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-transform active:scale-95 hover:scale-105 shadow-xl shadow-red-500/30 ml-2"
               >
                 <PhoneOff className="w-8 h-8 sm:w-10 sm:h-10" />
               </button>
             </div>
          </div>
        </div>
      ) : (
        // Ringing or Audio Call UI
        <div className="relative w-full max-w-md bg-white rounded-3xl p-8 flex flex-col justify-between text-center overflow-hidden shadow-2xl">
            {/* Audio call remote element */}
            {!isRinging && !isVideo && (
               <audio ref={remoteVideoRef as any} autoPlay className="hidden" />
            )}

            <div className="flex flex-col items-center justify-center flex-1 my-6">
              <div className="relative mb-8">
                <img 
                  src={displayInfo?.photoURL || getDefaultAvatar(displayInfo?.displayName || 'Unknown', displayInfo?.username || 'user')} 
                  alt="Profile"
                  className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
                />
                {isRinging && (
                  <div className="absolute inset-0 rounded-full animate-ping border-2 border-black opacity-20 duration-1000"></div>
                )}
              </div>
              
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                {displayInfo?.displayName || 'Desconhecido'}
              </h2>
              <p className="text-base mt-2 text-gray-500 font-medium">
                @{displayInfo?.username || 'user'}
              </p>
              
              {isRinging ? (
                <p className="mt-8 font-bold text-xl animate-pulse text-gray-800">
                  {isReceiver ? 'Recebendo chamada...' : 'Chamando...'}
                </p>
              ) : (
                <p className="mt-8 font-bold text-2xl text-gray-900 font-mono tracking-widest bg-gray-100 px-6 py-2 rounded-full inline-block">
                  {formatDuration(callDuration)}
                </p>
              )}
            </div>

            {/* Audio Call & Ringing Controls */}
            <div className="flex justify-center items-center gap-6 mt-6">
              {isRinging && isReceiver ? (
                <>
                  <button 
                    onClick={answerCall}
                    className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-transform active:scale-95 shadow-xl shadow-green-500/30"
                  >
                    <PhoneCall className="w-8 h-8" />
                  </button>
                  <button 
                    onClick={rejectCall}
                    className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-transform active:scale-95 shadow-xl shadow-red-500/30"
                  >
                    <PhoneOff className="w-8 h-8" />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                      isMuted ? 'bg-black text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button 
                    onClick={endCall}
                    className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-transform active:scale-95 shadow-xl shadow-red-500/30"
                  >
                    <PhoneOff className="w-8 h-8" />
                  </button>
                </>
              )}
            </div>
        </div>
      )}
    </div>
  );
}
