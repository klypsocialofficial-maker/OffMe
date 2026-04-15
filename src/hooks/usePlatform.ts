import { useState, useEffect } from 'react';

export type Platform = 'ios' | 'android' | 'desktop';

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  const isMobile = isIOS || isAndroid;
  const isDesktop = platform === 'desktop';

  return { platform, isIOS, isAndroid, isMobile, isDesktop };
}
