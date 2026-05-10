import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import DocumentLang from './_old/components/DocumentLang';
import Layout from './_old/components/Layout';
import { ConfirmProvider } from './_old/components/ui';
import AiPage from './_old/pages/AiPage';
import AssignmentsPage from './_old/pages/AssignmentsPage';
import { LoginPage, RegisterPage } from './_old/pages/AuthPages';
import BecomeTeacherPage from './_old/pages/BecomeTeacherPage';
import ChatPage from './_old/pages/ChatPage';
import ClassroomPage from './_old/pages/ClassroomPage';
import DashboardPage from './_old/pages/DashboardPage';
import DeckPage from './_old/pages/DeckPage';
import EditDeckPage from './_old/pages/EditDeckPage';
import ExplorePage from './_old/pages/ExplorePage';
import HomeHubPage from './_old/pages/HomeHubPage';
import LandingPage from './_old/pages/LandingPage';
import LessonCallPage from './_old/pages/LessonCallPage';
import LessonEditPage from './_old/pages/LessonEditPage';
import LessonsPage from './_old/pages/LessonsPage';
import LessonViewPage from './_old/pages/LessonViewPage';
import MaterialsPage from './_old/pages/MaterialsPage';
import MessagesLayout, {
  MessagesIndexPlaceholder,
} from './_old/pages/MessagesLayout';
import MyBookingsPage from './_old/pages/MyBookingsPage';
import MyClassesPage from './_old/pages/MyClassesPage';
import MyDecksPage from './_old/pages/MyDecksPage';
import ProfilePage from './_old/pages/ProfilePage';
import ProgressPage from './_old/pages/ProgressPage';
import SchedulePage from './_old/pages/SchedulePage';
import SettingsPage from './_old/pages/SettingsPage';
import SharedDecksPage from './_old/pages/SharedDecksPage';
import StudentsPage from './_old/pages/StudentsPage';
import StudyPage from './_old/pages/StudyPage';
import TeacherDetailPage from './_old/pages/TeacherDetailPage';
import TeachersPage from './_old/pages/TeachersPage';
import { useAppSelector } from './_old/store/hooks';

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
  return isAuthenticated ? <>{children}</> : <Navigate to='/login' replace />;
}

/** Wrap pages that only make sense for guests (login form, etc.). */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to='/home' replace />;
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
        <Toaster position='top-right' toastOptions={TOAST_OPTIONS} />
        <Routes>
          <Route
            path='/'
            element={
              <GuestRoute>
                <LandingPage />
              </GuestRoute>
            }
          />
          <Route
            path='/login'
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path='/register'
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path='/home' element={<HomeHubPage />} />
            <Route path='/decks' element={<MyDecksPage />} />
            <Route path='/dashboard' element={<DashboardPage />} />
            <Route path='/explore' element={<ExplorePage />} />
            <Route path='/teachers' element={<TeachersPage />} />
            <Route path='/teachers/:id' element={<TeacherDetailPage />} />
            <Route path='/messages' element={<MessagesLayout />}>
              <Route index element={<MessagesIndexPlaceholder />} />
              <Route path=':peerId' element={<ChatPage />} />
            </Route>
            <Route path='/chat/:peerId' element={<ChatPage />} />
            <Route path='/decks/:id' element={<DeckPage />} />
            <Route path='/decks/:id/edit' element={<EditDeckPage />} />
            <Route path='/decks/:id/study/:mode' element={<StudyPage />} />
            <Route path='/profile' element={<ProfilePage />} />
            <Route path='/settings' element={<SettingsPage />} />
            {/* Quick deep-link aliases used by the user-menu dropdown. */}
            <Route
              path='/settings/availability'
              element={<Navigate to='/schedule' replace />}
            />
            <Route path='/schedule' element={<SchedulePage />} />
            <Route path='/bookings' element={<MyBookingsPage />} />
            <Route path='/lesson-call' element={<LessonCallPage />} />
            <Route path='/assignments' element={<AssignmentsPage />} />
            <Route path='/become-teacher' element={<BecomeTeacherPage />} />
            <Route path='/progress' element={<ProgressPage />} />
            <Route path='/ai' element={<AiPage />} />

            {/* Grid of shared classrooms (both roles). */}
            <Route path='/classes' element={<MyClassesPage />} />
            {/* Teachers: roster & notes. Learners: who added me (list detail). */}
            <Route path='/students' element={<StudentsPage />} />
            <Route path='/class/:linkId' element={<ClassroomPage />} />
            <Route path='/shared' element={<SharedDecksPage />} />

            {/* Lesson pages: list, view (read-only), edit */}
            <Route path='/materials' element={<MaterialsPage />} />
            <Route path='/lessons' element={<LessonsPage />} />
            <Route path='/lessons/:id' element={<LessonViewPage />} />
            <Route path='/lessons/:id/edit' element={<LessonEditPage />} />
          </Route>

          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </ConfirmProvider>
    </BrowserRouter>
  );
}
