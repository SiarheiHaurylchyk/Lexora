# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lexora is a full-stack language-learning platform (Quizlet-inspired) with flashcard decks, SM-2 spaced repetition, a teacher marketplace, virtual classrooms with whiteboards, AI tutoring, and voice/TTS features.

- **Frontend:** React 19, TypeScript 5.6, Vite 7.3, React Router 6, Redux Toolkit, Radix UI, i18next
- **Backend:** Spring Boot 2.7, Java 8, Spring Data JPA, Spring Security, JWT, WebSocket
- **Database:** PostgreSQL 15
- **Auth:** JWT access + refresh tokens with Redux-persisted state

## Commands

### Frontend (`frontend/`)

```bash
npm install          # install dependencies
npm run dev          # dev server on http://localhost:3000
npm run build        # tsc --noEmit + vite build
npm run preview      # preview production build
```

### Backend (`backend/`)

```bash
mvn spring-boot:run  # dev server on http://localhost:8080
mvn package          # build JAR
```

### Full Stack (Docker)

```bash
docker-compose up -d            # start all services (frontend, backend, postgres, jitsi)
docker-compose --profile ollama up -d  # include local Ollama AI
```

## Architecture

### Frontend structure

All active frontend code lives in `frontend/src/_old/`. The FSD (Feature-Sliced Design) directories (`app/`, `entities/`, `features/`, `pages/`, `shared/`, `widgets/`) were scaffolded in a recent PR and are **empty placeholders** — new features should be built there as the migration proceeds.

**`_old/` layout:**
- `pages/` — 20+ route-level components (one per route, thin orchestration layer)
- `components/` — reusable UI and business components (40+)
- `store/` — Redux Toolkit slices: `auth` (user, JWT tokens) and `settings` (voice preferences), both persisted to `localStorage`
- `services/` — axios API client + Groq/xAI service integrations
- `hooks/` — TTS/STT hooks (`useSpeech`, `useAiNeuralTts`, `useBrowserSpeechRecognition`, `useGroqWhisperMic`)
- `lib/` — utility modules (SRS helpers, classroom whiteboard WS, YouTube, calendar, etc.)
- `i18n/` + `locales/` — i18next setup with browser language detection
- `contexts/` — `LessonCallContext` (Jitsi video call state)

**Routing** is defined in `frontend/src/App.tsx`. All authenticated routes are wrapped in `<ProtectedRoute>` and rendered inside a `<Layout>` (sidebar). Guest-only routes redirect logged-in users away.

**Vite proxy** (`vite.config.ts`): `/api` → `localhost:8080`, `/ws` → `localhost:8080` (WebSocket). In production `VITE_API_URL` is set to the real API URL.

### Backend structure

```
backend/src/main/java/com/lexora/
├── config/        # Security, RestTemplate, LessonBackfill configs
├── controller/    # 11 REST controllers (Auth, Deck, Study, Chat, AI, Classroom, Lesson, Teacher, Availability, Student, Booking)
├── entity/        # 22 JPA entities
├── repository/    # Spring Data JPA repositories
├── service/       # Business logic (AI, notifications, SRS, Jitsi, timer)
├── security/      # JWT filter + provider
├── websocket/     # Classroom whiteboard handlers
├── scheduler/     # Scheduled tasks (lesson reminders)
└── dto/           # Request/response DTOs (MapStruct mappers)
```

The backend serves all API calls at `/api/**`. CORS allows `localhost:3000` in dev. WebSocket endpoint is `/ws`.

**AI integration** is provider-agnostic: set `LEXORA_AI_PROVIDER` to `mock` (no key needed), `groq`, `xai`, `ollama`, or `deepseek`. `mock` is the default for local dev without API keys.

**SRS algorithm:** SM-2 spaced repetition is implemented server-side in `ProgressService` and surfaced via `StudyController` (`/api/study/due`).

**WebSocket:** The classroom whiteboard uses STOMP over WebSocket (max frame: 512 KB). Real-time messaging goes through the same WebSocket endpoint.

### Database

PostgreSQL schema is initialized via `init-db.sql` at container start. Database connection and credentials are configured in `backend/src/main/resources/application.properties` and overridable via environment variables (see `.env.example`).

## FSD Migration

The project is actively migrating from the `_old/` monolith to Feature-Sliced Design. When adding new features:
- Place new code in the appropriate FSD layer (`features/`, `entities/`, `shared/`, `widgets/`, `pages/`)
- Do **not** add to `_old/` unless patching an existing bug there
- FSD layer import rules: `app` → `pages` → `widgets` → `features` → `entities` → `shared` (lower layers must not import from higher ones)

## Environment Variables

Copy `.env.example` to `.env` in the repo root for Docker Compose. For manual dev:

**Frontend** — only needs `VITE_API_URL` (defaults to `/api`, proxied by Vite in dev).

**Backend** key variables:
| Variable | Default | Notes |
|---|---|---|
| `LEXORA_AI_PROVIDER` | `mock` | `mock\|groq\|xai\|ollama\|deepseek` |
| `XAI_API_KEY` / `GROQ_API_KEY` | — | Required if using those providers |
| `LEXORA_JITSI_BASE_URL` | `https://meet.jit.si` | Override for self-hosted Jitsi |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/lexora_db` | |
