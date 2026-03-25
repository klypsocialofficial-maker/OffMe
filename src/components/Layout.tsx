import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import PostForm from './PostForm';
import UserDrawer from './UserDrawer';
import { DrawerProvider } from '../contexts/DrawerContext';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, X } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  return (
    <DrawerProvider>
      <div className="min-h-screen bg-white flex justify-center pb-20 sm:pb-0">
        <div className="w-full max-w-7xl flex">
          {/* Left Sidebar - Desktop/Tablet */}
          <div className="hidden sm:block w-20 xl:w-72 sticky top-0 h-screen border-r border-gray-100 px-2 xl:px-4 py-6">
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 max-w-2xl border-r border-gray-100 min-h-screen relative">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>

            {/* Floating Action Button - Mobile */}
            <button 
              onClick={() => setIsPostModalOpen(true)}
              className="sm:hidden fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform z-40"
            >
              <PlusCircle className="w-7 h-7" />
            </button>
          </main>

          {/* Right Sidebar (Search/Trends) - Desktop Only */}
          <div className="hidden lg:block w-80 xl:w-96 sticky top-0 h-screen p-6 space-y-6">
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
              <h2 className="text-xl font-black mb-4 tracking-tight">Trending</h2>
              <div className="space-y-4">
                {['#OffMe', '#AIStudio', '#SocialWeb', '#FutureOfSocial'].map((tag) => (
                  <div key={tag} className="group cursor-pointer">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Trending in Tech</p>
                    <p className="text-base font-bold text-black group-hover:underline">{tag}</p>
                    <p className="text-xs text-gray-400 font-medium">1.2k posts</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
              <h2 className="text-xl font-black mb-4 tracking-tight">Who to follow</h2>
              <div className="space-y-4">
                {[
                  { name: 'OffMe Team', handle: '@offme', photo: 'https://picsum.photos/seed/offme/100/100' },
                  { name: 'AI Studio', handle: '@aistudio', photo: 'https://picsum.photos/seed/ai/100/100' }
                ].map((user) => (
                  <div key={user.handle} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <img src={user.photo} alt={user.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <p className="text-sm font-bold text-black group-hover:underline">{user.name}</p>
                        <p className="text-xs text-gray-400 font-medium">{user.handle}</p>
                      </div>
                    </div>
                    <button className="px-4 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 transition-colors">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Post Modal */}
        <AnimatePresence>
          {isPostModalOpen && (
            <div className="fixed inset-0 z-50 sm:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPostModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-2 pb-8 shadow-2xl"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-50 mb-2">
                  <h3 className="text-xl font-black tracking-tight">New Post</h3>
                  <button 
                    onClick={() => setIsPostModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="max-h-[80vh] overflow-y-auto px-2">
                  <PostForm onSuccess={() => setIsPostModalOpen(false)} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* User Drawer */}
        <UserDrawer />

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </DrawerProvider>
  );
}
