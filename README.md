# ✦ Lexora — Smart Flashcard Learning Platform

A full-stack language learning platform inspired by Quizlet, built with React + Spring Boot + PostgreSQL.

---

## 🏗 Tech Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | React 19, TypeScript, Vite 7, React Router |
| Backend   | Spring Boot 2.7, Java 8, Spring Security    |
| Auth      | JWT (access + refresh tokens)               |
| Database  | PostgreSQL 15                               |
| Deploy    | Docker + Docker Compose                     |

---

## ✨ Features

### Study Modes
- **⚡ Flashcards** — 3D flip cards with keyboard shortcuts (Space, ←, →)
- **🎯 Learn** — Multiple choice questions with instant feedback
- **🧩 Match** — Drag-and-match pairs game
- **✏️ Spell** — Type the translation to reinforce spelling

### Learning Intelligence
- **SM-2 Spaced Repetition** — Algorithm schedules reviews at optimal intervals
- **Card Status Tracking** — Not started → Learning → Familiar → Known → Mastered
- **Study History** — Full session log with accuracy percentages

### Content Management
- **Deck Builder** — Create decks with color, emoji, language selection
- **Card Editor** — Inline editor with term, definition, transcription, example
- **Bulk Import** — Paste tab/semicolon/dash-separated lists to import dozens of cards at once
- **Public/Private** — Share decks with the community or keep them private

### Voice & Audio
- **Text-to-Speech** — Native browser TTS with 15+ language voices
- **Per-card pronunciation** — Click 🔊 on any card in any view
- **Auto-pronounce** — Flashcard mode speaks terms automatically

### UX & Design
- **Dark theme** — Elegant dark UI with purple/cyan accent palette
- **Responsive** — Works on all screen sizes
- **Skeleton loading** — Smooth loading states everywhere
- **Toast notifications** — Non-intrusive success/error feedback
- **Animated transitions** — Subtle fade/scale animations throughout

---

## 🚀 Quick Start

### Option 1: Docker Compose (recommended)

```bash
git clone <repo>
cd lexora
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- Database: localhost:5432

### Option 2: Manual Setup

#### 1. PostgreSQL

```bash
psql -U postgres -f init-db.sql
```

#### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

#### 3. Frontend

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8080/api npm run dev
```

---

## 📡 API Reference

### Auth endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| POST | `/api/auth/refresh` | Refresh access token |
| GET  | `/api/auth/me` | Get current user |

### Deck endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/decks/my` | My decks |
| GET  | `/api/decks/public` | Public decks (paginated) |
| GET  | `/api/decks/{id}` | Deck with cards |
| POST | `/api/decks` | Create deck |
| PUT  | `/api/decks/{id}` | Update deck |
| DELETE | `/api/decks/{id}` | Delete deck |
| POST | `/api/decks/{id}/cards` | Add card |
| PUT  | `/api/decks/{id}/cards/{cardId}` | Update card |
| DELETE | `/api/decks/{id}/cards/{cardId}` | Delete card |
| GET  | `/api/decks/search?q=` | Search public decks |

### Study endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/study/start` | Start session |
| POST | `/api/study/sessions/{id}/answer` | Record answer |
| POST | `/api/study/sessions/{id}/complete` | Complete session |
| GET  | `/api/study/history` | Study history |
| GET  | `/api/study/stats` | User stats |
| GET  | `/api/study/due-cards` | Due for review (SRS) |

---

## 🗂 Project Structure

```
lexora/
├── docker-compose.yml
├── init-db.sql
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Routes
│   │   ├── index.css            # Global design system
│   │   ├── store/
│   │   │   └── authStore.ts     # Zustand auth state
│   │   ├── services/
│   │   │   └── api.ts           # Axios API client
│   │   ├── hooks/
│   │   │   └── useSpeech.ts     # TTS hook
│   │   ├── components/
│   │   │   ├── Layout.tsx       # Sidebar layout
│   │   │   ├── DeckCard.tsx     # Deck card component
│   │   │   └── CreateDeckModal.tsx
│   │   └── pages/
│   │       ├── LandingPage.tsx  # Public home
│   │       ├── AuthPages.tsx    # Login + Register
│   │       ├── DashboardPage.tsx
│   │       ├── DeckPage.tsx     # View deck + study modes
│   │       ├── EditDeckPage.tsx # Card editor
│   │       ├── StudyPage.tsx    # All study modes
│   │       ├── ExplorePage.tsx  # Browse public decks
│   │       └── ProfilePage.tsx  # Stats + history
│   └── Dockerfile
└── backend/
    ├── pom.xml
    ├── Dockerfile
    └── src/main/java/com/lexora/
        ├── LexoraApplication.java
        ├── config/SecurityConfig.java
        ├── controller/
        │   ├── AuthController.java
        │   ├── DeckController.java
        │   └── StudyController.java
        ├── dto/Dto.java
        ├── entity/
        │   ├── User.java
        │   ├── Deck.java
        │   ├── Card.java
        │   ├── StudySession.java
        │   ├── CardProgress.java
        │   └── Tag.java
        ├── repository/
        │   ├── UserRepository.java
        │   ├── DeckRepository.java
        │   ├── CardRepository.java
        │   ├── CardProgressRepository.java
        │   └── StudySessionRepository.java
        └── security/
            ├── JwtUtils.java
            ├── JwtAuthenticationFilter.java
            └── UserDetailsServiceImpl.java
```

---

## 🔐 Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/lexora_db` | DB URL |
| `SPRING_DATASOURCE_USERNAME` | `lexora_user` | DB user |
| `SPRING_DATASOURCE_PASSWORD` | `lexora_password` | DB password |
| `APP_JWT_SECRET` | (see application.properties) | JWT signing secret |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

### Frontend

Use **Node.js ^20.19** or **≥22.12** (required by Vite). The repo pins **Vite 7.3** with Rollup for stable builds on Windows/Linux/Docker; newer **Vite 8** relies on Rolldown native bindings—if you upgrade and `vite build` fails with “Cannot find native binding”, run `npm install @rolldown/binding-win32-x64-msvc@1.0.0-rc.17 --save-dev` on Windows or fix npm optional dependencies, then retry.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` (dev: proxy to backend) | Backend API base URL (`http://localhost:8080/api` if backend not proxied) |

---

## 🗺 Roadmap (Extensibility)

This architecture is ready to extend with:

- [ ] **AI-generated cards** — GPT integration to auto-generate terms from a topic
- [ ] **Audio upload** — Custom pronunciation recordings
- [ ] **Collaborative decks** — Multi-user editing
- [ ] **Leaderboards** — Community competitions
- [ ] **Mobile app** — React Native with shared API
- [ ] **Markdown in cards** — Rich text support
- [ ] **Import from CSV/Anki** — Deck migration
- [ ] **Streak system** — Daily study gamification
- [ ] **Premium tier** — Subscription with advanced analytics
- [ ] **EdVibe-style courses** — Structured lesson paths

---

## 📄 License

MIT — free to use and modify.
