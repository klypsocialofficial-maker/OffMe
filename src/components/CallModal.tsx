import React, { useEffect, useRef } from 'react';
import { useCall } from '../contexts/CallContext';
import { useAuth } from '../contexts/AuthContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, PhoneCall } from 'lucide-react';
import { getDefaultAvatar } from '../lib/avatar';

export default function CallModal() {
  const { currentCall, localStream, remoteStream, answerCall, rejectCall, endCall, toggleMute, toggleVideo, isMuted, isVideoOff } = useCall();
  const { currentUser } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/90 backdrop-blur-sm">
      <div className={`relative w-full max-w-md ${isVideo && !isRinging ? 'h-[80vh] bg-black' : 'bg-white rounded-3xl p-6 text-center shadow-2xl'} flex flex-col justify-between overflow-hidden shadow-2xl rounded-3xl sm:h-auto`}>
        
        {/* Ringing / Calling UI */}
        {(isRinging || (!isRinging && !isVideo)) && (
          <div className={`flex flex-col items-center justify-center flex-1 ${isVideo && !isRinging ? 'absolute inset-0 z-10' : ''}`}>
            
            <div className="relative mb-6">
              <img 
                src={displayInfo?.photoURL || getDefaultAvatar(displayInfo?.displayName || 'Unknown', displayInfo?.username || 'user')} 
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
              {isRinging && (
                <div className="absolute inset-0 rounded-full animate-ping border-2 border-black opacity-20"></div>
              )}
            </div>
            
            <h2 className={`text-2xl font-black ${isVideo && !isRinging ? 'text-white' : 'text-gray-900'}`}>
              {displayInfo?.displayName || 'Desconhecido'}
            </h2>
            <p className={`text-sm mt-1 ${isVideo && !isRinging ? 'text-gray-300' : 'text-gray-500'}`}>
              @{displayInfo?.username || 'user'}
            </p>
            
            <p className={`mt-4 font-bold text-lg animate-pulse ${isVideo && !isRinging ? 'text-white' : 'text-gray-900'}`}>
              {isRinging 
                ? (isReceiver ? 'Recebendo chamada...' : 'Chamando...') 
                : 'Em chamada'}
            </p>

            {/* If it's an active audio call, show the remote audio element */}
            {!isRinging && !isVideo && (
               <audio ref={remoteVideoRef as any} autoPlay className="hidden" />
            )}
          </div>
        )}

        {/* Video Call UI */}
        {!isRinging && isVideo && (
           <div className="absolute inset-0 bg-black">
             {/* Remote Video (Full Screen) */}
             <video 
               ref={remoteVideoRef} 
               autoPlay 
               playsInline 
               className="w-full h-full object-cover"
             />
             {/* Local Video (Floating) */}
             <div className="absolute top-4 right-4 w-24 h-36 bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl z-20">
               <video 
                 ref={localVideoRef} 
                 autoPlay 
                 playsInline 
                 muted 
                 className="w-full h-full object-cover"
               />
             </div>
           </div>
        )}

        {/* Controls */}
        <div className={`relative z-20 flex justify-center gap-6 mt-8 ${isVideo && !isRinging ? 'pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 inset-x-0' : ''}`}>
          
          {isRinging && isReceiver ? (
            <>
              {/* Answer Button */}
              <button 
                onClick={answerCall}
                className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-transform hover:scale-105 shadow-lg shadow-green-500/30"
              >
                <PhoneCall className="w-7 h-7" />
              </button>
              {/* Reject Button */}
              <button 
                onClick={rejectCall}
                className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-transform hover:scale-105 shadow-lg shadow-red-500/30"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </>
          ) : (
            <>
              {/* Ongoing Call Controls / or Caller waiting Controls */}
              {(!isRinging || (isRinging && !isReceiver)) && (
                <>
                  <button 
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 ${isMuted ? 'bg-white/90 text-black' : 'bg-black/20 text-white backdrop-blur-md border border-white/20'}`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  
                  {isVideo && (
                    <button 
                      onClick={toggleVideo}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 ${isVideoOff ? 'bg-white/90 text-black' : 'bg-black/20 text-white backdrop-blur-md border border-white/20'}`}
                    >
                      {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                    </button>
                  )}

                  <button 
                    onClick={endCall}
                    className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-transform hover:scale-105 shadow-lg shadow-red-500/30"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
