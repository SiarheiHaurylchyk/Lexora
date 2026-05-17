# Lexora — language learning platform

Full-stack platform for flashcards, spaced repetition, teacher marketplace, virtual classrooms, and AI tutoring. Quizlet-style decks with modern study modes and classroom tooling.

**UI languages:** English · Russian (`i18next`)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.6, Vite 7.3, Tailwind CSS v4, React Router 6 |
| State | Redux Toolkit (auth/settings), Zustand, TanStack Query v5 |
| Backend | Spring Boot 2.7, Java 8, Spring Security, JWT |
| Database | PostgreSQL 15 |
| Realtime | STOMP WebSocket (classroom whiteboard) |
| Deploy | Docker Compose |

**Frontend layout:** [Feature-Sliced Design](frontend/docs/architecture.md) (`app` → `pages` → `widgets` → `features` → `entities` → `shared`).

---

## Features

### Flashcards & study

| Mode | Description |
|------|-------------|
| **Flashcards** | 3D flip cards, keyboard shortcuts (Space, ← / →) |
| **Learn** | Multiple choice with instant feedback |
| **Match** | Tap term ↔ translation in columns (batched rounds for large decks) |
| **Spell** | Type the answer; forward / reverse prompts |
| **Drag & Match** | Drag or click to pair words in a mixed grid (EN ↔ RU pills) |
| **Scramble** | Build the answer from letter tiles |
| **Gravity** | Tap the correct match as the prompt falls |
| **Exam** | Up to 15 mixed questions (choice + typing); score only at the end |

**Study direction** (chosen before starting a session):

- `en → ru` — term first, guess translation  
- `ru → en` — translation first, guess term  
- **Mixed** — random direction per card  

### Decks & cards

- Deck builder: title, languages, color, emoji, public/private visibility  
- Inline card editor with auto-save when switching cards  
- **Bulk import** — one card per line; supports Quizlet/Excel (tab), Lexora (`term - definition`), Anki/CSV (`;`), Markdown tables; cards are saved to the API immediately  
- Optional **image URL** per term/definition (no built-in image generation)

### Learning intelligence

- **SM-2** spaced repetition (`ProgressService`, `/api/study/due-cards`)  
- Card progress: Learning → Familiar → Known → Mastered  
- Study sessions with accuracy and history  

### Voice

- Browser **text-to-speech for English only** (terms and Latin script)  
- Russian definitions are not spoken; 🔊 controls appear only when playback applies  

### Platform (beyond decks)

- Teacher marketplace and profiles  
- Virtual classrooms with whiteboard (WebSocket sync)  
- Lessons, materials, assignments, scheduling  
- AI tutor (provider-agnostic: `mock`, Groq, xAI, Ollama, DeepSeek)  
- Jitsi video integration  

---

## Quick start

### Docker Compose (recommended)

```bash
git clone <repo-url>
cd lexora
cp .env.example .env   # optional: edit AI keys, DB, Jitsi
docker-compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api |
| PostgreSQL | localhost:5432 |

### Local development

**Requirements:** Node.js ^20.19 or ≥22.12, Java 8+, Maven, PostgreSQL 15.

```bash
# Database
psql -U postgres -f init-db.sql

# Backend (port 8080)
cd backend
mvn spring-boot:run

# Frontend (port 3000; proxies /api and /ws to backend)
cd frontend
npm install
npm run dev
```

| Stack | Dev | Build / check |
|-------|-----|----------------|
| Frontend | `npm run dev` | `npm run build` · `npm run typecheck` · `npm run lint` |
| Backend | `mvn spring-boot:run` | `mvn package` |

---

## Study API

`POST /api/study/start` body:

```json
{ "deckId": 1, "mode": "FLASHCARD" }
```

**Modes:** `FLASHCARD` · `LEARN` · `MATCH` · `SPELL` · `DRAG` · `TEST`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/study/start` | Start session |
| POST | `/api/study/sessions/{id}/answer` | Record answer (SRS rating) |
| POST | `/api/study/sessions/{id}/complete` | Complete session |
| GET | `/api/study/history` | Session history |
| GET | `/api/study/stats` | Aggregated stats |
| GET | `/api/study/due-cards` | Cards due for review |
| GET | `/api/study/progress` | Streaks, heatmap, badges |

Other REST areas: auth, decks/cards, teachers, classrooms, lessons, materials, AI chat — see `backend/src/main/java/com/lexora/controller/`.

---

## Environment variables

Copy [`.env.example`](.env.example) → `.env` for Docker Compose.

### Backend (highlights)

| Variable | Default | Notes |
|----------|---------|--------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/lexora_db` | PostgreSQL |
| `LEXORA_AI_PROVIDER` | `mock` | `mock` · `groq` · `xai` · `ollama` · `deepseek` |
| `GROQ_API_KEY` / `XAI_API_KEY` | — | Required for those providers |
| `LEXORA_JITSI_BASE_URL` | `https://meet.jit.si` | Self-hosted Jitsi override |
| `APP_JWT_SECRET` | (see `application.properties`) | JWT signing |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | CORS |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base (`http://localhost:8080/api` if not using Vite proxy) |

---

## Repository layout

```
lexora/
├── docker-compose.yml
├── init-db.sql
├── frontend/                 # React SPA (FSD)
│   ├── src/
│   │   ├── app/              # Providers, layout, routes
│   │   ├── pages/            # DeckPage, StudyPage, EditDeckPage, …
│   │   ├── widgets/          # Layout chrome, classroom panels
│   │   ├── features/         # CreateDeck, CardImagePicker, …
│   │   ├── entities/         # Deck, Teacher, …
│   │   └── shared/           # api, hooks (useSpeech), locales, ui
│   └── docs/                 # architecture, TanStack Query, forms
└── backend/
    └── src/main/java/com/lexora/
        ├── controller/       # REST + study
        ├── entity/             # JPA models
        ├── service/            # SRS, AI, notifications, Jitsi, …
        ├── security/           # JWT
        └── websocket/          # Classroom whiteboard
```

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [`CLAUDE.md`](CLAUDE.md) | Repo orientation for contributors |
| [`frontend/CLAUDE.md`](frontend/CLAUDE.md) | Frontend conventions |
| [`frontend/docs/architecture.md`](frontend/docs/architecture.md) | FSD deep-dive |
| [`frontend/docs/tanstack_query.md`](frontend/docs/tanstack_query.md) | Data fetching patterns |

---

## License

Commercial License
