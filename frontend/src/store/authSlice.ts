/**
 * Auth slice — keeps the signed-in user and their tokens in Redux.
 *
 * The shape is:
 *   {
 *     user            : the user object (or null when not signed in)
 *     accessToken     : short-lived JWT used for API calls
 *     refreshToken    : long-lived token used to get a new access token
 *     isAuthenticated : true if both user and accessToken exist
 *   }
 *
 * The whole slice is also kept in localStorage (see store/index.ts) so the
 * user stays signed in after a page refresh.
 */
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface User {
    id: number;
    username: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
    createdAt: string;
    teacherHeadline?: string | null;
    teacherBio?: string | null;
    teacherResume?: string | null;
    teacherCertificates?: Array<{
        id: number;
        title: string;
        issuer?: string | null;
        year?: string | null;
        description?: string | null;
        documentUrl?: string | null;
    }>;
    teacherIntroVideoUrl?: string | null;
    hourlyRate?: number | null;
    teachesLanguages?: string | null;
    showInTeacherDirectory?: boolean | null;
    /** ISO 639-1 target language the user is learning. */
    learningLanguage?: string | null;
    /** Shown on teacher profile / directory — how cancellations work. */
    teacherCancellationPolicy?: string | null;
    /** Pay outside Lexora — bank details, PayPal, etc. */
    teacherPaymentInfo?: string | null;
    offersTrialLesson?: boolean | null;
    cefrLevel?: string | null;
    learningGoalType?: string | null;
    learningGoalWeeks?: number | null;
    learningGoalNotes?: string | null;
}

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
}

const STORAGE_KEY = 'lexora-auth';

/** Read the saved auth state from localStorage on app start. */
function loadInitial(): AuthState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {user: null, accessToken: null, refreshToken: null, isAuthenticated: false};
        const parsed = JSON.parse(raw) as Partial<AuthState>;
        return {
            user: parsed.user ?? null,
            accessToken: parsed.accessToken ?? null,
            refreshToken: parsed.refreshToken ?? null,
            isAuthenticated: Boolean(parsed.accessToken && parsed.user),
        };
    } catch {
        return {user: null, accessToken: null, refreshToken: null, isAuthenticated: false};
    }
}

const authSlice = createSlice({
    name: 'auth',
    initialState: loadInitial(),
    reducers: {
        /** Store the user + tokens after a successful login or registration. */
        setCredentials: (
            state,
            action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
        ) => {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.isAuthenticated = true;
        },
        /** Replace just the tokens (used after refresh). */
        updateTokens: (
            state,
            action: PayloadAction<{ accessToken: string; refreshToken: string }>
        ) => {
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
        },
        /** Patch some fields on the current user (display name, avatar, ...). */
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) state.user = {...state.user, ...action.payload};
        },
        /** Clear everything — used on sign out and on auth errors. */
        logout: (state) => {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
        },
    },
});

export const {setCredentials, updateTokens, updateUser, logout} = authSlice.actions;
export const AUTH_STORAGE_KEY = STORAGE_KEY;
export default authSlice.reducer;
