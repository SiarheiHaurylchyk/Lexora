/**
 * Lesson-call context — defined in the shared layer so widgets/features/pages
 * can call `useLessonCall()` without crossing FSD boundaries. The Provider
 * lives in `app/providers/LessonCallProvider.tsx` and renders the floating
 * call dock widget when a session is active.
 */
import { createContext, useContext } from 'react';

export type FloatingDockMode = 'pip' | 'max';

export interface FloatingCallSession {
  url: string;
  returnTo: string;
  dock: FloatingDockMode;
}

export interface LessonCallContextValue {
  /** Mini player top-right; user stays on the current page and can navigate the app. */
  startPipCall: (url: string, returnTo: string) => void;
  /** True while a floating call is active. */
  isCallActive: boolean;
}

export const LessonCallContext = createContext<LessonCallContextValue | null>(
  null,
);

export function useLessonCall(): LessonCallContextValue {
  const ctx = useContext(LessonCallContext);
  if (!ctx) {
    throw new Error('useLessonCall must be used within LessonCallProvider');
  }
  return ctx;
}
