import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, Heart, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TrendingPosts: React.FC = () => {
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const q = query(
          collection(db, 'posts'),
          orderBy('likesCount', 'desc'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        setTrendingPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching trending posts:', error);
      }
    };

    fetchTrending();
    const interval = setInterval(fetchTrending, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (trendingPosts.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-3xl border border-indigo-100 shadow-sm mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-indigo-900">Em Alta</h2>
      </div>
      <div className="space-y-4">
        {trendingPosts.map((post, index) => (
          <div 
            key={post.id} 
            className="cursor-pointer group"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            <div className="flex items-start space-x-3">
              <span className="text-xl font-bold text-indigo-300 group-hover:text-indigo-500 transition-colors">
                #{index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                  {post.content}
                </p>
                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center"><Heart className="w-3 h-3 mr-1" /> {post.likesCount || 0}</span>
                  <span className="flex items-center"><Repeat className="w-3 h-3 mr-1" /> {post.repostsCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendingPosts;
