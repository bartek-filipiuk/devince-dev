# Pro Phase 1 — NDQS Security + Courses Buy Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the platform safe to charge real money — close the NDQS free-access bypass + the other P0 security holes, and make native courses buyable from the storefront.

**Architecture:** Two repos. **W1** (`/home/bartek/main-projects/courses-platform`, NDQS FastAPI) on branch `feat/pro-phase1-security` (from `feat/sales-bridge-auth`): 8 security fixes. **W2** (this devince repo) on branch `feat/pro-phase1-courses-buy` (from `main`): the courses buy CTA + a Stripe refund→NDQS-revoke webhook branch.

**Tech Stack:** NDQS = FastAPI + SQLAlchemy async + Alembic + Postgres + Redis + python-jose + slowapi + pytest/AsyncClient. devince = Payload 3.67 + Next 15 + vitest.

## Global Constraints

- **Two repos, separate git.** W1 commits in courses-platform (`feat/pro-phase1-security`); W2 in this repo (`feat/pro-phase1-courses-buy`). Never stage across repos. Both repos have pre-existing untracked files — stage ONLY each task's named files; never `git add -A`.
- **NDQS test harness:** `cd backend && .venv/bin/python -m pytest tests/<file> -v`. `asyncio_mode=auto`, no conftest. Authorized-endpoint tests: real `create_access_token` Bearer header (do NOT override `get_current_user_token`), override `get_db` via `app.dependency_overrides`, `patch("app.auth.dependencies.is_token_blacklisted", return_value=False)`. Service-token tests: `monkeypatch.setattr(settings, "NDQS_SERVICE_TOKEN", "secret")` + header `X-Service-Token`. Mirror `tests/test_quests.py` + `tests/test_admin_enroll.py`. There are ~25 pre-existing full-suite failures (need live Redis) — run your task's file, note that baseline, do NOT "fix" them.
- **devince:** run vitest as `DATABASE_URI=$(grep -E '^DATABASE_URI' .env | cut -d= -f2-) pnpm exec vitest run --config ./vitest.config.mts <file>`; `pnpm exec tsc --noEmit` must be clean; `pnpm build` compiles (the postbuild next-sitemap failure is pre-existing/prod-only — the `next build` itself must succeed).
- **No deploys during implementation.** Owner-gated deploy + live verification is the final phase (Task 11).
- **The canonical paid-enrollment path is `POST /api/admin/enroll-by-email`** (service-token gated, already built). Self-service `/enroll` must NOT grant paid courses.
- `get_current_user_token` returns `{"sub", "auth_method":"jwt", "role", "email", "jti", ...}` for JWT, or `{"sub", "auth_method":"api_key", "key_name"}` for API key (NO `role`). `_require_admin(token_data)` raises 403 unless `token_data.get("role")=="admin"`.

---

## File Structure

**W1 — NDQS (`courses-platform/backend/`):**
- Modify `app/courses/router.py` — gate `/enroll`; add an enrollment-check dependency used by quest/eval endpoints.
- Create `app/courses/access.py` — `require_active_enrollment(quest_id|course_id, user_id, db)` helper (the quest→course→enrollment join), honoring `revoked_at`.
- Modify `app/quests/router.py`, `app/evaluation/router.py` — apply the enrollment check.
- Modify `app/evaluation/deterministic.py` — SSRF guard in `_evaluate_url_check`.
- Create `app/net_guard.py` — `assert_public_url(url)` (scheme + resolved-IP allowlist).
- Modify `backend/Dockerfile.prod` — uvicorn proxy flags.
- Modify `app/main.py` — gate docs in prod.
- Modify `Caddyfile` — drop `/docs` + `/openapi.json` proxy.
- Create `alembic/versions/005_create_api_keys.py`; rewrite `app/auth/api_keys.py` (DB-backed, async); modify `app/auth/dependencies.py` (async api-key path + db session).
- Modify `app/auth/router.py` — delete the two dev-token endpoints.
- Create `backend/.dockerignore`.
- Create `alembic/versions/006_enrollment_revoked.py`; modify `app/courses/models.py` (`Enrollment.revoked_at`); modify `app/admin/service.py` (set/read) + `app/admin/router.py` (revoke endpoint).
- Tests: `tests/test_enrollment_access.py`, `tests/test_url_guard.py`, extend `tests/test_api_keys.py`, `tests/test_admin_enroll.py`.

