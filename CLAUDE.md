# CLAUDE.md

Top-level orientation for Claude Code working on this repository. Detailed
guides live under `docs/` and in per-stack `CLAUDE.md` files.

## Project Overview

Lexora is a full-stack language-learning platform (Quizlet-inspired) with
flashcard decks, SM-2 spaced repetition, a teacher marketplace, virtual
classrooms with whiteboards, AI tutoring, and voice/TTS features.

- **Frontend** — React 19, TypeScript 5.6, Vite 7.3, Tailwind v4, FSD layout,
  Redux Toolkit + TanStack Query + Zustand. See [`frontend/CLAUDE.md`](frontend/CLAUDE.md).
- **Backend** — Spring Boot 2.7, Java 8, Spring Data JPA, Spring Security,
  JWT, WebSocket.
- **Database** — PostgreSQL 15 (schema bootstrapped from `init-db.sql`).
- **Auth** — JWT access + refresh tokens.

## Commands

| Stack    | Dev                               | Build                          |
|----------|-----------------------------------|--------------------------------|
| Frontend | `cd frontend && npm run dev`      | `cd frontend && npm run build` |
| Backend  | `cd backend && mvn spring-boot:run` | `cd backend && mvn package`  |
| Full     | `docker-compose up -d`            | —                              |

Frontend runs on `http://localhost:3000`, backend on `http://localhost:8080`.
Vite proxies `/api` and `/ws` to the backend in dev. CORS allows `localhost:3000` only.

## Backend layout

```
backend/src/main/java/com/lexora/
├── config/        # Security, RestTemplate, LessonBackfill configs
├── controller/    # 11 REST controllers
├── entity/        # 22 JPA entities
├── repository/    # Spring Data JPA repositories
├── service/       # Business logic (AI, notifications, SRS, Jitsi, timer)
├── security/      # JWT filter + provider
├── websocket/     # Classroom whiteboard handlers
├── scheduler/     # Scheduled tasks (lesson reminders)
└── dto/           # Request/response DTOs (MapStruct mappers)
```

- **AI integration** — provider-agnostic. `LEXORA_AI_PROVIDER` = `mock` (default),
  `groq`, `xai`, `ollama`, or `deepseek`.
- **SRS** — SM-2 in `ProgressService`, surfaced via `/api/study/due`.
- **WebSocket** — STOMP, max frame 512 KB.

## Environment

Copy `.env.example` → `.env` for Docker Compose. Key backend vars:

| Variable                          | Default                                       | Notes                          |
|-----------------------------------|-----------------------------------------------|--------------------------------|
| `LEXORA_AI_PROVIDER`              | `mock`                                        | `mock\|groq\|xai\|ollama\|deepseek` |
| `XAI_API_KEY` / `GROQ_API_KEY`    | —                                             | Required for those providers   |
| `LEXORA_JITSI_BASE_URL`           | `https://meet.jit.si`                         | Override for self-hosted Jitsi |
| `SPRING_DATASOURCE_URL`           | `jdbc:postgresql://localhost:5432/lexora_db`  | —                              |

Frontend only needs `VITE_API_URL` (defaults to `/api`).

## Further reading

- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — frontend conventions: FSD layers,
  TanStack Query, Tailwind/cn/tw, ESLint rules, migration status.
- [`frontend/docs/architecture.md`](frontend/docs/architecture.md) — FSD architecture deep-dive.
- [`frontend/docs/tanstack_query.md`](frontend/docs/tanstack_query.md) — query/mutation patterns.
- [`frontend/docs/form_validation.md`](frontend/docs/form_validation.md) — form-handling conventions.
