import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
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
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';
import ClassroomLessonHero from '../components/classroom/ClassroomLessonHero';
import ClassroomLessonPanel from '../components/classroom/ClassroomLessonPanel';
import { classroomsApi, chatApi, lessonsApi } from '../services/api';
import type { ClassroomLessonOption, ClassroomWorkspacePayload, LessonItem } from '../services/types';
import { Skeleton } from '../components/ui';
import { getApiErrorMessage } from '../lib/apiError';
import { useLessonCall } from '../contexts/LessonCallContext';
import { useAppSelector } from '../store/hooks';
import { classNames } from '../lib/classNames';
import { clearLastClassroomPath, setLastClassroomPath } from '../lib/classroomReturn';
import { findSectionIdContainingBlock, lessonSectionsSorted } from '../lib/lessonSections';
import styles from './ClassroomPage.module.css';

const ClassroomWhiteboardOverlay = lazy(() => import('../components/classroom/ClassroomWhiteboardOverlay'));
const ClassroomReferencePanel = lazy(() => import('../components/classroom/ClassroomReferencePanel'));
const ClassroomTranslatorPanel = lazy(() => import('../components/classroom/ClassroomTranslatorPanel'));
const ClassroomTimerPanel = lazy(() => import('../components/classroom/ClassroomTimerPanel'));

type TabKey = 'lesson' | 'homework';
type GrammarPanelKey = 'irregular_verbs' | 'infinitive_gerund';
type DockPanelKey = 'translator' | GrammarPanelKey | 'timer';

type LessonNavFocus = { section: 'LESSON_SECTION'; lessonSectionId: number };

type LessonNavEntry = {
  navKey: string;
  domId: string;
  label: string;
  /** When set, teacher pushes this target so the student follows. */
  sync?: LessonNavFocus;
};