**W2 — devince (`src/`):**
- Modify `src/app/courses-app/[slug]/page.tsx`, `src/app/courses-app/page.tsx` (session fetch + `enrolled`), `_components/SyllabusHero.tsx`, `_components/CtaBand.tsx`, `_components/CourseCard.tsx` (buy CTA), `src/i18n/translations.ts` (buy key).
- Create `src/utilities/ndqsRevoke.ts` + test; modify `src/app/(frontend)/api/stripe/webhook/route.ts` (refund branch).

---

## PHASE W1 — NDQS security (repo: courses-platform; branch: feat/pro-phase1-security)

### Task 1: Close the free-access bypass (#1)

**Files:**
- Create: `backend/app/courses/access.py`
- Modify: `backend/app/courses/router.py` (gate `enroll`), `backend/app/quests/router.py`, `backend/app/evaluation/router.py`
- Test: `backend/tests/test_enrollment_access.py`

**Interfaces:**
- Produces: `async def require_active_enrollment_for_quest(db, user_id: uuid.UUID, quest_id: uuid.UUID) -> None` (raises `HTTPException(403)` if not enrolled or revoked); `async def require_active_enrollment_for_course(db, user_id, course_id) -> None`.

- [ ] **Step 1: Failing test** `tests/test_enrollment_access.py` — `submit`/`briefing` for a non-enrolled user returns 403, and self-enroll without a service token returns 401/403. Mirror `test_quests.py` fixtures. Example:
```python
import uuid, pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from httpx import AsyncClient, ASGITransport
from app.auth.jwt import create_access_token
from app.database import get_db
from app.main import app

@pytest.fixture
def student_token():
    return create_access_token(data={"sub": str(uuid4()), "role": "student", "email": "s@t.com"})

def _override(db):
    async def f(): yield db
    app.dependency_overrides[get_db] = f

@pytest.mark.asyncio
async def test_enroll_without_service_token_is_blocked(student_token):
    db = AsyncMock(); _override(db)
    with patch("app.auth.dependencies.is_token_blacklisted", return_value=False):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post(f"/api/courses/{uuid4()}/enroll", headers={"Authorization": f"Bearer {student_token}"})
        assert r.status_code in (401, 403)
    app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_submit_for_non_enrolled_user_403(student_token):
    db = AsyncMock()
    # quest lookup ok, enrollment lookup -> None (not enrolled)
    quest = MagicMock(); quest.evaluation_type = "text_answer"; quest.id = uuid4()
    qres = MagicMock(); qres.scalar_one_or_none.return_value = quest
    enr = MagicMock(); enr.first.return_value = None
    db.execute.side_effect = [qres, enr]
    _override(db)
    with patch("app.auth.dependencies.is_token_blacklisted", return_value=False):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post(f"/api/quests/{quest.id}/submit",
                             headers={"Authorization": f"Bearer {student_token}"},
                             json={"type": "text_answer", "answer": "x"})
        assert r.status_code == 403
    app.dependency_overrides.pop(get_db, None)
```

- [ ] **Step 2: Run → fail** (`.venv/bin/python -m pytest tests/test_enrollment_access.py -v`): enroll currently 201/200; submit reaches FSM.

