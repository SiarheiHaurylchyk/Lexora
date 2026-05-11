import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import Layout from '@/app/layout';
import {
  ConfirmProvider,
  DocumentLang,
  LessonCallProvider,
} from '@/app/providers';
import queryClient from '@/app/queryClient';

import { AiPage } from '@/pages/AiPage';
import { AssignmentsPage } from '@/pages/AssignmentsPage';
import { BecomeTeacherPage } from '@/pages/BecomeTeacherPage';
import { ChatPage } from '@/pages/ChatPage';
import { ClassroomPage } from '@/pages/ClassroomPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DeckPage } from '@/pages/DeckPage';
import { EditDeckPage } from '@/pages/EditDeckPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { HomeHubPage } from '@/pages/HomeHubPage';
import { LandingPage } from '@/pages/LandingPage';
import { LessonCallPage } from '@/pages/LessonCallPage';
import { LessonEditPage } from '@/pages/LessonEditPage';
import { LessonsPage } from '@/pages/LessonsPage';
import { LessonViewPage } from '@/pages/LessonViewPage';
import { LoginPage } from '@/pages/LoginPage';
import { MaterialsPage } from '@/pages/MaterialsPage';
import {
  MessagesIndexPlaceholder,
  MessagesLayout,
} from '@/pages/MessagesLayout';
import { MyBookingsPage } from '@/pages/MyBookingsPage';
import { MyClassesPage } from '@/pages/MyClassesPage';
import { MyDecksPage } from '@/pages/MyDecksPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProgressPage } from '@/pages/ProgressPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SharedDecksPage } from '@/pages/SharedDecksPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { StudyPage } from '@/pages/StudyPage';
import { TeacherDetailPage } from '@/pages/TeacherDetailPage';
import { TeachersPage } from '@/pages/TeachersPage';

import { useAppSelector } from '@/shared/lib/storeHooks';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfirmProvider>
          <LessonCallProvider>
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
          </LessonCallProvider>
        </ConfirmProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition='bottom-left' />
    </QueryClientProvider>
  );
}
