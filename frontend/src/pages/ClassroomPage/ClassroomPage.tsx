import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@ui';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Languages,
  LayoutGrid,
  MessageCircle,
  Phone,
  Timer,
} from 'lucide-react';

import { ClassroomLessonHero } from '@/widgets/ClassroomLessonHero';
import { ClassroomLessonPanel } from '@/widgets/ClassroomLessonPanel';
import { LanguageSwitcher as LanguageSwitcherOld } from '@/widgets/LanguageSwitcher';
import { NotificationBell } from '@/widgets/NotificationBell';
import { UserMenu } from '@/widgets/UserMenu';

import { chatApi, classroomsApi, lessonsApi } from '@/shared/api/api-legacy';
import type {
  ClassroomLessonOption,
  ClassroomWorkspacePayload,
  LessonItem,
} from '@/shared/api/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import {
  clearLastClassroomPath,
  setLastClassroomPath,
} from '@/shared/lib/classroomReturn';
import { useLessonCall } from '@/shared/lib/lessonCall';
import {
  findSectionIdContainingBlock,
  lessonSectionsSorted,
} from '@/shared/lib/lessonSections';
import { useAppSelector } from '@/shared/lib/storeHooks';

const ClassroomWhiteboardOverlay = lazy(() =>
  import('@/widgets/ClassroomWhiteboardOverlay').then((m) => ({
    default: m.ClassroomWhiteboardOverlay,
  })),
);
const ClassroomReferencePanel = lazy(() =>
  import('@/widgets/ClassroomReferencePanel').then((m) => ({
    default: m.ClassroomReferencePanel,
  })),
);
const ClassroomTranslatorPanel = lazy(() =>
  import('@/widgets/ClassroomTranslatorPanel').then((m) => ({
    default: m.ClassroomTranslatorPanel,
  })),
);
const ClassroomTimerPanel = lazy(() =>
  import('@/widgets/ClassroomTimerPanel').then((m) => ({
    default: m.ClassroomTimerPanel,
  })),
);

type TabKey = 'lesson' | 'homework';
type GrammarPanelKey = 'irregular_verbs' | 'infinitive_gerund';
type DockPanelKey = 'translator' | GrammarPanelKey | 'timer';

type LessonNavFocus = { section: 'LESSON_SECTION'; lessonSectionId: number };

type LessonNavEntry = {
  navKey: string;
  domId: string;
  label: string;
  sync?: LessonNavFocus;
};

const wrapperClasses = tw`flex min-h-0 w-full flex-1 flex-col bg-[linear-gradient(180deg,var(--color-bg)_0%,var(--color-bg2)_42%,var(--color-bg3)_100%)]`;
const topBarClasses = tw`sticky top-0 z-[96] grid items-center gap-4 border-b border-border bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] backdrop-blur-[12px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] px-4 py-3`;
const tabBaseClasses = tw`relative cursor-pointer rounded-t-[10px] border-0 bg-transparent px-5 pt-2.5 pb-3 text-sm font-medium text-text2 transition-colors duration-200`;
const tabActiveClasses = tw`text-text after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:rounded-t-[3px] after:bg-gradient-to-r after:from-accent after:to-brand-light`;
const toolBtnBase = tw`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[12px] border border-border bg-surface text-text transition-colors duration-200 hover:border-brand hover:text-brand-light`;
const toolBtnActive = tw`!border-brand !bg-[rgba(124,58,237,0.15)] !text-brand-light`;
const cardClasses = tw`rounded-[20px] border border-border bg-surface p-6`;
const cardTitleClasses = tw`mb-3 font-display text-xl`;
const cardBodyClasses = tw`m-0 mb-3 text-[15px] leading-[1.6] text-text2`;
const btnGhostClasses = tw`inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-border bg-bg3 px-3.5 py-2 text-sm font-semibold text-text no-underline transition-colors duration-200 hover:border-brand`;
const btnPrimaryClasses = tw`btn btn-primary`;
const sectionNavBtnBase = tw`flex w-full cursor-pointer items-center gap-2 rounded-[10px] border-0 bg-transparent px-2.5 py-2 text-left text-sm font-medium text-text2 transition-colors duration-200 hover:bg-bg3 hover:text-text`;
const sectionNavBtnActive = tw`bg-[rgba(124,58,237,0.12)] text-brand-light`;
const sectionDotClasses = tw`inline-block h-2 w-2 shrink-0 rounded-full bg-brand-light/60`;
const selectNativeClasses = tw`rounded-[12px] border border-border bg-bg3 px-3 py-2.5 text-sm text-text outline-none focus:border-brand`;

