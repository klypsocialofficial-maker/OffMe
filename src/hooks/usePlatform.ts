import { useState, useEffect } from 'react';

export type Platform = 'ios' | 'android' | 'desktop';

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      if (width < 768) {
        setPlatform('ios'); // Fallback to our premium Beta iOS-like layout for thin screens
      } else {
        setPlatform('desktop');
      }
    }
  }, [width]);

  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  const isMobile = isIOS || isAndroid;
  const isDesktop = platform === 'desktop';

  return { platform, isIOS, isAndroid, isMobile, isDesktop };
}
