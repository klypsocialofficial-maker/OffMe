import { useCallback } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

const VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [15, 40, 20],
  warning: [30, 50, 30],
  error: [50, 50, 50, 50, 80],
  selection: 8,
};

/**
 * Triggers a vibration haptic feedback pattern directly, checking for browser support first.
 * Can be used outside React React component lifecycle if needed.
 */
export function triggerHaptic(type: HapticType = 'light') {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Some mobile browsers might ignore vibration if not triggered by a user gesture.
      // Since this function is typically called on click/keydownHandlers, it works correctly.
      navigator.vibrate(VIBRATION_PATTERNS[type]);
    } catch (err) {
      // Fail silently or with warning in non-production
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Haptic feedback via Vibration API failed:', err);
      }
    }
  }
}

/**
 * React hook to trigger browser Vibration API haptic feedback.
 */
export function useHaptic() {
  const trigger = useCallback((type: HapticType = 'light') => {
    triggerHaptic(type);
  }, []);

  const isSupported = typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;

  return {
    trigger,
    isSupported,
  };
}