function initials(
  user: { displayName?: string | null; username?: string } | null | undefined,
): string {
  const n = user?.displayName?.trim() || user?.username || '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

export function ClassroomPage() {
  const { linkId: linkIdParam } = useParams<{ linkId: string }>();
  const linkId = Number(linkIdParam);
  const { t } = useTranslation();
  const me = useAppSelector((s) => s.auth.user);
  const { startPipCall } = useLessonCall();
  const [ws, setWs] = useState<ClassroomWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [tab, setTab] = useState<TabKey>('lesson');
  const [activeLessonSection, setActiveLessonSection] =
    useState<string>('overview');
  const [peerChatUnread, setPeerChatUnread] = useState(0);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [dockPanel, setDockPanel] = useState<DockPanelKey | null>(null);
  const [lessonDetail, setLessonDetail] = useState<LessonItem | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [classroomLessonOptions, setClassroomLessonOptions] = useState<
    ClassroomLessonOption[]
  >([]);
  const studentFocusSerialRef = useRef(0);
  const wsRef = useRef(ws);
  // eslint-disable-next-line react-hooks/refs
  wsRef.current = ws;
  const [jumpStudentCtl, setJumpStudentCtl] = useState(0);
  const userClearedLessonRef = useRef(false);
  const autoPinLessonAttemptedRef = useRef(false);

  const load = useCallback(async () => {
    const { data } = await classroomsApi.workspace(linkId);
    setWs(data);
  }, [linkId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(linkId)) {
        toast.error(t('classroom.invalid'));
        setLoading(false);
        return;
      }
      try {
        const { data } = await classroomsApi.workspace(linkId);
        if (!cancelled) setWs(data);
      } catch (err) {
        if (!cancelled)
          toast.error(getApiErrorMessage(err) || t('classroom.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkId, t]);

  useEffect(() => {
    if (Number.isFinite(linkId)) {
      setLastClassroomPath(`/class/${linkId}`);
    }
  }, [linkId]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const refreshPeerUnread = useCallback(async () => {
    if (!ws?.peer?.id) return;
    try {
      const { data } = await chatApi.conversations();
      const row = (Array.isArray(data) ? data : []).find(
        (c) => c.peer?.id === ws.peer.id,
      );
      setPeerChatUnread(row?.unreadCount ?? 0);
    } catch {
      setPeerChatUnread(0);
    }
  }, [ws?.peer?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPeerUnread();
    const id = window.setInterval(() => void refreshPeerUnread(), 20000);
    return () => window.clearInterval(id);
  }, [refreshPeerUnread]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshPeerUnread();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshPeerUnread]);

  useEffect(() => {
    if (!dockPanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDockPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dockPanel]);

  useEffect(() => {
    const lid = ws?.activeLessonId;
    if (!lid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLessonDetail(null);
      return;
    }
    let cancelled = false;
    setLessonLoading(true);
    (async () => {
      try {
        const { data } = await lessonsApi.getLesson(lid, {
          params: { classroomLinkId: linkId },
        });
        if (!cancelled) setLessonDetail(data);
      } catch {
        if (!cancelled) {
          setLessonDetail(null);
          toast.error(t('classroom.shell.lessonLoadFailed'));
        }
      } finally {
        if (!cancelled) setLessonLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ws?.activeLessonId, t, linkId]);

  const refreshClassroomLessonOptions = useCallback(async () => {
    if (!Number.isFinite(linkId)) return;
    try {
      const { data } = await classroomsApi.eligibleLessons(linkId);
      setClassroomLessonOptions(Array.isArray(data) ? data : []);
    } catch {
      setClassroomLessonOptions([]);
    }
  }, [linkId]);

  useEffect(() => {
    if (ws == null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshClassroomLessonOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws?.asTeacher, linkId, refreshClassroomLessonOptions]);

  useEffect(() => {
    if (tab !== 'lesson') return undefined;
    const id = window.setInterval(() => {
      const cur = wsRef.current;
      if (!cur || cur.asTeacher) return;
      void (async () => {
        try {
          const { data } = await classroomsApi.lessonFocusSnapshot(linkId);
          const cur2 = wsRef.current;
          if (!cur2 || cur2.asTeacher) return;
          const snapLesson = data.activeLessonId ?? null;
          const prevLesson = cur2.activeLessonId ?? null;
          if (snapLesson !== prevLesson) {
            await load();
            return;
          }
          setWs((prev) => {
            if (!prev) return prev;
            const s = data.lessonFocusSerial ?? 0;
            const p = prev.lessonFocusSerial ?? 0;
            const ds = data.lessonFocusSection ?? null;
            const ps = prev.lessonFocusSection ?? null;
            const db = data.lessonFocusBlockId ?? null;
            const pb = prev.lessonFocusBlockId ?? null;
            const dl = data.lessonFocusLessonSectionId ?? null;
            const pl = prev.lessonFocusLessonSectionId ?? null;
            if (s === p && ds === ps && db === pb && dl === pl) return prev;
            return {
              ...prev,
              lessonFocusSerial: data.lessonFocusSerial,
              lessonFocusSection: data.lessonFocusSection ?? null,
              lessonFocusBlockId: data.lessonFocusBlockId ?? null,
              lessonFocusLessonSectionId:
                data.lessonFocusLessonSectionId ?? null,
            };
          });
        } catch {
          /* ignore */
        }
      })();
    }, 650);
    return () => window.clearInterval(id);
  }, [tab, linkId, load]);

  useEffect(() => {
    if (tab !== 'lesson') return undefined;
    const id = window.setInterval(() => {
      const cur = wsRef.current;
      if (!cur || cur.asTeacher) return;
      void load();
    }, 45000);
    return () => window.clearInterval(id);
  }, [tab, load]);

  useEffect(() => {
    if (!ws || ws.asTeacher) return;
    const serial = ws.lessonFocusSerial ?? 0;
    if (serial <= studentFocusSerialRef.current) return;
    studentFocusSerialRef.current = serial;
    const sec = ws.lessonFocusSection;
    if (!sec) return;
    const mainEl = document.getElementById('classroom-main-column');
    if (sec === 'LESSON_SECTION' && ws.lessonFocusLessonSectionId != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveLessonSection(`s-${ws.lessonFocusLessonSectionId}`);
      mainEl?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (sec === 'BLOCK' && ws.lessonFocusBlockId != null && lessonDetail) {
      const sid = findSectionIdContainingBlock(
        lessonDetail,
        ws.lessonFocusBlockId,
      );
      if (sid != null) {
        setActiveLessonSection(`s-${sid}`);
        mainEl?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [
    ws?.lessonFocusSerial,
    ws?.lessonFocusSection,
    ws?.lessonFocusBlockId,
    ws?.lessonFocusLessonSectionId,
    ws?.asTeacher,
    ws,
    lessonDetail,
  ]);

  const toggleDockPanel = (key: DockPanelKey) => {
    setDockPanel((p) => (p === key ? null : key));
  };

  const prepareAndJoin = async () => {
    setPreparing(true);
    try {
      const { data } = await classroomsApi.prepareCall(linkId);
      const url = data.builtInCallUrl?.trim();
      if (url) {
        startPipCall(url, `/class/${linkId}`);
      }
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('classroom.prepareFailed'));
    } finally {
      setPreparing(false);
    }
  };

  const joinExisting = () => {
    const url = ws?.builtInCallUrl?.trim();
    if (url) startPipCall(url, `/class/${linkId}`);
  };

  const pushTeacherFocusToLessonSection = useCallback(
    async (lessonSectionId: number) => {
      try {
        const { data } = await classroomsApi.patchLessonFocus(linkId, {
          section: 'LESSON_SECTION',
          lessonSectionId,
        });
        setWs(data);
      } catch (err) {
        toast.error(
          getApiErrorMessage(err) || t('classroom.shell.focusPushFailed'),
        );
      }
    },
    [linkId, t],
  );

  const scrollToElement = (elementId: string, lessonNavKey?: string) => {
    document
      .getElementById(elementId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (lessonNavKey != null) setActiveLessonSection(lessonNavKey);
  };

  const openAssignmentsTab = (hwId?: number) => {
    setTab('homework');
    window.setTimeout(() => {
      if (hwId != null) {
        document
          .getElementById(`classroom-hw-${hwId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  const homeworkTodoCount = useMemo(() => {
    if (!ws) return 0;
    return ws.assignments.filter((a) => !a.completedByStudent).length;
  }, [ws]);

  const lessonNavEntries: LessonNavEntry[] = useMemo(() => {
    if (!ws) return [];
    const secs =
      ws.activeLessonId && lessonDetail
        ? lessonSectionsSorted(lessonDetail)
        : [];

    if (secs.length > 0) {
      return secs.map((s, idx) => ({
        navKey: `s-${s.id}`,
        domId: `classroom-lesson-section-${s.id}`,
        label: `${idx + 1}. ${s.title}`,
        sync: { section: 'LESSON_SECTION' as const, lessonSectionId: s.id },
      }));
    }

    return [
      {
        navKey: 'overview',
        domId: 'classroom-segment-overview',
        label: t('classroom.shell.sectionOverview'),
      },
    ];
  }, [ws, lessonDetail, t]);

  const sortedLessonSections = useMemo(
    () => lessonSectionsSorted(lessonDetail),
    [lessonDetail],
  );

  const activeLessonSectionModel = useMemo(() => {
    const m = activeLessonSection.match(/^s-(\d+)$/);
    if (!m || !lessonDetail) return null;
    const id = Number(m[1]);
    return sortedLessonSections.find((s) => s.id === id) ?? null;
  }, [activeLessonSection, lessonDetail, sortedLessonSections]);

  const classroomViewSection =
    activeLessonSectionModel ?? sortedLessonSections[0] ?? null;

  useEffect(() => {
    if (!lessonDetail?.sections?.length) return;
    const firstKey = `s-${lessonSectionsSorted(lessonDetail)[0].id}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveLessonSection((prev) => {
      const ok = lessonSectionsSorted(lessonDetail).some(
        (s) => `s-${s.id}` === prev,
      );
      return ok ? prev : firstKey;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonDetail?.id, lessonDetail?.sections]);

  useEffect(() => {
    userClearedLessonRef.current = false;
    autoPinLessonAttemptedRef.current = false;
  }, [linkId]);

  useEffect(() => {
    if (!ws || !ws.asTeacher || ws.activeLessonId != null) return;
    if (userClearedLessonRef.current) return;
    if (classroomLessonOptions.length === 0) return;
    if (autoPinLessonAttemptedRef.current) return;
    const pick = classroomLessonOptions[0];
    autoPinLessonAttemptedRef.current = true;
    void (async () => {
      try {
        const { data } = await classroomsApi.patchActiveLesson(linkId, {
          lessonId: pick.id,
        });
        setWs(data);
      } catch (err) {
        toast.error(
          getApiErrorMessage(err) || t('classroom.shell.lessonPickFailed'),
        );
      }
    })();
  }, [
    ws,
    ws?.asTeacher,
    ws?.activeLessonId,
    classroomLessonOptions,
    linkId,
    t,
  ]);

  if (!Number.isFinite(linkId)) {
    return null;
  }

  if (loading || !ws) {
    return (
      <div className={wrapperClasses}>
        <div className='px-6 py-8'>
          <Skeleton height={52} rounded={14} />
          <div className='h-6' />
          <Skeleton height={220} rounded={18} />
        </div>
      </div>
    );
  }

  const peer = ws.peer;
  const peerLabel = peer.displayName?.trim() || peer.username;

  const handleLessonNavClick = (entry: LessonNavEntry) => {
    document
      .getElementById('classroom-main-column')
      ?.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveLessonSection(entry.navKey);
  };

  const sendStudentToLessonSection = async (lessonSectionId: number) => {
    await pushTeacherFocusToLessonSection(lessonSectionId);
    setActiveLessonSection(`s-${lessonSectionId}`);
    document
      .getElementById('classroom-main-column')
      ?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const lessonTitleHeading =
    ws.activeLessonId && lessonDetail?.title
      ? lessonDetail.title
      : t('classroom.shell.welcomeTitle');
  const showLessonPlayerLayout = Boolean(
    ws.activeLessonId && lessonDetail && !lessonLoading,
  );

  return (
    <div className={wrapperClasses}>
      <header className={topBarClasses}>
        <div className='flex items-center gap-3'>
          <Link
            to='/classes'
            className='text-text2 hover:text-brand-light inline-flex items-center gap-1.5 text-sm font-semibold no-underline'
            onClick={() => clearLastClassroomPath()}
          >
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
            {t('classroom.shell.back')}
          </Link>
          <div
            className='from-brand to-accent flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white'
            aria-hidden
          >
            {initials(peer)}
          </div>
        </div>

        <div className='flex items-end justify-center gap-1' role='tablist'>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'lesson'}
            className={cn(tabBaseClasses, tab === 'lesson' && tabActiveClasses)}
            onClick={() => setTab('lesson')}
          >
            {t('classroom.shell.tabLesson')}
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'homework'}
            className={cn(
              tabBaseClasses,
              tab === 'homework' && tabActiveClasses,
            )}
            onClick={() => setTab('homework')}
          >
            {t('classroom.shell.tabHomework')}
            {homeworkTodoCount > 0 && (
              <span className='bg-danger ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white'>
                {homeworkTodoCount > 99 ? '99+' : homeworkTodoCount}
              </span>
            )}
          </button>
        </div>

        <div className='flex items-center justify-end gap-3'>
          <div className='flex items-center gap-2 max-[640px]:hidden'>
            <LanguageSwitcherOld compact />
            <NotificationBell placement='header' />
            <UserMenu placement='header' />
          </div>
          <div className='flex' aria-hidden>
            <span
              className='border-bg2 from-brand to-brand-light flex h-8 w-8 items-center justify-center rounded-full border-2 bg-gradient-to-br text-xs font-bold text-white'
              title={me?.username}
            >
              {initials(me)}
            </span>
            <span
              className='border-bg2 from-accent to-success -ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-gradient-to-br text-xs font-bold text-white'
              title={peer.username}
            >
              {initials(peer)}
            </span>
          </div>
        </div>
      </header>

      <div className='grid min-h-0 flex-1 grid-cols-[64px_minmax(0,1fr)_320px] gap-0 max-[1100px]:grid-cols-[56px_minmax(0,1fr)_280px] max-[820px]:grid-cols-1 max-[820px]:[&>aside]:hidden'>
        <aside
          className='border-border flex flex-col items-center gap-2.5 border-r bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)] py-4'
          aria-label={t('classroom.shell.toolsAria')}
        >
          {peer.id != null && (
            <Link
              to={`/messages/${peer.id}`}
              className={toolBtnBase}
              aria-label={t('chat.open')}
              onClick={() => void refreshPeerUnread()}
            >
              <MessageCircle size={22} strokeWidth={2} aria-hidden />
              {peerChatUnread > 0 && (
                <span className='bg-danger absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white'>
                  {peerChatUnread > 99 ? '99+' : peerChatUnread}
                </span>
              )}
            </Link>
          )}
          <button
            type='button'
            className={cn(
              toolBtnBase,
              dockPanel === 'translator' && toolBtnActive,
            )}
            aria-label={t('classroom.shell.toolTranslate')}
            aria-pressed={dockPanel === 'translator'}
            onClick={() => toggleDockPanel('translator')}
          >
            <Languages size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type='button'
            className={cn(
              toolBtnBase,
              dockPanel === 'irregular_verbs' && toolBtnActive,
            )}
            aria-label={t('classroom.shell.toolIrregularVerbs')}
            aria-pressed={dockPanel === 'irregular_verbs'}
            onClick={() => toggleDockPanel('irregular_verbs')}
          >
            <ClipboardList size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type='button'
            className={cn(
              toolBtnBase,
              dockPanel === 'infinitive_gerund' && toolBtnActive,
            )}
            aria-label={t('classroom.shell.toolInfinitiveGerund')}
            aria-pressed={dockPanel === 'infinitive_gerund'}
            onClick={() => toggleDockPanel('infinitive_gerund')}
          >
            <BookOpen size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type='button'
            className={cn(toolBtnBase, dockPanel === 'timer' && toolBtnActive)}
            aria-label={t('classroom.shell.toolTimer')}
            aria-pressed={dockPanel === 'timer'}
            onClick={() => toggleDockPanel('timer')}
          >
            <Timer size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type='button'
            className={cn(toolBtnBase, whiteboardOpen && toolBtnActive)}
            aria-label={t('classroom.shell.toolLayout')}
            aria-pressed={whiteboardOpen}
            onClick={() => setWhiteboardOpen(true)}
          >
            <LayoutGrid size={22} strokeWidth={2} aria-hidden />
          </button>
        </aside>

        <Suspense fallback={null}>
          {dockPanel === 'translator' && (
            <ClassroomTranslatorPanel onClose={() => setDockPanel(null)} />
          )}
          {dockPanel === 'irregular_verbs' && (
            <ClassroomReferencePanel
              kind='irregular_verbs'
              onClose={() => setDockPanel(null)}
            />
          )}
          {dockPanel === 'infinitive_gerund' && (
            <ClassroomReferencePanel
              kind='infinitive_gerund'
              onClose={() => setDockPanel(null)}
            />
          )}
          {dockPanel === 'timer' && (
            <ClassroomTimerPanel
              linkId={linkId}
              asTeacher={ws.asTeacher}
              onClose={() => setDockPanel(null)}
            />
          )}
        </Suspense>

        <main
          id='classroom-main-column'
          className='min-h-0 overflow-y-auto px-6 py-6 max-[640px]:px-4'
        >
          {tab === 'lesson' && (
            <>
              {!showLessonPlayerLayout && (
                <>
                  <h1 className='font-display m-0 mb-2 text-3xl tracking-[-0.02em]'>
                    {lessonTitleHeading}
                  </h1>
                  <p className='text-text2 mb-6 text-base leading-[1.55]'>
                    {ws.asTeacher
                      ? t('classroom.shell.welcomeLeadTeacher', {
                          name: peerLabel,
                        })
                      : t('classroom.shell.welcomeLeadStudent', {
                          name: peerLabel,
                        })}
                  </p>
                </>
              )}
              {showLessonPlayerLayout && (
                <p className='text-text2 mt-0 mb-6 text-base leading-[1.55]'>
                  {t('classroom.shell.lessonLiveLead', { name: peerLabel })}
                </p>
              )}

              {showLessonPlayerLayout &&
                !ws.asTeacher &&
                classroomLessonOptions.length >= 2 &&
                ws.activeLessonId != null &&
                classroomLessonOptions.some(
                  (o) => o.id === ws.activeLessonId,
                ) && (
                  <div className='border-border bg-bg3 mb-6 rounded-[16px] border p-4'>
                    <label
                      className='text-text3 mb-2 block text-xs tracking-[0.06em] uppercase'
                      htmlFor={`classroom-student-lesson-${linkId}`}
                    >
                      {t('classroom.shell.switchLesson')}
                    </label>
                    <div className='flex items-center gap-2'>
                      <select
                        id={`classroom-student-lesson-${linkId}`}
                        className={cn(selectNativeClasses, 'flex-1')}
                        value={ws.activeLessonId}
                        onChange={(e) => {
                          const lessonId = Number(e.target.value);
                          if (!Number.isFinite(lessonId)) return;
                          void (async () => {
                            try {
                              const { data } =
                                await classroomsApi.patchActiveLesson(linkId, {
                                  lessonId,
                                });
                              setWs(data);
                            } catch (err) {
                              toast.error(
                                getApiErrorMessage(err) ||
                                  t('classroom.shell.lessonPickFailed'),
                              );
                            }
                          })();
                        }}
                        aria-label={t('classroom.shell.switchLesson')}
                      >
                        {classroomLessonOptions.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className='text-text3 mt-2 text-xs'>
                      {t('classroom.shell.switchLessonStudentHelp')}
                    </p>
                  </div>
                )}

              {ws.asTeacher && (
                <section className='mb-6'>
                  <div className={cardClasses}>
                    <h2 className={cardTitleClasses}>
                      {t('classroom.shell.lessonPickerTitle')}
                    </h2>
                    <p className={cardBodyClasses}>
                      {t('classroom.shell.lessonPickerHelp')}
                    </p>
                    <p className='text-text3 -mt-2 mb-3 text-[13px]'>
                      {t('classroom.shell.lessonPickerHelpDrafts', {
                        name: peerLabel,
                      })}
                    </p>
                    {classroomLessonOptions.length === 0 && (
                      <p className='text-text3 m-0 mb-3'>
                        {t('classroom.shell.lessonPickerEmptyTeacher')}
                      </p>
                    )}
                    <div className='flex flex-wrap gap-3'>
                      <select
                        className={selectNativeClasses}
                        value={ws.activeLessonId ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const lessonId = raw === '' ? null : Number(raw);
                          if (lessonId === null)
                            userClearedLessonRef.current = true;
                          else userClearedLessonRef.current = false;
                          void (async () => {
                            try {
                              const { data } =
                                await classroomsApi.patchActiveLesson(linkId, {
                                  lessonId,
                                });
                              setWs(data);
                            } catch (err) {
                              toast.error(
                                getApiErrorMessage(err) ||
                                  t('classroom.shell.lessonPickFailed'),
                              );
                            }
                          })();
                        }}
                        aria-label={t('classroom.shell.lessonPickerTitle')}
                      >
                        <option value=''>
                          {t('classroom.shell.noLessonSelected')}
                        </option>
                        {classroomLessonOptions.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                            {l.draft
                              ? ` (${t('classroom.shell.lessonDraftSuffix')})`
                              : ''}
                          </option>
                        ))}
                      </select>
                      <Link to='/lessons' className={btnGhostClasses}>
                        <BookOpen size={18} aria-hidden />
                        {t('classroom.shell.browseLessons')}
                      </Link>
                      {ws.activeLessonId != null && (
                        <Link
                          to={`/lessons/${ws.activeLessonId}/edit`}
                          className={btnGhostClasses}
                        >
                          {t('classroom.shell.editLesson')}
                        </Link>
                      )}
                      {ws.activeLessonId != null && (
                        <Link
                          to={`/lessons/${ws.activeLessonId}`}
                          className={btnGhostClasses}
                        >
                          {t('classroom.shell.openLessonPage')}
                        </Link>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {!ws.activeLessonId && (
                <section id='classroom-segment-overview' className='mb-6'>
                  <div className={cardClasses}>
                    <h2 className={cardTitleClasses}>
                      {t('classroom.shell.overviewTitle')}
                    </h2>
                    <p className={cardBodyClasses}>
                      {ws.asTeacher
                        ? t('classroom.shell.overviewPickLesson')
                        : t('classroom.shell.studentWaitLesson')}
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      <Link
                        to={`/messages/${peer.id}`}
                        className={btnGhostClasses}
                      >
                        <MessageCircle size={18} aria-hidden />
                        {t('classroom.shell.openChat')}
                      </Link>
                      <button
                        type='button'
                        className={btnGhostClasses}
                        onClick={() => openAssignmentsTab()}
                      >
                        <ClipboardList size={18} aria-hidden />
                        {t('classroom.shell.jumpHomework')}
                      </button>
                    </div>
                    {!ws.asTeacher && (
                      <div className='border-border2 bg-bg3 text-text3 mt-5 rounded-[16px] border border-dashed p-8 text-center'>
                        {t('classroom.shell.placeholderVisual')}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {ws.activeLessonId != null && lessonLoading && (
                <div className='mb-6'>
                  <Skeleton height={120} rounded={18} />
                  <div className='h-3' />
                  <Skeleton height={220} rounded={18} />
                </div>
              )}

              {ws.activeLessonId != null && !lessonLoading && lessonDetail && (
                <section className='mb-6'>
                  <ClassroomLessonHero lesson={lessonDetail} />
                  {sortedLessonSections.length === 0 ? (
                    <p className={cardBodyClasses}>{t('lesson.empty')}</p>
                  ) : classroomViewSection ? (
                    <>
                      <h2 className='font-display mt-6 mb-4 text-2xl'>
                        {classroomViewSection.title}
                      </h2>
                      <ClassroomLessonPanel
                        blocks={classroomViewSection.blocks ?? []}
                      />
                    </>
                  ) : null}
                </section>
              )}

              {ws.activeLessonId != null && !lessonLoading && !lessonDetail && (
                <section className='mb-6'>
                  <div className={cardClasses}>
                    <p className={cardBodyClasses}>
                      {t('classroom.shell.lessonLoadFailed')}
                    </p>
                  </div>
                </section>
              )}
            </>
          )}

          {tab === 'homework' && (
            <>
              <h1 className='font-display m-0 mb-2 text-3xl tracking-[-0.02em]'>
                {t('classroom.shell.homeworkTitle')}
              </h1>
              <p className='text-text2 mb-6 text-base leading-[1.55]'>
                {t('classroom.shell.homeworkLead')}
              </p>
              {ws.assignments.length === 0 ? (
                <div className={cardClasses}>
                  <p className={cardBodyClasses}>{t('classroom.noHomework')}</p>
                  <Link to='/assignments' className={btnGhostClasses}>
                    {t('classroom.openAssignments')}
                  </Link>
                </div>
              ) : (
                ws.assignments.map((a) => (
                  <div
                    key={a.id}
                    id={`classroom-hw-${a.id}`}
                    className={cn(
                      cardClasses,
                      'mb-4',
                      a.completedByStudent && 'opacity-65',
                    )}
                  >
                    <h2 className={cardTitleClasses}>{a.title}</h2>
                    {a.instructions && (
                      <p className={cardBodyClasses}>{a.instructions}</p>
                    )}
                    <div className='text-text3 mb-3 text-xs'>
                      {a.completedByStudent
                        ? t('classroom.shell.hwDone')
                        : t('classroom.shell.hwTodo')}
                      {a.dueDate &&
                        ` · ${t('classroom.shell.due')}: ${a.dueDate}`}
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Link to='/assignments' className={btnPrimaryClasses}>
                        {t('classroom.openAssignments')}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </main>

        <aside className='border-border flex flex-col gap-4 border-l bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)] p-4'>
          <div className='border-border bg-bg3 rounded-[16px] border p-4'>
            <div className='text-text2 mb-3 flex items-center gap-2 text-[13px]'>
              <Phone
                size={20}
                strokeWidth={2}
                className='text-brand-light'
                aria-hidden
              />
              <span>{t('classroom.shell.callHint')}</span>
            </div>
            {ws.callRoomPrepared && ws.builtInCallUrl?.trim() ? (
              <button
                type='button'
                className='btn btn-primary w-full justify-center'
                onClick={joinExisting}
              >
                {t('classroom.shell.callPrimary')}
              </button>
            ) : (
              <button
                type='button'
                className='btn btn-primary w-full justify-center'
                disabled={preparing}
                onClick={() => void prepareAndJoin()}
              >
                {preparing
                  ? t('common.loading')
                  : t('classroom.shell.callPrepare')}
              </button>
            )}
          </div>

          <p className='text-text3 m-0 text-xs leading-[1.5]'>
            <Trans
              i18nKey='classroom.recordingInSettings'
              components={{
                link: (
                  <Link
                    to='/settings'
                    className='text-brand-light font-semibold no-underline'
                  />
                ),
              }}
            />
          </p>

          <div>
            <h3 className='text-text3 m-0 mb-3 text-xs font-extrabold tracking-[0.06em] uppercase'>
              {t('classroom.shell.sectionsTitle')}
            </h3>
            {ws.asTeacher &&
              tab === 'lesson' &&
              lessonNavEntries.some(
                (e) => e.sync?.section === 'LESSON_SECTION',
              ) &&
              showLessonPlayerLayout && (
                <div className='border-border bg-bg3 mb-4 rounded-[12px] border p-3'>
                  <label
                    className='text-text3 mb-1.5 block text-xs tracking-[0.06em] uppercase'
                    htmlFor={`classroom-jump-student-${linkId}`}
                  >
                    {t('classroom.shell.jumpStudentLabel')}
                  </label>
                  <select
                    id={`classroom-jump-student-${linkId}`}
                    key={jumpStudentCtl}
                    className={cn(selectNativeClasses, 'w-full')}
                    defaultValue=''
                    aria-label={t('classroom.shell.jumpStudentLabel')}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const lessonSectionId = Number(raw);
                      if (
                        Number.isFinite(lessonSectionId) &&
                        lessonSectionId > 0
                      ) {
                        void sendStudentToLessonSection(
                          lessonSectionId,
                        ).finally(() => setJumpStudentCtl((k) => k + 1));
                      } else {
                        setJumpStudentCtl((k) => k + 1);
                      }
                    }}
                  >
                    <option value=''>
                      {t('classroom.shell.jumpStudentPlaceholder')}
                    </option>
                    {lessonNavEntries
                      .filter((e) => e.sync?.section === 'LESSON_SECTION')
                      .map((e) => (
                        <option
                          key={e.navKey}
                          value={String(e.sync!.lessonSectionId)}
                        >
                          {e.label}
                        </option>
                      ))}
                  </select>
                  <p className='text-text3 mt-1.5 text-[11px]'>
                    {t('classroom.shell.jumpStudentHelp')}
                  </p>
                </div>
              )}
            <ul className='m-0 flex list-none flex-col gap-1 p-0'>
              {tab === 'lesson'
                ? lessonNavEntries.map((entry) => {
                    const active = activeLessonSection === entry.navKey;
                    return (
                      <li key={entry.navKey}>
                        <button
                          type='button'
                          className={cn(
                            sectionNavBtnBase,
                            active && sectionNavBtnActive,
                          )}
                          onClick={() => handleLessonNavClick(entry)}
                        >
                          <span className={sectionDotClasses} aria-hidden />
                          <span className='overflow-hidden text-ellipsis whitespace-nowrap'>
                            {entry.label}
                          </span>
                        </button>
                      </li>
                    );
                  })
                : ws.assignments.map((a) => (
                    <li key={a.id}>
                      <button
                        type='button'
                        className={sectionNavBtnBase}
                        onClick={() => scrollToElement(`classroom-hw-${a.id}`)}
                      >
                        <span className={sectionDotClasses} aria-hidden />
                        <span className='overflow-hidden text-ellipsis whitespace-nowrap'>
                          {a.title}
                        </span>
                      </button>
                    </li>
                  ))}
              {tab === 'homework' && ws.assignments.length === 0 && (
                <li className='text-text3 px-1 py-2 text-sm'>
                  {t('classroom.noHomework')}
                </li>
              )}
            </ul>
          </div>

          <div className='flex flex-col gap-2'>
            <Link
              to='/classes'
              className={btnGhostClasses}
              onClick={() => clearLastClassroomPath()}
            >
              {t('classroom.backToStudents')}
            </Link>
          </div>
        </aside>
      </div>

      <Suspense fallback={null}>
        <ClassroomWhiteboardOverlay
          open={whiteboardOpen}
          linkId={linkId}
          onClose={() => setWhiteboardOpen(false)}
        />
      </Suspense>
    </div>
  );
}
