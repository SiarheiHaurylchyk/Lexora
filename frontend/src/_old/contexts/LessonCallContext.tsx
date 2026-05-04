import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeLessonCallUrl } from '../lib/lessonCallUrl';
import FloatingCallDock, { type FloatingCallSession } from '../components/FloatingCallDock';

type LessonCallContextValue = {
  /** Mini player top-right; user stays on the current page and can navigate the app. */
  startPipCall: (url: string, returnTo: string) => void;
  /** True while a floating call is active. */
  isCallActive: boolean;
};

const LessonCallContext = createContext<LessonCallContextValue | null>(null);

export function useLessonCall(): LessonCallContextValue {
  const ctx = useContext(LessonCallContext);
  if (!ctx) {
    throw new Error('useLessonCall must be used within LessonCallProvider');
  }
  return ctx;
}

export function LessonCallProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<FloatingCallSession | null>(null);
  const returnToRef = useRef('/home');

  const finishCall = useCallback(() => {
    const target = returnToRef.current;
    setSession(null);
    navigate(target, { replace: true });
  }, [navigate]);

  const startPipCall = useCallback((url: string, returnTo: string) => {
    const safe = sanitizeLessonCallUrl(url);
    if (!safe) return;
    const rt = returnTo.trim().startsWith('/') ? returnTo.trim() : '/home';
    returnToRef.current = rt;
    setSession({ url: safe, returnTo: rt, dock: 'pip' });
  }, []);

  const toggleDock = useCallback(() => {
    setSession((s) => (s ? { ...s, dock: s.dock === 'pip' ? 'max' : 'pip' } : s));
  }, []);

  const value = useMemo(
    () => ({
      startPipCall,
      isCallActive: session != null,
    }),
    [startPipCall, session],
  );

  return (
    <LessonCallContext.Provider value={value}>
      {children}
      {session != null && (
        <FloatingCallDock session={session} onConferenceLeft={finishCall} onToggleDock={toggleDock} />
      )}
    </LessonCallContext.Provider>
  );
}
