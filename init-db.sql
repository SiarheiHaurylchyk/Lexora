-- База и пользователь уже создаются образом postgres из POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD
-- в docker-compose. Здесь только дополнительные права на схему (идемпотентно для типичного образа).

\c lexora_db

GRANT ALL ON SCHEMA public TO lexora_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lexora_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lexora_user;