- [ ] **Step 3: Implement** `app/courses/access.py`:
```python
import uuid
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.courses.models import Enrollment
from app.quests.models import Quest

async def require_active_enrollment_for_course(db: AsyncSession, user_id: uuid.UUID, course_id: uuid.UUID) -> None:
    row = (await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id,
            Enrollment.revoked_at.is_(None),
        )
    )).first()
    if row is None:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

async def require_active_enrollment_for_quest(db: AsyncSession, user_id: uuid.UUID, quest_id: uuid.UUID) -> None:
    row = (await db.execute(
        select(Enrollment.user_id)
        .join(Quest, Quest.course_id == Enrollment.course_id)
        .where(Quest.id == quest_id, Enrollment.user_id == user_id, Enrollment.revoked_at.is_(None))
    )).first()
    if row is None:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
```
(NOTE: `Enrollment.revoked_at` is added in Task 8. Until then, use the same query WITHOUT the `revoked_at` clause; Task 8 adds the column + the clause. Implement Task 1 first WITHOUT `revoked_at`, then Task 8 adds it. To avoid churn, implement Task 8's model column FIRST if executing out of order — the controller sequences 1 before 8, so write Task 1 without `revoked_at` and Task 8 edits these two queries to add it.)

- [ ] **Step 4: Gate `enroll`** in `app/courses/router.py` — add `from app.admin.deps import require_service_token` and `dependencies=[Depends(require_service_token)]` to the `@router.post("/api/courses/{course_id}/enroll")` decorator (mirrors `admin/router.py:21`). This makes self-service enroll require the service token; the public free path is closed. The canonical paid path stays `/api/admin/enroll-by-email`.

- [ ] **Step 5: Apply enrollment check** to the content endpoints in `app/quests/router.py` (`get_briefing`, `get_quest_status`, `get_active_quest` — for `get_active_quest` use the `course_id`) and `app/evaluation/router.py` (`submit_answer`, `submit_answer_from_file`, `request_hint`). In each, after deriving `user_id = uuid.UUID(token_data["sub"])` and loading the quest (where the quest gives `course_id`), call `await require_active_enrollment_for_quest(db, user_id, quest_id)` BEFORE serving content/evaluating. Import from `app.courses.access`.

- [ ] **Step 6: Run → pass.** `.venv/bin/python -m pytest tests/test_enrollment_access.py tests/test_quests.py tests/test_evaluation.py -v` — new tests pass; existing quest/eval tests still pass (they create QuestState; add an Enrollment row to those fixtures if a test now 403s — the implementer adjusts the existing fixtures to include an enrollment mock so legitimate flows still pass).

- [ ] **Step 7: Commit.**
```bash
cd /home/bartek/main-projects/courses-platform
git add backend/app/courses/access.py backend/app/courses/router.py backend/app/quests/router.py backend/app/evaluation/router.py backend/tests/test_enrollment_access.py
git commit -m "fix(ndqs): close free-access — enroll is service-token-only + enrollment check on quest/eval"
```

---

### Task 2: SSRF guard in url_check (#2)

**Files:**
- Create: `backend/app/net_guard.py`
- Modify: `backend/app/evaluation/deterministic.py` (`_evaluate_url_check`)
- Test: `backend/tests/test_url_guard.py`

**Interfaces:**
- Produces: `async def assert_public_url(url: str, *, require_https: bool = False) -> None` — raises `ValueError` if scheme not http(s), or if ANY resolved IP is private/loopback/link-local/reserved.

- [ ] **Step 1: Failing test** `tests/test_url_guard.py`:
```python
import pytest
from app.net_guard import assert_public_url

@pytest.mark.asyncio
@pytest.mark.parametrize("bad", [
    "http://127.0.0.1/", "http://localhost/", "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/", "http://192.168.1.1/", "http://[::1]/", "file:///etc/passwd", "redis://redis:6379",
])
async def test_blocks_private_and_bad_scheme(bad):
    with pytest.raises(ValueError):
        await assert_public_url(bad)

@pytest.mark.asyncio
async def test_allows_public_https():
    await assert_public_url("https://example.com/health")  # resolves to public IP
```

- [ ] **Step 2: Run → fail** (module missing).

- [ ] **Step 3: Implement** `app/net_guard.py`:
```python
import ipaddress
import socket
from urllib.parse import urlparse

_ALLOWED_SCHEMES = {"http", "https"}

async def assert_public_url(url: str, *, require_https: bool = False) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in _ALLOWED_SCHEMES:
        raise ValueError(f"Disallowed scheme: {parsed.scheme!r}")
    if require_https and parsed.scheme != "https":
        raise ValueError("HTTPS required")
    host = parsed.hostname
    if not host:
        raise ValueError("No host in URL")
    # Resolve ALL addresses; reject if any is non-public (DNS-rebind safe-ish).
    try:
        infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror as e:
        raise ValueError(f"DNS resolution failed: {e}")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            raise ValueError(f"Non-public address blocked: {ip}")
```

- [ ] **Step 4: Wire into `_evaluate_url_check`** in `app/evaluation/deterministic.py`: before the httpx call, `from app.net_guard import assert_public_url`; `try: await assert_public_url(url, require_https=criteria.get("require_https", False))` — on `ValueError` return `{"passed": False, "error": "URL not allowed"}`. Change the client to `httpx.AsyncClient(timeout=10, follow_redirects=False)` (no redirects). (If a quest needs redirects, that's an explicit per-quest exception — out of scope; default off.)

- [ ] **Step 5: Run → pass.** `.venv/bin/python -m pytest tests/test_url_guard.py tests/test_evaluation.py -v`.

- [ ] **Step 6: Commit.** (`net_guard.py`, `deterministic.py`, `test_url_guard.py`)
```
git commit -m "fix(ndqs): SSRF guard on url_check (block private IPs + redirects + bad schemes)"
```

---

### Task 3: uvicorn proxy headers (#3)

**Files:** Modify `backend/Dockerfile.prod` (CMD).

- [ ] **Step 1: Edit the CMD** (Dockerfile.prod:86) — append `--proxy-headers --forwarded-allow-ips "*"` to the uvicorn invocation:
```dockerfile
CMD ["sh", "-c", "alembic upgrade head && python scripts/ensure_admin.py && python scripts/seed_shadow_course.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips \"*\""]
```
(Coolify terminates TLS upstream and the only path to the backend is via the trusted internal Caddy/Traefik, so trusting XFF here is correct; without it slowapi keys every client to the proxy IP.)

- [ ] **Step 2: Verify it builds** — `cd /home/bartek/main-projects/courses-platform && docker build -f backend/Dockerfile.prod -t ndqs-backend-prod ./backend` succeeds (no runtime test for a CMD flag; the build + a local `docker run` boot that logs uvicorn starting is the smoke).

- [ ] **Step 3: Commit.** `git add backend/Dockerfile.prod && git commit -m "fix(ndqs): uvicorn --proxy-headers so rate limiting keys on real client IP"`

---

### Task 4: Disable Swagger/OpenAPI in prod (#4)

**Files:** Modify `backend/app/main.py` (FastAPI construction), `Caddyfile`.

- [ ] **Step 1: Gate docs** in `app/main.py:40` — `settings` is already imported:
```python
_is_prod = settings.ENVIRONMENT == "production"
app = FastAPI(
    title="NDQS Backend",
    description="Narrative-Driven Quest Sandbox — API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)
```

- [ ] **Step 2: Drop the Caddy docs proxy** (`Caddyfile:8-13`) — remove the `handle /docs* { ... }` and `handle /openapi.json { ... }` blocks (they'd otherwise 502 to a now-404 backend path; cleaner to remove so they fall through to the frontend).

- [ ] **Step 3: Smoke** — locally, `ENVIRONMENT=production` → `GET /docs` returns 404. (A quick `tests/` assertion is optional; this is config.)

- [ ] **Step 4: Commit.** `git add backend/app/main.py Caddyfile && git commit -m "fix(ndqs): disable Swagger/OpenAPI in production"`

---

### Task 5: API-key DB persistence (#5)

**Files:**
- Create: `backend/alembic/versions/005_create_api_keys.py`
- Modify: `backend/app/auth/api_keys.py` (DB-backed, async), `backend/app/auth/dependencies.py` (async api-key path + db session)
- Test: extend `backend/tests/test_api_keys.py`

**Interfaces:**
- Produces: `async def generate_api_key(db, user_id, name, expires_at=None) -> dict`; `async def validate_api_key(db, raw_key) -> dict | None`; `async def list_user_keys(db, user_id)`; `async def revoke_key(db, key_id, user_id) -> bool`. All now take `db: AsyncSession`.

- [ ] **Step 1: Migration 005** `alembic/versions/005_create_api_keys.py` (match the 004 shape — string revision, `op.create_table`):
```python
from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "api_keys",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key_hash", sa.String(255), nullable=False),
        sa.Column("key_prefix", sa.String(20), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)
    op.create_index("ix_api_keys_user_id", "api_keys", ["user_id"])

def downgrade() -> None:
    op.drop_table("api_keys")
```

- [ ] **Step 2: Failing test** in `tests/test_api_keys.py` — a generated key validates and a revoked key does not, against a mocked async db (or, if the suite has a real test-db fixture, use it). Assert `generate_api_key`/`validate_api_key` are async and DB-backed (the raw key is `ndqs_…`, prefix 12 chars, hash is sha256). Keep `TestApiKeyModel` (already asserts columns).

- [ ] **Step 3: Rewrite `app/auth/api_keys.py`** — replace the `_api_key_store` dict with SQLAlchemy queries against `app.auth.models.ApiKey`. Keep `_hash_key` (sha256) + `KEY_PREFIX`. `generate_api_key(db, user_id, name, expires_at=None)` inserts an `ApiKey` row, commits, returns `{id, key, key_prefix, name}`. `validate_api_key(db, raw_key)` selects by `key_hash`, rejects inactive/expired, returns `{"user_id","key_id","key_name"}` or None. `list_user_keys(db, user_id)` + `revoke_key(db, key_id, user_id)` query/update.

- [ ] **Step 4: Thread a db session into `get_current_user_token`** (`app/auth/dependencies.py`) — the dep currently takes only `request`. Add `db: AsyncSession = Depends(get_db)` and `await validate_api_key(db, api_key)`. Update the api-key callers in `app/auth/router.py` (the generate/list/revoke routes) to pass `db` (they already have a `db` dep) and `await` the now-async functions.

- [ ] **Step 5: Apply migration on dev + run tests.** `cd backend && env $(grep -E '^DATABASE_URL' .env) alembic upgrade head` (creates `api_keys` on dev), then `.venv/bin/python -m pytest tests/test_api_keys.py tests/test_token_security.py -v` → pass.

- [ ] **Step 6: Commit.** (migration, api_keys.py, dependencies.py, auth/router.py, test)
```
git commit -m "fix(ndqs): persist API keys in Postgres (migration 005 + async DB-backed store)"
```

---

### Task 6: Remove dev-token endpoints (#6)

**Files:** Modify `backend/app/auth/router.py` (delete `dev_token` + `dev_auto_token`).

- [ ] **Step 1:** Delete the `@router.get("/dev/token/{user_id}")` and `@router.get("/dev/auto-token")` handlers (router.py:31-54). Confirmed no importers. Tests use `create_access_token` directly, so none break.
- [ ] **Step 2: Run** `.venv/bin/python -m pytest tests/ -q` — confirm no NEW failures beyond the ~25 baseline (env/Redis). The dev-token routes are gone.
- [ ] **Step 3: Commit.** `git add backend/app/auth/router.py && git commit -m "fix(ndqs): remove dev token-minting endpoints from the build"`

---

### Task 7: .dockerignore (#7)

**Files:** Create `backend/.dockerignore`.

- [ ] **Step 1: Create** `backend/.dockerignore`:
```
.env
.env.*
.venv
__pycache__
*.pyc
.git
.pytest_cache
tests
```
- [ ] **Step 2: Verify** the prod build still works (`docker build -f backend/Dockerfile.prod -t ndqs-backend-prod ./backend` — it copies only `app/alembic/scripts/courses`, so excluding `.env`/`.venv`/`tests` is safe).
- [ ] **Step 3: Commit.** `git add backend/.dockerignore && git commit -m "chore(ndqs): .dockerignore (keep .env/.venv/.git out of build context)"`

---

### Task 8: Enrollment revoke + entitlement record (#8a)

**Files:**
- Create: `backend/alembic/versions/006_enrollment_revoked.py`
- Modify: `backend/app/courses/models.py` (`Enrollment.revoked_at`), `backend/app/courses/access.py` (add `revoked_at IS NULL` to both queries), `backend/app/admin/router.py` (revoke endpoint), `backend/app/admin/service.py` (revoke service fn)
- Test: extend `backend/tests/test_admin_enroll.py`

**Interfaces:**
- Produces: `async def revoke_enrollment(db, email, course_id) -> dict`; `POST /api/admin/revoke-enrollment` (service-token gated), body `{email, course_id}`.

- [ ] **Step 1: Migration 006** — `ALTER TABLE enrollments ADD COLUMN revoked_at timestamptz NULL;` via `op.add_column("enrollments", sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))`; down drops it. (`revision="006"`, `down_revision="005"`.)

- [ ] **Step 2: Model** — add `revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)` to `Enrollment` (`courses/models.py`).

- [ ] **Step 3: Failing test** in `tests/test_admin_enroll.py` — `POST /api/admin/revoke-enrollment` with the service token sets `revoked_at` (and without the token → 401). Mirror the enroll-by-email test fixtures.

- [ ] **Step 4: Implement** `revoke_enrollment` in `app/admin/service.py` (find the user by email + the enrollment by (user, course); set `revoked_at = datetime.now(timezone.utc)`; commit; return status) and the `POST /api/admin/revoke-enrollment` route in `app/admin/router.py` (service-token gated via `dependencies=[Depends(require_service_token)]`, body `EnrollBody`-shaped). Add the `revoked_at IS NULL` clause to BOTH queries in `app/courses/access.py` (Task 1 left them without it).

- [ ] **Step 5: Apply migration on dev + run.** `alembic upgrade head` then `.venv/bin/python -m pytest tests/test_admin_enroll.py tests/test_enrollment_access.py -v` → pass (a revoked enrollment now 403s on quest content).

- [ ] **Step 6: Commit.** (migration, models, access.py, service.py, router.py, test)
```
git commit -m "feat(ndqs): enrollment revoke (revoked_at + admin revoke-enrollment endpoint)"
```

- [ ] **Step 7: Whole-W1 final review + STOP for deploy** — after Tasks 1–8, the controller runs a final whole-branch review of `feat/pro-phase1-security`, then this branch deploys to NDQS (owner-coordinated, Task 11). Do NOT deploy here.

---

## PHASE W2 — devince (repo: this repo; branch: feat/pro-phase1-courses-buy)

### Task 9: Courses buy button (#9)

**Files:**
- Modify: `src/app/courses-app/[slug]/page.tsx`, `src/app/courses-app/page.tsx`, `src/app/courses-app/_components/SyllabusHero.tsx`, `src/app/courses-app/_components/CtaBand.tsx`, `src/app/courses-app/_components/CourseCard.tsx`, `src/i18n/translations.ts`

**Interfaces:**
- Consumes: `program.stripePaymentLink`, `program.pricing`; the user's `purchases`.
- Produces: an `enrolled: boolean` prop threaded into SyllabusHero/CtaBand/CourseCard; a buy `<a>` (external, `href={stripePaymentLink}`) for paid + not-enrolled, else the start/continue link.

- [ ] **Step 1: Add session+enrollment to the syllabus page** (`[slug]/page.tsx`) — mirror the learn page's pattern (`learn/[lesson]/page.tsx:24-48`): `const { user } = await payload.auth({ headers: await headers() })`; `const enrolled = !!user && (user.roles?.includes('admin') || (user.purchases ?? []).some((p) => (typeof p === 'object' ? p.id : p) === program.id))`. Pass `enrolled` into `SyllabusHero` + `CtaBand`. (Page is already `force-dynamic`.)

- [ ] **Step 2: Branch the CTA in `SyllabusHero.tsx`** — add `enrolled: boolean` + accept it. Compute:
```tsx
const paidLocked = program.pricing === 'paid' && !enrolled && !!program.stripePaymentLink
// CTA: if paidLocked → external buy <a>; else the existing startHref <Link>
{paidLocked ? (
  <a className="btn btn--primary btn--lg" href={program.stripePaymentLink!} target="_blank" rel="noopener noreferrer">
    {t(locale, 'courses.syllabus.buy')}
  </a>
) : (
  <Link className="btn btn--primary btn--lg" href={startHref}>
    <span className="icon" data-i="play" aria-hidden="true" />
    <span>{enrolled ? t(locale, 'courses.syllabus.continue') : (program.ctaLabel || t(locale, 'courses.syllabus.cta'))}</span>
  </Link>
)}
```
Do the same branch in `CtaBand.tsx` (add `enrolled` prop).

- [ ] **Step 3: Storefront card buy** (`CourseCard.tsx` + `page.tsx`) — the storefront lists courses; for a paid course with a payment link, surface a "Kup" affordance. The card is currently a full `<Link>` wrapping everything — do NOT nest an `<a>` inside it (invalid HTML). Restructure: the card is a `<div className="course-card">`; the title/desc link to the syllabus (`<Link>`), and a separate buy `<a>` (or "Szczegóły" link) sits as a sibling in the card footer. Thread `enrolled` per course (the storefront page fetches the user once + checks `purchases`). Keep it minimal.

- [ ] **Step 4: i18n** — add to `src/i18n/translations.ts` under the `courses.syllabus.*` group, BOTH `pl` and `en`: `'courses.syllabus.buy'` (pl "Kup dostęp" / en "Buy access"), `'courses.syllabus.continue'` (pl "Kontynuuj" / en "Continue"). The i18n parity test (`src/i18n/translations.test.ts`) enforces pl/en symmetry — add both.

- [ ] **Step 5: Verify** — `pnpm exec tsc --noEmit` clean; `DATABASE_URI=… pnpm exec vitest run --config ./vitest.config.mts src/i18n/translations.test.ts` passes (parity); `pnpm build` compiles. Smoke (dev server, host courses.devince.dev): a paid course's syllabus shows a "Kup dostęp" button whose href is the `buy.stripe.com` link when not logged in.

- [ ] **Step 6: Commit.**
```bash
git add src/app/courses-app/\[slug\]/page.tsx src/app/courses-app/page.tsx src/app/courses-app/_components/SyllabusHero.tsx src/app/courses-app/_components/CtaBand.tsx src/app/courses-app/_components/CourseCard.tsx src/i18n/translations.ts
git commit -m "feat(courses): real buy button — paid+not-enrolled links to the Stripe Payment Link"
```

---

### Task 10: Stripe refund → NDQS revoke (#8b)

**Files:**
- Create: `src/utilities/ndqsRevoke.ts`, `src/utilities/ndqsRevoke.test.ts`
- Modify: `src/app/(frontend)/api/stripe/webhook/route.ts`

**Interfaces:**
- Consumes: `process.env.NDQS_ENROLL_URL` (derive the revoke URL by replacing `enroll-by-email` → `revoke-enrollment`), `process.env.NDQS_SERVICE_TOKEN`.
- Produces: `async function revokeNdqsByEmail({ email, courseId }): Promise<{ ok, status }>` (never throws).

- [ ] **Step 1: Failing test** `src/utilities/ndqsRevoke.test.ts` — POSTs `{email, course_id}` with `X-Service-Token` to the revoke URL; never throws on network error (mirror `ndqsEnroll.test.ts`).

- [ ] **Step 2: Implement** `src/utilities/ndqsRevoke.ts` (mirror `ndqsEnroll.ts`, hitting the revoke endpoint; build the URL from `NDQS_ENROLL_URL.replace('enroll-by-email','revoke-enrollment')` or a new `NDQS_REVOKE_URL` env — prefer the explicit env, fall back to the replace).

- [ ] **Step 3: Webhook refund branch** — in `src/app/(frontend)/api/stripe/webhook/route.ts`, handle `event.type === 'charge.refunded'` (or `'refund.created'`): pull the original `checkout.session`'s `metadata.ndqsCourseId` + the buyer email (you may need to retrieve the PaymentIntent→session, or store the mapping at purchase time — simplest: read `charge.payment_intent` → list sessions → metadata). Best-effort call `revokeNdqsByEmail`. Log on failure; never throw; still record the `stripe-events` row. (For `programId`/`productId` refunds there's no auto-revoke in scope — only NDQS.)

- [ ] **Step 4: Verify** — vitest for the util passes; `pnpm exec tsc --noEmit` clean; `pnpm build` compiles.

- [ ] **Step 5: Commit.**
```bash
git add src/utilities/ndqsRevoke.ts src/utilities/ndqsRevoke.test.ts "src/app/(frontend)/api/stripe/webhook/route.ts"
git commit -m "feat(ndqs-bridge): Stripe refund -> NDQS revoke-enrollment"
```

---

## PHASE W3 — Deploy + verify (owner-coordinated)

### Task 11: Deploy both + verify — **[OWNER + controller]**

- [ ] **Step 1 (controller):** Final whole-branch reviews of both branches. Merge `feat/pro-phase1-security` into the NDQS deploy branch + push; merge `feat/pro-phase1-courses-buy` → devince main.
- [ ] **Step 2 (controller):** Redeploy NDQS (Coolify) — migrations 005+006 apply on boot; verify `api_keys` + `enrollments.revoked_at` exist, uvicorn logs `--proxy-headers`, `/docs` → 404, and (security smoke) a non-enrolled JWT gets 403 on a quest briefing, self-enroll without the service token is blocked, `url_check` against `http://169.254.169.254` returns "not allowed".
- [ ] **Step 3 (controller):** Redeploy devince — verify a paid course syllabus shows the real "Kup" button (→ buy.stripe.com) for a logged-out visitor; the existing apps/courses flows still 200.
- [ ] **Step 4 [OWNER]:** sanity — buy the SHADOW Payment Link (now safe) OR a native course, confirm access; then trigger a Stripe refund and confirm NDQS access is revoked (quest briefing → 403).

---

## Notes
- Execute Task 1 BEFORE Task 8; Task 1 writes the access queries without `revoked_at`, Task 8 adds the column + the `revoked_at IS NULL` clause.
- API-key DB port (Task 5) makes `validate_api_key` async + db-aware — the one signature ripple; update all call sites.
- The ~25 pre-existing NDQS full-suite failures (need live Redis) are baseline — run per-task files; don't "fix" them.