function initials(user: { displayName?: string | null; username?: string } | null | undefined): string {
  const n = user?.displayName?.trim() || user?.username || '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

export default function ClassroomPage() {
  const { linkId: linkIdParam } = useParams<{ linkId: string }>();
  const linkId = Number(linkIdParam);
  const { t } = useTranslation();
  const me = useAppSelector((s) => s.auth.user);
  const { startPipCall } = useLessonCall();
  const [ws, setWs] = useState<ClassroomWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [tab, setTab] = useState<TabKey>('lesson');
  const [activeLessonSection, setActiveLessonSection] = useState<string>('overview');
  const [peerChatUnread, setPeerChatUnread] = useState(0);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [dockPanel, setDockPanel] = useState<DockPanelKey | null>(null);
  const [lessonDetail, setLessonDetail] = useState<LessonItem | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [classroomLessonOptions, setClassroomLessonOptions] = useState<ClassroomLessonOption[]>([]);
  const studentFocusSerialRef = useRef(0);
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const [jumpStudentCtl, setJumpStudentCtl] = useState(0);
  /** Teacher chose «no lesson» in this session — do not auto-pin again. */
  const userClearedLessonRef = useRef(false);
  /** Avoid duplicate auto-pin PATCH while eligible list settles. */
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
        if (!cancelled) toast.error(getApiErrorMessage(err) || t('classroom.loadFailed'));
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

  const refreshPeerUnread = useCallback(async () => {
    if (!ws?.peer?.id) return;
    try {
      const { data } = await chatApi.conversations();
      const row = (Array.isArray(data) ? data : []).find((c) => c.peer?.id === ws.peer.id);
      setPeerChatUnread(row?.unreadCount ?? 0);
    } catch {
      setPeerChatUnread(0);
    }
  }, [ws?.peer?.id]);

  useEffect(() => {
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
      setLessonDetail(null);
      return;
    }
    let cancelled = false;
    setLessonLoading(true);
    (async () => {
      try {
        const { data } = await lessonsApi.getLesson(lid, { params: { classroomLinkId: linkId } });
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
    void refreshClassroomLessonOptions();
  }, [ws?.asTeacher, linkId, refreshClassroomLessonOptions]);

  /** Student: cheap poll for teacher-driven navigation (~0.65s). Full workspace reload if pinned lesson changes. */
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
              lessonFocusLessonSectionId: data.lessonFocusLessonSectionId ?? null,
            };
          });
        } catch {
          /* ignore */
        }
      })();
    }, 650);
    return () => window.clearInterval(id);
  }, [tab, linkId, load]);

  /** Student: occasional full workspace refresh (assignments, call URL) without hammering the server. */
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
      setActiveLessonSection(`s-${ws.lessonFocusLessonSectionId}`);
      mainEl?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (sec === 'BLOCK' && ws.lessonFocusBlockId != null && lessonDetail) {
      const sid = findSectionIdContainingBlock(lessonDetail, ws.lessonFocusBlockId);
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
        toast.error(getApiErrorMessage(err) || t('classroom.shell.focusPushFailed'));
      }
    },
    [linkId, t],
  );

  const scrollToElement = (elementId: string, lessonNavKey?: string) => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (lessonNavKey != null) setActiveLessonSection(lessonNavKey);
  };

  const openAssignmentsTab = (hwId?: number) => {
    setTab('homework');
    window.setTimeout(() => {
      if (hwId != null) {
        document.getElementById(`classroom-hw-${hwId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      ws.activeLessonId && lessonDetail ? lessonSectionsSorted(lessonDetail) : [];

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

  const sortedLessonSections = useMemo(() => lessonSectionsSorted(lessonDetail), [lessonDetail]);

  const activeLessonSectionModel = useMemo(() => {
    const m = activeLessonSection.match(/^s-(\d+)$/);
    if (!m || !lessonDetail) return null;
    const id = Number(m[1]);
    return sortedLessonSections.find((s) => s.id === id) ?? null;
  }, [activeLessonSection, lessonDetail, sortedLessonSections]);

  const classroomViewSection = activeLessonSectionModel ?? sortedLessonSections[0] ?? null;

  useEffect(() => {
    if (!lessonDetail?.sections?.length) return;
    const firstKey = `s-${lessonSectionsSorted(lessonDetail)[0].id}`;
    setActiveLessonSection((prev) => {
      const ok = lessonSectionsSorted(lessonDetail).some((s) => `s-${s.id}` === prev);
      return ok ? prev : firstKey;
    });
  }, [lessonDetail?.id, lessonDetail?.sections]);

  useEffect(() => {
    userClearedLessonRef.current = false;
    autoPinLessonAttemptedRef.current = false;
  }, [linkId]);

  /** Teacher: if nothing pinned yet, attach the latest eligible lesson so the class opens like /lessons/:id. */
  useEffect(() => {
    if (!ws || !ws.asTeacher || ws.activeLessonId != null) return;
    if (userClearedLessonRef.current) return;
    if (classroomLessonOptions.length === 0) return;
    if (autoPinLessonAttemptedRef.current) return;
    const pick = classroomLessonOptions[0];
    autoPinLessonAttemptedRef.current = true;
    void (async () => {
      try {
        const { data } = await classroomsApi.patchActiveLesson(linkId, { lessonId: pick.id });
        setWs(data);
      } catch (err) {
        toast.error(getApiErrorMessage(err) || t('classroom.shell.lessonPickFailed'));
      }
    })();
  }, [ws, ws?.asTeacher, ws?.activeLessonId, classroomLessonOptions, linkId, t]);

  if (!Number.isFinite(linkId)) {
    return null;
  }

  if (loading || !ws) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadingSkeleton}>
          <Skeleton height={52} rounded={14} />
          <div style={{ height: 24 }} />
          <Skeleton height={220} rounded={18} />
        </div>
      </div>
    );
  }

  const peer = ws.peer;
  const peerLabel = peer.displayName?.trim() || peer.username;

  const handleLessonNavClick = (entry: LessonNavEntry) => {
    document.getElementById('classroom-main-column')?.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveLessonSection(entry.navKey);
  };

  const sendStudentToLessonSection = async (lessonSectionId: number) => {
    await pushTeacherFocusToLessonSection(lessonSectionId);
    setActiveLessonSection(`s-${lessonSectionId}`);
    document.getElementById('classroom-main-column')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const lessonTitleHeading =
    ws.activeLessonId && lessonDetail?.title ? lessonDetail.title : t('classroom.shell.welcomeTitle');
  const showLessonPlayerLayout =
    Boolean(ws.activeLessonId && lessonDetail && !lessonLoading);

  return (
    <div className={styles.wrapper}>
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link
            to="/classes"
            className={styles.backLink}
            onClick={() => clearLastClassroomPath()}
          >
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
            {t('classroom.shell.back')}
          </Link>
          <div className={styles.peerThumb} aria-hidden>
            {initials(peer)}
          </div>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'lesson'}
            className={classNames(styles.tab, tab === 'lesson' && styles.tabActive)}
            onClick={() => setTab('lesson')}
          >
            {t('classroom.shell.tabLesson')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'homework'}
            className={classNames(styles.tab, tab === 'homework' && styles.tabActive)}
            onClick={() => setTab('homework')}
          >
            {t('classroom.shell.tabHomework')}
            {homeworkTodoCount > 0 && (
              <span className={styles.tabBadge}>{homeworkTodoCount > 99 ? '99+' : homeworkTodoCount}</span>
            )}
          </button>
        </div>

        <div className={styles.topRight}>
          <div className={styles.topBarExtras}>
            <LanguageSwitcher compact className={styles.topBarLang} />
            <NotificationBell placement="header" />
            <UserMenu placement="header" />
          </div>
          <div className={styles.avatarPair} aria-hidden>
            <span className={classNames(styles.avatar, styles.avatarMe)} title={me?.username}>
              {initials(me)}
            </span>
            <span className={classNames(styles.avatar, styles.avatarPeer)} title={peer.username}>
              {initials(peer)}
            </span>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={styles.toolDock} aria-label={t('classroom.shell.toolsAria')}>
          {peer.id != null && (
            <Link
              to={`/messages/${peer.id}`}
              className={styles.toolBtn}
              aria-label={t('chat.open')}
              onClick={() => void refreshPeerUnread()}
            >
              <MessageCircle size={22} strokeWidth={2} aria-hidden />
              {peerChatUnread > 0 && (
                <span className={styles.toolBadge}>{peerChatUnread > 99 ? '99+' : peerChatUnread}</span>
              )}
            </Link>
          )}
          <button
            type="button"
            className={classNames(styles.toolBtn, dockPanel === 'translator' && styles.toolBtnActive)}
            aria-label={t('classroom.shell.toolTranslate')}
            aria-pressed={dockPanel === 'translator'}
            onClick={() => toggleDockPanel('translator')}
          >
            <Languages size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={classNames(styles.toolBtn, dockPanel === 'irregular_verbs' && styles.toolBtnActive)}
            aria-label={t('classroom.shell.toolIrregularVerbs')}
            aria-pressed={dockPanel === 'irregular_verbs'}
            onClick={() => toggleDockPanel('irregular_verbs')}
          >
            <ClipboardList size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={classNames(styles.toolBtn, dockPanel === 'infinitive_gerund' && styles.toolBtnActive)}
            aria-label={t('classroom.shell.toolInfinitiveGerund')}
            aria-pressed={dockPanel === 'infinitive_gerund'}
            onClick={() => toggleDockPanel('infinitive_gerund')}
          >
            <BookOpen size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={classNames(styles.toolBtn, dockPanel === 'timer' && styles.toolBtnActive)}
            aria-label={t('classroom.shell.toolTimer')}
            aria-pressed={dockPanel === 'timer'}
            onClick={() => toggleDockPanel('timer')}
          >
            <Timer size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={classNames(styles.toolBtn, whiteboardOpen && styles.toolBtnActive)}
            aria-label={t('classroom.shell.toolLayout')}
            aria-pressed={whiteboardOpen}
            onClick={() => setWhiteboardOpen(true)}
          >
            <LayoutGrid size={22} strokeWidth={2} aria-hidden />
          </button>
        </aside>

        <Suspense fallback={null}>
          {dockPanel === 'translator' && <ClassroomTranslatorPanel onClose={() => setDockPanel(null)} />}
          {dockPanel === 'irregular_verbs' && (
            <ClassroomReferencePanel kind="irregular_verbs" onClose={() => setDockPanel(null)} />
          )}
          {dockPanel === 'infinitive_gerund' && (
            <ClassroomReferencePanel kind="infinitive_gerund" onClose={() => setDockPanel(null)} />
          )}
          {dockPanel === 'timer' && (
            <ClassroomTimerPanel linkId={linkId} asTeacher={ws.asTeacher} onClose={() => setDockPanel(null)} />
          )}
        </Suspense>

        <main id="classroom-main-column" className={styles.mainColumn}>
          {tab === 'lesson' && (
            <>
              {!showLessonPlayerLayout && (
                <>
                  <h1 className={styles.contentTitle}>{lessonTitleHeading}</h1>
                  <p className={styles.contentLead}>
                    {ws.asTeacher
                      ? t('classroom.shell.welcomeLeadTeacher', { name: peerLabel })
                      : t('classroom.shell.welcomeLeadStudent', { name: peerLabel })}
                  </p>
                </>
              )}
              {showLessonPlayerLayout && (
                <p className={styles.contentLead} style={{ marginTop: 0 }}>
                  {t('classroom.shell.lessonLiveLead', { name: peerLabel })}
                </p>
              )}

              {showLessonPlayerLayout &&
                !ws.asTeacher &&
                classroomLessonOptions.length >= 2 &&
                ws.activeLessonId != null &&
                classroomLessonOptions.some((o) => o.id === ws.activeLessonId) && (
                <div className={styles.lessonSwitchBar}>
                  <label className={styles.lessonSwitchLabel} htmlFor={`classroom-student-lesson-${linkId}`}>
                    {t('classroom.shell.switchLesson')}
                  </label>
                  <div className={styles.lessonSwitchRow}>
                    <select
                      id={`classroom-student-lesson-${linkId}`}
                      className={styles.lessonSwitchSelect}
                      value={ws.activeLessonId}
                      onChange={(e) => {
                        const lessonId = Number(e.target.value);
                        if (!Number.isFinite(lessonId)) return;
                        void (async () => {
                          try {
                            const { data } = await classroomsApi.patchActiveLesson(linkId, { lessonId });
                            setWs(data);
                          } catch (err) {
                            toast.error(getApiErrorMessage(err) || t('classroom.shell.lessonPickFailed'));
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
                    <div className={styles.lessonSwitchThumb} aria-hidden />
                  </div>
                  <p className={styles.lessonSwitchHelp}>{t('classroom.shell.switchLessonStudentHelp')}</p>
                </div>
              )}

              {ws.asTeacher && (
                <section className={styles.segment}>
                  <div className={styles.card}>
                    <h2 className={styles.cardTitle}>{t('classroom.shell.lessonPickerTitle')}</h2>
                    <p className={styles.cardBody}>{t('classroom.shell.lessonPickerHelp')}</p>
                    <p className={styles.cardBody} style={{ fontSize: 13, color: 'var(--text3)', marginTop: -6 }}>
                      {t('classroom.shell.lessonPickerHelpDrafts', { name: peerLabel })}
                    </p>
                    {classroomLessonOptions.length === 0 && (
                      <p className={styles.cardBody} style={{ color: 'var(--text3)' }}>
                        {t('classroom.shell.lessonPickerEmptyTeacher')}
                      </p>
                    )}
                    <div className={styles.actions} style={{ flexWrap: 'wrap', gap: 12 }}>
                      <select
                        className={styles.selectNative}
                        value={ws.activeLessonId ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const lessonId = raw === '' ? null : Number(raw);
                          if (lessonId === null) userClearedLessonRef.current = true;
                          else userClearedLessonRef.current = false;
                          void (async () => {
                            try {
                              const { data } = await classroomsApi.patchActiveLesson(linkId, { lessonId });
                              setWs(data);
                            } catch (err) {
                              toast.error(getApiErrorMessage(err) || t('classroom.shell.lessonPickFailed'));
                            }
                          })();
                        }}
                        aria-label={t('classroom.shell.lessonPickerTitle')}
                      >
                        <option value="">{t('classroom.shell.noLessonSelected')}</option>
                        {classroomLessonOptions.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                            {l.draft ? ` (${t('classroom.shell.lessonDraftSuffix')})` : ''}
                          </option>
                        ))}
                      </select>
                      <Link to="/lessons" className={styles.btnGhost}>
                        <BookOpen size={18} aria-hidden />
                        {t('classroom.shell.browseLessons')}
                      </Link>
                      {ws.activeLessonId != null && (
                        <Link to={`/lessons/${ws.activeLessonId}/edit`} className={styles.btnGhost}>
                          {t('classroom.shell.editLesson')}
                        </Link>
                      )}
                      {ws.activeLessonId != null && (
                        <Link to={`/lessons/${ws.activeLessonId}`} className={styles.btnGhost}>
                          {t('classroom.shell.openLessonPage')}
                        </Link>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {!ws.activeLessonId && (
                <section id="classroom-segment-overview" className={styles.segment}>
                  <div className={styles.card}>
                    <h2 className={styles.cardTitle}>{t('classroom.shell.overviewTitle')}</h2>
                    <p className={styles.cardBody}>
                      {ws.asTeacher
                        ? t('classroom.shell.overviewPickLesson')
                        : t('classroom.shell.studentWaitLesson')}
                    </p>
                    <div className={styles.actions}>
                      <Link to={`/messages/${peer.id}`} className={styles.btnGhost}>
                        <MessageCircle size={18} aria-hidden />
                        {t('classroom.shell.openChat')}
                      </Link>
                      <button type="button" className={styles.btnGhost} onClick={() => openAssignmentsTab()}>
                        <ClipboardList size={18} aria-hidden />
                        {t('classroom.shell.jumpHomework')}
                      </button>
                    </div>
                    {!ws.asTeacher && (
                      <div className={styles.mediaPlaceholder}>{t('classroom.shell.placeholderVisual')}</div>
                    )}
                  </div>
                </section>
              )}

              {ws.activeLessonId != null && lessonLoading && (
                <div className={styles.segment}>
                  <Skeleton height={120} rounded={18} />
                  <div style={{ height: 12 }} />
                  <Skeleton height={220} rounded={18} />
                </div>
              )}

              {ws.activeLessonId != null && !lessonLoading && lessonDetail && (
                <section className={styles.segment}>
                  <ClassroomLessonHero lesson={lessonDetail} />
                  {sortedLessonSections.length === 0 ? (
                    <p className={styles.cardBody}>{t('lesson.empty')}</p>
                  ) : classroomViewSection ? (
                    <>
                      <h2 className={styles.lessonSectionPageTitle}>{classroomViewSection.title}</h2>
                      <ClassroomLessonPanel blocks={classroomViewSection.blocks ?? []} />
                    </>
                  ) : null}
                </section>
              )}

              {ws.activeLessonId != null && !lessonLoading && !lessonDetail && (
                <section className={styles.segment}>
                  <div className={styles.card}>
                    <p className={styles.cardBody}>{t('classroom.shell.lessonLoadFailed')}</p>
                  </div>
                </section>
              )}
            </>
          )}

          {tab === 'homework' && (
            <>
              <h1 className={styles.contentTitle}>{t('classroom.shell.homeworkTitle')}</h1>
              <p className={styles.contentLead}>{t('classroom.shell.homeworkLead')}</p>
              {ws.assignments.length === 0 ? (
                <div className={styles.card}>
                  <p className={styles.cardBody}>{t('classroom.noHomework')}</p>
                  <Link to="/assignments" className={styles.btnGhost}>
                    {t('classroom.openAssignments')}
                  </Link>
                </div>
              ) : (
                ws.assignments.map((a) => (
                  <div
                    key={a.id}
                    id={`classroom-hw-${a.id}`}
                    className={classNames(styles.card, a.completedByStudent && styles.hwCardDone)}
                  >
                    <h2 className={styles.cardTitle}>{a.title}</h2>
                    {a.instructions && <p className={styles.cardBody}>{a.instructions}</p>}
                    <div className={styles.hwMeta}>
                      {a.completedByStudent ? t('classroom.shell.hwDone') : t('classroom.shell.hwTodo')}
                      {a.dueDate && ` · ${t('classroom.shell.due')}: ${a.dueDate}`}
                    </div>
                    <div className={styles.actions}>
                      <Link to="/assignments" className={styles.btnPrimary}>
                        {t('classroom.openAssignments')}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </main>

        <aside className={styles.rightRail}>
          <div className={styles.callCard}>
            <div className={styles.callCardHint}>
              <Phone size={20} strokeWidth={2} className={styles.callCardIcon} aria-hidden />
              <span>{t('classroom.shell.callHint')}</span>
            </div>
            {ws.callRoomPrepared && ws.builtInCallUrl?.trim() ? (
              <button type="button" className={styles.callBtn} onClick={joinExisting}>
                {t('classroom.shell.callPrimary')}
              </button>
            ) : (
              <button type="button" className={styles.callBtn} disabled={preparing} onClick={() => void prepareAndJoin()}>
                {preparing ? t('common.loading') : t('classroom.shell.callPrepare')}
              </button>
            )}
          </div>

          <p className={styles.recordingSettingsHint}>
            <Trans
              i18nKey="classroom.recordingInSettings"
              components={{
                link: <Link to="/settings" className={styles.recordingSettingsLink} />,
              }}
            />
          </p>

          <div className={styles.sectionNavWrap}>
            <h3 className={styles.sectionNavTitle}>{t('classroom.shell.sectionsTitle')}</h3>
            {ws.asTeacher &&
              tab === 'lesson' &&
              lessonNavEntries.some((e) => e.sync?.section === 'LESSON_SECTION') &&
              showLessonPlayerLayout && (
                <div className={styles.jumpStudentWrap}>
                  <label className={styles.jumpStudentLabel} htmlFor={`classroom-jump-student-${linkId}`}>
                    {t('classroom.shell.jumpStudentLabel')}
                  </label>
                  <select
                    id={`classroom-jump-student-${linkId}`}
                    key={jumpStudentCtl}
                    className={styles.selectNative}
                    defaultValue=""
                    aria-label={t('classroom.shell.jumpStudentLabel')}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const lessonSectionId = Number(raw);
                      if (Number.isFinite(lessonSectionId) && lessonSectionId > 0) {
                        void sendStudentToLessonSection(lessonSectionId).finally(() =>
                          setJumpStudentCtl((k) => k + 1),
                        );
                      } else {
                        setJumpStudentCtl((k) => k + 1);
                      }
                    }}
                  >
                    <option value="">{t('classroom.shell.jumpStudentPlaceholder')}</option>
                    {lessonNavEntries
                      .filter((e) => e.sync?.section === 'LESSON_SECTION')
                      .map((e) => (
                        <option key={e.navKey} value={String(e.sync!.lessonSectionId)}>
                          {e.label}
                        </option>
                      ))}
                  </select>
                  <p className={styles.jumpStudentHelp}>{t('classroom.shell.jumpStudentHelp')}</p>
                </div>
              )}
            <ul className={styles.sectionNavList}>
              {tab === 'lesson'
                ? lessonNavEntries.map((entry) => {
                    const active = activeLessonSection === entry.navKey;
                    return (
                      <li key={entry.navKey}>
                        <button
                          type="button"
                          className={classNames(styles.sectionNavBtn, active && styles.sectionNavBtnActive)}
                          onClick={() => handleLessonNavClick(entry)}
                        >
                          <span className={styles.sectionDot} aria-hidden />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.label}
                          </span>
                        </button>
                      </li>
                    );
                  })
                : ws.assignments.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className={styles.sectionNavBtn}
                        onClick={() => scrollToElement(`classroom-hw-${a.id}`)}
                      >
                        <span className={styles.sectionDot} aria-hidden />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                      </button>
                    </li>
                  ))}
              {tab === 'homework' && ws.assignments.length === 0 && (
                <li className={styles.cardBody} style={{ padding: '8px 4px' }}>
                  {t('classroom.noHomework')}
                </li>
              )}
            </ul>
          </div>

          <div className={styles.actions} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <Link to="/classes" className={styles.btnGhost} onClick={() => clearLastClassroomPath()}>
              {t('classroom.backToStudents')}
            </Link>
          </div>
        </aside>
      </div>

      <Suspense fallback={null}>
        <ClassroomWhiteboardOverlay open={whiteboardOpen} linkId={linkId} onClose={() => setWhiteboardOpen(false)} />
      </Suspense>
    </div>
  );
}
