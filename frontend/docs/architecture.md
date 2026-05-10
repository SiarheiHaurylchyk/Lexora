# Архитектура проекта

Фронтенд — **SPA на Vite + React**. Маршрутизация через [**React Router**](https://reactrouter.com/) (`BrowserRouter`, `Routes`, `Route`), без файлового роутинга Next.js.

Структура кода следует [Feature-Sliced Design (FSD)](https://feature-sliced.design/): слои и слайсы задают границы импортов и ответственность модулей.

- **`app/`** — корень приложения: провайдеры, декларация маршрутов, общие обёртки.
- **`pages/`** — композиция экранов под URL (тонкий слой над `widgets`).
- Остальные слои — как в каноническом FSD: `widgets`, `features`, `entities`, `shared`.

---

## Структура каталогов

```
src/
├── app/                  # Провайдеры, Router, layout-оболочка маршрутов
├── pages/                # Страницы как композиция виджетов (слайсы по экранам)
├── widgets/              # Композиционные блоки страниц
├── features/             # Пользовательские сценарии (форма, фильтры, действия)
├── entities/             # Бизнес-сущности
└── shared/               # Переиспользуемая инфраструктура
    ├── ui/               # UI kit
    ├── lib/              # Утилиты
    ├── api/              # Базовый HTTP-клиент и контракты запросов
    ├── config/           # env и константы
    └── types/            # Общие типы
```

Папка `processes` в проекте не используется; при необходимости её добавляют между `app` и `pages` по методологии FSD.

---

## Роль слоя `app/`

Слой **`app`** не связан с Next.js. Здесь находится всё, что **поднимает приложение и связывает URL с UI**:

- создание корня (`createRoot`), обёртка **`BrowserRouter`** (или аналог);
- **`Routes` / `Route`**, вложенные маршруты, редиректы, guards (например гостевые и защищённые ветки);
- глобальные провайдеры (store, i18n, TanStack Query и т.д.);
- общий layout, если он общий для группы маршрутов.

### Разрешено

- конфигурация роутера и маршрутное дерево (или вынос в отдельный модуль внутри `app`, например `app/router.tsx`);
- layout-компоненты верхнего уровня;
- провайдеры контекста и внешних библиотек.

### Запрещено

- бизнес-логика предметной области;
- прямые запросы к API из компонентов «настроек приложения» лучше не смешивать с доменом — использовать слои ниже;
- размещение экранной композиции целиком здесь — её место в **`pages/`**.

### Пример (React Router)

Маршрут связывает путь с страницей из слоя **`pages`**:

```tsx
import { Route } from 'react-router-dom';

import { DeckPage } from '@/pages/deck';

// Внутри <Routes>:
<Route path='/decks/:id' element={<DeckPage />} />;
```

---

## Роль слоя `pages/`

Слой **`pages`** — это **композиция конкретного экрана под маршрут**: страница собирает виджеты и при необходимости подключает фичи. В эталонном Next-проекте отдельной папки `pages` могло не быть (страницы жили в `app/` как `page.tsx`); здесь слой **`pages`** выделен явно под SPA и React Router.

### Разрешено

- композиция `widgets` / `features` для одного экрана;
- локальная разметка страницы, мелкая связывающая логика между блоками.

### Запрещено

- тяжёлая бизнес-логика (перенос в `features` или `entities`);
- обход public API слайсов (импорты только через `index.ts` слайса).

### Пример

```tsx
// src/pages/deck/ui/DeckPage.tsx
import { DeckViewer } from '@/widgets/deck-viewer';

export function DeckPage() {
  return <DeckViewer />;
}
```

Имя экспорта и путь к слайсу могут следовать принятому в команде неймингу (`deck-page`, `DeckPage` и т.д.).

---

## Границы слоёв

Импорт разрешён **только вниз** по таблице:

| Слой       | Может импортировать                                  |
| ---------- | ---------------------------------------------------- |
| `app`      | `pages`, `widgets`, `features`, `entities`, `shared` |
| `pages`    | `widgets`, `features`, `entities`, `shared`          |
| `widgets`  | `features`, `entities`, `shared`                     |
| `features` | `entities`, `shared`                                 |
| `entities` | `shared`                                             |
| `shared`   | ничего из внутренних слоёв (только внешние пакеты)   |

Если позже появится слой `processes`, он располагается между `app` и `pages` по документации FSD.

### Запрещённые импорты

- `feature → feature` (кросс-импорт между слайсами одного слоя мимо правил FSD)
- `entity → feature` (импорт вверх)
- `shared → entities / features / widgets / pages` (импорт вверх)
- deep-import мимо public API (`index.ts`)

---

## Public API (`index.ts`)

Каждый слайс **обязан** иметь `index.ts` — единственную точку входа.

### Правильно

```ts
import { LoginForm } from '@/features/auth/login';
import { UserCard } from '@/entities/user';
import { Button } from '@/shared/ui';
```

### Неправильно

```ts
// Deep import — минуя public API
import { LoginForm } from '@/features/auth/login/ui/LoginForm';

// Кросс-импорт feature → feature
import { useFilters } from '@/features/search/filters';
// из features/vacancies — так нельзя

// Импорт вверх entity → feature
import { useAuth } from '@/features/auth';
// из entities/user — так нельзя
```

---

## Naming conventions

| Что         | Формат       | Пример            |
| ----------- | ------------ | ----------------- |
| Папки       | `kebab-case` | `vacancy-card/`   |
| Компоненты  | `PascalCase` | `VacancyCard.tsx` |
| Хуки        | `useCamel`   | `useVacancies.ts` |
| Утилиты     | `camelCase`  | `formatDate.ts`   |
| Типы/Модели | `PascalCase` | `Vacancy.ts`      |

---

## ESLint контроль архитектуры

Ограничения проверяются через `eslint-plugin-fsd-lint` (см. `eslint.config.mjs`), в том числе:

- **`fsd/forbidden-imports`** — импорты только «вниз» по слоям FSD
- **`fsd/no-cross-slice-dependency`** — ограничения связей между слайсами внутри слоя
- **`fsd/no-public-api-sidestep`** — вход только через public API (`index.ts`)
- **`fsd/no-ui-in-business-logic`** — UI не протаскивать в доменные части нижних слоёв без нужды
- **`fsd/no-global-store-imports`** — запрет прямого импорта глобального стора вне разрешённых путей
- **`fsd/ordered-imports`** — согласованный порядок импортов (предупреждение)

---

## Куда класть новый код?

| Что нужно сделать                         | Куда класть                                        |
| ----------------------------------------- | -------------------------------------------------- |
| Новый маршрут и экран                     | объявление `Route` в `app/`, композиция в `pages/` |
| Композиция блоков на странице             | `widgets/`                                         |
| Пользовательское действие (форма, кнопка) | `features/`                                        |
| Отображение сущности (карточка, список)   | `entities/`                                        |
| Переиспользуемый UI-компонент             | `shared/ui/`                                       |
| API-клиент, хелпер запросов               | `shared/api/`                                      |
| Утилита (форматирование, валидация)       | `shared/lib/`                                      |
| Тип в нескольких слоях                    | `shared/types/` или рядом с сущностью              |
| Константы, env                            | `shared/config/`                                   |
