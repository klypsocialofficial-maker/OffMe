import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';

interface PollProps {
  post: any;
  handleFirestoreError: (error: unknown, op: any, path: string) => void;
  OperationType: any;
}

export default function Poll({ post, handleFirestoreError, OperationType }: PollProps) {
  const { userProfile } = useAuth();
  const [voting, setVoting] = useState(false);

  if (!post.poll || !post.poll.options) return null;

  const hasVoted = post.poll.voters?.includes(userProfile?.uid);
  const totalVotes = post.poll.totalVotes || 0;

  const handleVote = async (optionIndex: number) => {
    if (!userProfile?.uid || !db || hasVoted || voting) return;

    setVoting(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      
      // We need to update the specific option's vote count and the total votes/voters
      // Since Firestore doesn't support updating specific array elements easily without reading first,
      // and we already have the post data, we'll construct the new poll object.
      // In a highly concurrent app, this might need a transaction, but for this prototype it's fine.
      
      const newOptions = [...post.poll.options];
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        votes: (newOptions[optionIndex].votes || 0) + 1
      };

      await updateDoc(postRef, {
        poll: {
          options: newOptions,
          totalVotes: totalVotes + 1,
          voters: arrayUnion(userProfile.uid)
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="mt-3 border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
      <div className="space-y-2">
        {post.poll.options.map((option: any, index: number) => {
          const voteCount = option.votes || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isWinner = hasVoted && voteCount === Math.max(...post.poll.options.map((o: any) => o.votes || 0));

          return (
            <div key={index} className="relative">
              {hasVoted ? (
                <div className="relative h-10 flex items-center px-3 rounded-xl overflow-hidden bg-gray-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`absolute left-0 top-0 bottom-0 ${isWinner ? 'bg-blue-100' : 'bg-gray-200'}`}
                  />
                  <div className="relative z-10 flex justify-between w-full text-sm font-medium">
                    <span className={isWinner ? 'font-bold' : ''}>{option.text}</span>
                    <span className={isWinner ? 'font-bold' : ''}>{percentage}%</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(index);
                  }}
                  disabled={voting}
                  className="w-full text-left px-4 py-2 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {option.text}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-gray-500">
        {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
      </div>
    </div>
  );
}
