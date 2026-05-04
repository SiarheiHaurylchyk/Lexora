import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppSelector } from './_old/store/hooks';

import LandingPage from './_old/pages/LandingPage';
import { LoginPage, RegisterPage } from './_old/pages/AuthPages';
import DashboardPage from './_old/pages/DashboardPage';
import HomeHubPage from './_old/pages/HomeHubPage';
import MyDecksPage from './_old/pages/MyDecksPage';
import DeckPage from './_old/pages/DeckPage';
import EditDeckPage from './_old/pages/EditDeckPage';
import StudyPage from './_old/pages/StudyPage';
import ExplorePage from './_old/pages/ExplorePage';
import TeachersPage from './_old/pages/TeachersPage';
import TeacherDetailPage from './_old/pages/TeacherDetailPage';
import ChatPage from './_old/pages/ChatPage';
import MessagesLayout, { MessagesIndexPlaceholder } from './_old/pages/MessagesLayout';
import ProfilePage from './_old/pages/ProfilePage';
import SettingsPage from './_old/pages/SettingsPage';
import SchedulePage from './_old/pages/SchedulePage';
import BecomeTeacherPage from './_old/pages/BecomeTeacherPage';
import ProgressPage from './_old/pages/ProgressPage';
import StudentsPage from './_old/pages/StudentsPage';
import MyClassesPage from './_old/pages/MyClassesPage';
import SharedDecksPage from './_old/pages/SharedDecksPage';
import LessonsPage from './_old/pages/LessonsPage';
import LessonViewPage from './_old/pages/LessonViewPage';
import LessonEditPage from './_old/pages/LessonEditPage';
import MyBookingsPage from './_old/pages/MyBookingsPage';
import LessonCallPage from './_old/pages/LessonCallPage';
import AssignmentsPage from './_old/pages/AssignmentsPage';
import ClassroomPage from './_old/pages/ClassroomPage';
import MaterialsPage from './_old/pages/MaterialsPage';
import AiPage from './_old/pages/AiPage';
import Layout from './_old/components/Layout';
import DocumentLang from './_old/components/DocumentLang';
import { ConfirmProvider } from './_old/components/ui';

/**
 * App — the top-level component. It sets up:
 *   - the router (BrowserRouter)
 *   - the global toast notifications (react-hot-toast)
 *   - and the route table (which page is shown for which URL)
 *
 * Routes are split in three groups:
 *   1. <GuestRoute>      — only for users that are NOT signed in
 *      (Landing, Login, Register).
 *   2. <ProtectedRoute>  — only for users that ARE signed in. They get the
 *      sidebar Layout around their page content.
 *   3. Catch-all "*"     — any unknown URL goes back to the landing page.
 */

/** Wrap pages that require an authenticated user; otherwise redirect to /login. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Wrap pages that only make sense for guests (login form, etc.). */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/home" replace />;
}

/** Visual style for toast popups. Kept here so all toasts look the same. */
const TOAST_OPTIONS = {
  style: {
    background: '#1E1E28',
    color: '#F4F4F8',
    border: '1px solid rgba(255,255,255,0.07)',
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: '12px',
  },
  success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
  error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
};

export default function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
        <DocumentLang />
        <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />
        <Routes>
          <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/home" element={<HomeHubPage />} />
            <Route path="/decks" element={<MyDecksPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/teachers/:id" element={<TeacherDetailPage />} />
            <Route path="/messages" element={<MessagesLayout />}>
              <Route index element={<MessagesIndexPlaceholder />} />
              <Route path=":peerId" element={<ChatPage />} />
            </Route>
            <Route path="/chat/:peerId" element={<ChatPage />} />
            <Route path="/decks/:id" element={<DeckPage />} />
            <Route path="/decks/:id/edit" element={<EditDeckPage />} />
            <Route path="/decks/:id/study/:mode" element={<StudyPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Quick deep-link aliases used by the user-menu dropdown. */}
            <Route path="/settings/availability" element={<Navigate to="/schedule" replace />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/bookings" element={<MyBookingsPage />} />
            <Route path="/lesson-call" element={<LessonCallPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/become-teacher" element={<BecomeTeacherPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/ai" element={<AiPage />} />

            {/* Grid of shared classrooms (both roles). */}
            <Route path="/classes" element={<MyClassesPage />} />
            {/* Teachers: roster & notes. Learners: who added me (list detail). */}
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/class/:linkId" element={<ClassroomPage />} />
            <Route path="/shared" element={<SharedDecksPage />} />

            {/* Lesson pages: list, view (read-only), edit */}
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/lessons/:id" element={<LessonViewPage />} />
            <Route path="/lessons/:id/edit" element={<LessonEditPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}
