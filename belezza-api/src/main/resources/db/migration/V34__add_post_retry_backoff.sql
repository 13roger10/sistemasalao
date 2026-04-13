-- V34: Add exponential back-off support to posts.
--
-- proxima_tentativa_em: when the next retry is allowed.
--   NULL  → no retry scheduled (initial state or already published)
--   value → retry is allowed only after this timestamp
--
-- Backoff schedule (enforced in PostService):
--   1st failure (tentativas=1) → retry in  5 min
--   2nd failure (tentativas=2) → retry in 30 min
--   3rd failure (tentativas=3) → definitive FALHOU, no more retries, notifications sent

ALTER TABLE posts
    ADD COLUMN proxima_tentativa_em TIMESTAMP;

CREATE INDEX idx_post_retry
    ON posts (status, proxima_tentativa_em)
    WHERE status = 'FALHOU';
