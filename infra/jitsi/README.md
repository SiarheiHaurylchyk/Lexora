# Собственный Jitsi Meet для Lexora — пошаговая инструкция

Стек из официальных образов [`jitsi/docker-jitsi-meet`](https://github.com/jitsi/docker-jitsi-meet).

## Локально в Docker: один `docker compose` (Lexora + Jitsi)

В **корне репозитория Lexora** уже объединены сервисы приложения и Jitsi — как у вас на скриншоте Docker Desktop, плюс Jitsi.

1. Убедитесь, что свободны порты **8000**, **8443**, **10000/udp** (и по-прежнему **3000**, **8080**, **5432**).
2. Из корня проекта:

   ```bash
   docker compose down
   docker compose up --build -d
   ```

   Jicofo/JVB стартуют только после **healthy** Prosody (иначе в логах бывает `Connection refused` на `xmpp.meet.jitsi:5222`, а в UI — «Вы отключены»).

   **Почему долго «Waiting» у prosody:** первый запуск пишет конфиг в `infra/jitsi/jitsi-meet-cfg/` и поднимает сертификаты/модули — часто **30–90 с**. Повторные `docker compose up` обычно заметно быстрее. Удобнее: `docker compose up -d` без ожидания в терминале.

3. Откройте Lexora: **http://localhost:3000** , класс: **http://localhost:3000/class/…**  
   Jitsi в браузере: **http://localhost:8000**

Настройки лежат в **`infra/jitsi/local.docker.env`**. Backend по умолчанию: **`LEXORA_JITSI_BASE_URL=http://localhost:8000`**, фронт — **`VITE_JITSI_ALLOW_LOCALHOST=true`**.

Звонок из Lexora идёт через **обычный iframe** на HTTP Meet (скрипт `external_api.js` по HTTPS с самоподписанным сертификатом со страницы `http://localhost:3000` у Chrome часто блокируется).

Для HTTP без TLS образ Jitsi генерирует неверные `config.bosh` / `config.websocket` (вид `https://http://localhost:8000/...`). Переопределение лежит в **`infra/jitsi/http-local-custom-config.js`** и монтируется в контейнер как **`/config/custom-config.js`** (см. корневой и `infra/jitsi/docker-compose.yml`).

Логотип Jitsi в углу звонка скрывается через **`infra/jitsi/http-local-custom-interface_config.js`** → **`/config/custom-interface_config.js`** (`SHOW_JITSI_WATERMARK = false`).

При смене режима Jitsi удалите **`infra/jitsi/jitsi-meet-cfg`** и снова выполните `docker compose up -d`.

Папка **`infra/jitsi/jitsi-meet-cfg/`** создаётся при первом запуске и в git не попадает.

Отдельно только Jitsi (без Lexora), как раньше: каталог **`infra/jitsi`** и его `docker-compose.yml` + собственный `.env`.

---

**Как это связано с Lexora**

- Backend собирает ссылку на звонок: `{базовый URL}/{id комнаты}` (см. `BuiltInCallService`, свойство `lexora.jitsi-base-url`).
- Базовый URL **должен совпадать** с **`PUBLIC_URL`** в `.env` Jitsi (без `/` в конце), например `https://meet.пример.ru`.
- Frontend встраивает комнату через **External API** (`external_api.js`). Хост Jitsi должен быть в whitelist: **`VITE_JITSI_EXTRA_HOSTS`** (иначе защита от open redirect отбросит URL).

---

## Что подготовить заранее

| Что | Зачем |
|-----|--------|
| **Сервер (VPS)** | Linux с Docker и Docker Compose v2; желательно **≥ 2 GB RAM** (Jitsi — Java + nginx + медиа). |
| **Доменное имя** (для прода) | Поддомен, например `meet.ваш-сайт.ru`, с DNS-записью на IP сервера. |
| **Docker Desktop** (Windows/macOS) или **Docker Engine** (Linux) | Команда `docker compose version` должна работать. |
| **Порты** | **TCP 80, 443** (веб + Let’s Encrypt), **UDP 10000** (медиа JVB). На локалке можно другие порты — см. ниже. |

Официальный справочник переменных: [env.example в репозитории Jitsi](https://github.com/jitsi/docker-jitsi-meet/blob/master/env.example).

---

## Часть 1. Продакшен: свой домен и HTTPS

Выполняйте на **VPS по SSH** (или локально, если гоняете тест «как в бою»).

### Шаг 1.1. DNS

1. Зайдите в панель регистратора домена (или DNS-хостинга).
2. Создайте запись типа **A**:
   - **Имя / host**: `meet` (или полное имя — зависит от панели; в итоге должно открываться `meet.ваш-домен.ru`).
   - **Значение**: публичный **IPv4** вашего VPS.
3. Подождите распространения DNS (от нескольких минут до часа). Проверка с вашего ПК:

   ```bash
   ping meet.ваш-домен.ru
   ```

   Должен отвечать IP сервера.

### Шаг 1.2. Скопировать файлы Jitsi на сервер

На сервере должен быть каталог проекта или хотя бы папка `infra/jitsi` из репозитория Lexora. Дальше все команды — **из каталога `infra/jitsi`** (где лежат `docker-compose.yml` и `.env.example`).

```bash
cd /путь/к/lexora/infra/jitsi
```

### Шаг 1.3. Создать файл `.env`

**Linux / macOS:**

```bash
cp .env.example .env
```

**Windows (PowerShell или CMD), будучи в папке `infra\jitsi`:**

```powershell
copy .env.example .env
```

### Шаг 1.4. Заполнить пароли в `.env`

Пустые поля паролей сервисов **обязательны** — без них контейнеры не поднимутся.

**Вариант A — официальный скрипт** (нужен **Git Bash** или **WSL**; из папки `infra/jitsi`, где уже есть `.env`):

```bash
curl -sSf https://raw.githubusercontent.com/jitsi/docker-jitsi-meet/stable-9584/gen-passwords.sh | bash -s
```

Скрипт **перезапишет** в `.env` строки с паролями.

**Вариант B — OpenSSL** (Linux/macOS/Git Bash):

```bash
openssl rand -hex 16
```

Скопируйте вывод в каждое поле по очереди (каждый раз новая случайная строка):

- `JICOFO_AUTH_PASSWORD`
- `JVB_AUTH_PASSWORD`
- `JIGASI_XMPP_PASSWORD`
- `JIBRI_RECORDER_PASSWORD`
- `JIBRI_XMPP_PASSWORD`

**Вариант C — PowerShell** (5 одинаковых по длине строк — можно сгенерировать 5 раз):

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
```

### Шаг 1.5. Настроить `PUBLIC_URL` и Let’s Encrypt

Откройте `.env` в редакторе и выставьте (подставьте **ваш** домен и почту):

```env
PUBLIC_URL=https://meet.ваш-домен.ru
```

Включите сертификаты и редирект на HTTPS:

```env
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.ваш-домен.ru
LETSENCRYPT_EMAIL=ваша-почта@example.com
ENABLE_HTTP_REDIRECT=1
```

Убедитесь, что **`DISABLE_HTTPS` не включён** (в `.env.example` его нет — значит HTTPS включён по умолчанию в образе).

### Шаг 1.6. Порты на хосте (прод)

Чтобы Let’s Encrypt прошёл проверку и браузеры ходили по стандартным портам, на **чистом VPS** обычно мапят так:

```env
HTTP_PORT=80
HTTPS_PORT=443
```

Если на том же сервере уже заняты 80/443, нужен **обратный прокси** (nginx/Caddy) перед Jitsi — это отдельная схема; для первого раза проще выделить машину/поддомен без конфликта портов.

### Шаг 1.7. Публичный IP для медиа (важно за NAT)

Если VPS за NAT или видео «не едет», раскомментируйте и укажите **публичный IPv4** сервера:

```env
JVB_ADVERTISE_IPS=203.0.113.50
```

Подставьте реальный IP (`curl -4 ifconfig.me` на сервере).

### Шаг 1.8. Файрвол

Пример **UFW** (Ubuntu):

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 10000/udp
sudo ufw reload
```

Убедитесь, что у хостинг-провайдера в панели тоже открыты эти порты (security groups и т.д.).

### Шаг 1.9. Первый запуск

Из каталога `infra/jitsi`:

```bash
docker compose pull
docker compose up -d
```

Подождите 1–2 минуты. Логи при проблемах:

```bash
docker compose logs -f web
docker compose logs -f jvb
```

### Шаг 1.10. Проверка в браузере

Откройте `https://meet.ваш-домен.ru` — должна открыться страница Jitsi (можно создать тестовую комнату). Если сертификат не выпустился — смотрите логи `web`, проверьте DNS и доступность порта **80 снаружи**.

---

## Часть 2. Подключить Lexora к вашему Jitsi

Базовый URL в Lexora и `PUBLIC_URL` в Jitsi должны быть **одинаковыми** (протокол + хост, без `/` в конце).

### Шаг 2.1. Backend

**Если Lexora в Docker** (корневой `docker-compose.yml` репозитория):

1. В корне проекта Lexora создайте файл **`.env`** (если его ещё нет) или добавьте строку:

   ```env
   LEXORA_JITSI_BASE_URL=https://meet.ваш-домен.ru
   ```

2. Перезапустите backend, чтобы подхватить переменную:

   ```bash
   docker compose up -d --build backend
   ```

Spring Boot сопоставляет `LEXORA_JITSI_BASE_URL` с `lexora.jitsi-base-url` в `application.properties`.

**Если backend запускаете локально** (IDE / `mvn`), задайте ту же ссылку:

- либо в `application-local.properties`:  
  `lexora.jitsi-base-url=https://meet.ваш-домен.ru`
- либо переменная окружения при старте:  
  `LEXORA_JITSI_BASE_URL=https://meet.ваш-домен.ru`

### Шаг 2.2. Frontend (обязательно whitelist хоста)

Переменные `VITE_*` **встраиваются при сборке**. После смены хоста Jitsi нужна **новая сборка** фронта.

**Docker-сборка Lexora** — в корневом `.env`:

```env
VITE_JITSI_EXTRA_HOSTS=meet.ваш-домен.ru
```

Без пробелов; несколько доменов через запятую:  
`meet.a.ru,meet.b.ru`

Пересборка:

```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

**Локальная разработка (`npm run dev`)** — в `frontend/.env.development.local` (файл создайте сами, он не обязан быть в git):

```env
VITE_JITSI_EXTRA_HOSTS=meet.ваш-домен.ru
```

Перезапустите `npm run dev`.

**Не включайте** в проде `VITE_JITSI_ALLOW_LOCALHOST` — это только для локального HTTP-Jitsi.

### Шаг 2.3. Проверка из Lexora

1. Войдите в Lexora, откройте **общий класс** с учеником/учителем.
2. Нажмите подготовку/вход в звонок.
3. Должен открыться ваш домен Jitsi, комната с UUID из backend.

Если звонок не открывается — откройте консоль браузера (F12): часто видно блокировку URL или ошибку загрузки `external_api.js`.

---

## Часть 3. Локально без домена (Windows / Docker Desktop)

Корневой **`docker compose`** + **`local.docker.env`**: Meet на **http://localhost:8000**, Lexora встраивает комнату **iframe** (без External API). Нужен **`VITE_JITSI_ALLOW_LOCALHOST=true`** (в корневом compose по умолчанию включён).

---

## Часть 4. Где что лежит

| Путь | Назначение |
|------|------------|
| `infra/jitsi/docker-compose.yml` | Сервисы Jitsi |
| `infra/jitsi/.env` | Секреты и настройки (**не коммитить**) |
| `infra/jitsi/jitsi-meet-cfg/` | Сгенерированный конфиг контейнерами (**не коммитить**, в `.gitignore`) |
| Корневой `docker-compose.yml` Lexora | `LEXORA_JITSI_BASE_URL`, build-args фронта |

---

## Часть 5. Обновление и остановка

```bash
cd infra/jitsi
docker compose pull
docker compose up -d
```

Остановка:

```bash
docker compose down
```

Данные конфигов остаются в `jitsi-meet-cfg/`. Полный сброс (осторожно): остановить контейнеры и удалить каталог `jitsi-meet-cfg`, затем снова `up -d`.

---

## Часть 6. Если «не работает»

| Симптом | Что проверить |
|---------|----------------|
| Нет сертификата / ошибка ACME | DNS на IP сервера, порт **80** открыт с интернета, верный `LETSENCRYPT_DOMAIN` |
| Чёрный экран / нет видео | **UDP 10000**, `JVB_ADVERTISE_IPS`, файрвол провайдера |
| Lexora не открывает звонок | Совпадают ли URL backend и `PUBLIC_URL`; пересобран ли фронт с `VITE_JITSI_EXTRA_HOSTS` |
| «Скрипт Jitsi не загрузился» | В браузере откройте `https://ваш-jitsi/external_api.js` — должен отдаваться JS |
| Корпоративная сеть | Нужен **TURN** (coturn), см. [handbook](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker) |

---

## Безопасность (кратко)

- При `ENABLE_AUTH=0` любой, кто знает **ссылку комнаты**, может зайти. Имена комнат у Lexora — случайные UUID, это снижает риск перебора, но не заменяет JWT.
- Для жёсткого контроля нужны **JWT** и доработка Lexora (выдача токена на backend).
