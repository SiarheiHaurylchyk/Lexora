/**
 * LessonCallProvider — concrete implementation of the lesson-call context
 * declared in `@/shared/lib/lessonCall`. Owns the floating-call session
 * state and renders the FloatingCallDock widget when a call is active.
 */
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FloatingCallDock } from '@/widgets/FloatingCallDock';

import {
  type FloatingCallSession,
  LessonCallContext,
  type LessonCallContextValue,
} from '@/shared/lib/lessonCall';
import { sanitizeLessonCallUrl } from '@/shared/lib/lessonCallUrl';

export default function LessonCallProvider({
  children,
}: {
  children: ReactNode;
}) {
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
    setSession((s) =>
      s ? { ...s, dock: s.dock === 'pip' ? 'max' : 'pip' } : s,
    );
  }, []);

  const value = useMemo<LessonCallContextValue>(
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
        <FloatingCallDock
          session={session}
          onConferenceLeft={finishCall}
          onToggleDock={toggleDock}
        />
      )}
    </LessonCallContext.Provider>
  );
}
