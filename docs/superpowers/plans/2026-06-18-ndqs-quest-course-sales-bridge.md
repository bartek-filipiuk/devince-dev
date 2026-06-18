# NDQS Quest-Course Sales Bridge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell access to the NDQS "Operation SHADOW" quest-course through the existing devince.dev Stripe, granting passwordless (magic-link) access — the smallest path that proves a buyer will pay and complete the first quest.

**Architecture:** Two repos. **W1** (`/home/bartek/main-projects/courses-platform/`, NDQS, FastAPI+Next): add a service-token `enroll-by-email` admin endpoint + stateless magic-link auth (request/verify) + a Brevo email helper + two tiny frontend pages, then deploy to `learn.devince.dev` on Coolify. **W2** (this repo, devince, Payload+Next): one new mutually-exclusive `metadata.ndqsCourseId` branch in the Stripe webhook that calls NDQS enroll-by-email. The only coupling devince→NDQS is one authenticated HTTP call.

**Tech Stack:** NDQS backend = FastAPI + SQLAlchemy async + Postgres + Redis + python-jose JWT + pytest/AsyncClient. NDQS frontend = Next 16 + NextAuth. devince = Payload 3.67 + Next 15 + vitest. Email = Brevo HTTP API. Deploy = Coolify.

## Global Constraints

- **Two repos, separate git.** W1 tasks commit in `/home/bartek/main-projects/courses-platform/` (branch `feat/sales-bridge-auth`). W2 tasks commit in this repo (branch `feat/ndqs-sales-bridge`). Never mix staged files across repos.
- **Thin validation pilot.** Accept documented rough edges; do NOT fix the in-memory API-key store, do NOT build OAuth, do NOT build the late SHADOW quests (T6–T8).
- **Magic tokens** = short-lived (15 min) signed JWTs with `type="magic"`, single-use via the existing Redis blacklist (`jti`). `magic/request` ALWAYS returns 200 (never reveal whether an email exists) and is rate-limited.
- **Email lives only in NDQS** for this feature. The devince webhook sends NO email for the `ndqsCourseId` branch.
- **devince webhook branch is best-effort + idempotent**, mutually exclusive with `programId`/`productId`: a failure is logged, the `stripe-events` row is still written, the handler returns 200 (no Stripe retry storm).
- **NDQS user identity = email**, created with `provider="stripe"`, `provider_id=email` (satisfies the NOT NULL `provider`/`provider_id` columns; mirrors `oauth.upsert_user`).
- **New env vars:** NDQS gets `NDQS_SERVICE_TOKEN`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`. devince gets `NDQS_ENROLL_URL`, `NDQS_SERVICE_TOKEN` (same value as NDQS's).
- **NDQS test pattern:** `@pytest.mark.asyncio`, `AsyncClient(ASGITransport(app))`, `AsyncMock()` db with `app.dependency_overrides[get_db]`, `create_access_token` for auth fixtures, `patch("...is_token_blacklisted")` where blacklist is hit. No conftest — fixtures inline per test file. Run from `backend/`: `pytest tests/<file> -v`.
- **Owner-gated steps** (cannot be done by an implementer subagent) are marked **[OWNER]** and collected in Task 10/11: DNS for `learn.devince.dev`, OpenRouter key, Coolify resource creation, creating the Stripe Payment Link, the live charge.

---

## File Structure

**W1 — NDQS backend (`courses-platform/backend/`):**
- Create `app/email.py` — Brevo magic-link email helper. One responsibility: send the access email.
- Create `app/auth/magic.py` — magic-token mint/verify pure logic (build on `jwt.py` + `redis.py`).
- Create `app/auth/magic_router.py` — `POST /api/auth/magic/request`, `GET /api/auth/magic/verify`.
- Create `app/admin/__init__.py` + `app/admin/router.py` — `POST /api/admin/enroll-by-email` + the service-token dependency + the `enroll_user_by_email` service fn.
- Modify `app/config.py` — add the three settings fields.
- Modify `app/main.py` — `include_router(magic_router)` + `include_router(admin_router)`.
- Tests: `tests/test_magic.py`, `tests/test_admin_enroll.py`, `tests/test_email.py`.

**W1 — NDQS frontend (`courses-platform/frontend/src/`):**
- Create `app/login/page.tsx` (replace if a stub exists) — email → magic/request.
- Create `app/auth/magic/page.tsx` — token → verify → store JWT → redirect.
- Create `lib/session.ts` — `setToken/getToken/clearToken` (localStorage) — the magic-link session source.

**W1 — deploy (`courses-platform/`):**
- Create `docker-compose.coolify.yml` — Coolify-adapted compose (no Caddy; Coolify proxy fronts it).

**W2 — devince (this repo, `src/`):**
- Modify `src/app/(frontend)/api/stripe/webhook/route.ts` — add `ndqsCourseId` branch.
- Create `src/utilities/ndqsEnroll.ts` — the typed fetch to NDQS enroll-by-email (testable in isolation).
- Test `src/utilities/ndqsEnroll.test.ts`.

---

## PHASE W1 — NDQS backend (repo: courses-platform; branch: feat/sales-bridge-auth)

### Task 1: Config + service-token dependency

**Files:**
- Modify: `courses-platform/backend/app/config.py`
- Create: `courses-platform/backend/app/admin/__init__.py` (empty)
- Create: `courses-platform/backend/app/admin/deps.py`
- Test: `courses-platform/backend/tests/test_admin_enroll.py` (started here)

**Interfaces:**
- Produces: `settings.NDQS_SERVICE_TOKEN`, `settings.BREVO_API_KEY`, `settings.BREVO_SENDER_EMAIL`; `require_service_token(x_service_token: str | None) -> None` (FastAPI dependency that raises 401 unless the header equals `settings.NDQS_SERVICE_TOKEN`).

- [ ] **Step 1: Add settings fields.** In `app/config.py`, inside `class Settings`, after `BACKEND_URL`:
```python
    NDQS_SERVICE_TOKEN: str = ""
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "bartek@devince.dev"
```

- [ ] **Step 2: Write the failing test** in `tests/test_admin_enroll.py`:
```python
import pytest
from fastapi import HTTPException
from app.admin.deps import require_service_token
from app.config import settings

def test_service_token_rejects_when_missing(monkeypatch):
    monkeypatch.setattr(settings, "NDQS_SERVICE_TOKEN", "secret")
    with pytest.raises(HTTPException) as e:
        require_service_token(None)
    assert e.value.status_code == 401

def test_service_token_rejects_wrong(monkeypatch):
    monkeypatch.setattr(settings, "NDQS_SERVICE_TOKEN", "secret")
    with pytest.raises(HTTPException) as e:
        require_service_token("nope")
    assert e.value.status_code == 401

def test_service_token_accepts_correct(monkeypatch):
    monkeypatch.setattr(settings, "NDQS_SERVICE_TOKEN", "secret")
    assert require_service_token("secret") is None
```

- [ ] **Step 3: Run it to confirm it fails.** From `backend/`: `pytest tests/test_admin_enroll.py -v` → ImportError (no `app.admin.deps`).

- [ ] **Step 4: Implement** `app/admin/deps.py`:
```python
import hmac
from fastapi import Header, HTTPException
from app.config import settings

def require_service_token(x_service_token: str | None = Header(default=None)) -> None:
    """Gate service-to-service endpoints. Constant-time compare against env."""
    expected = settings.NDQS_SERVICE_TOKEN
    if not expected or not x_service_token or not hmac.compare_digest(x_service_token, expected):
        raise HTTPException(status_code=401, detail="Invalid service token")
```

- [ ] **Step 5: Run tests → pass.** `pytest tests/test_admin_enroll.py -v` → 3 passed.

- [ ] **Step 6: Commit.**
```bash
cd /home/bartek/main-projects/courses-platform
git add backend/app/config.py backend/app/admin/__init__.py backend/app/admin/deps.py backend/tests/test_admin_enroll.py
git commit -m "feat(ndqs): config + service-token dependency for the sales bridge"
```

---

### Task 2: Brevo magic-link email helper

**Files:**
- Create: `courses-platform/backend/app/email.py`
- Test: `courses-platform/backend/tests/test_email.py`

**Interfaces:**
- Produces: `async def send_magic_link_email(to: str, link: str) -> None` — POSTs to Brevo with the access link; raises `RuntimeError` on non-2xx. No-ops (logs) when `BREVO_API_KEY` is empty so local/dev never blocks.

- [ ] **Step 1: Write the failing test** `tests/test_email.py`:
```python
import pytest
from unittest.mock import AsyncMock, patch
from app.config import settings
from app.email import send_magic_link_email

@pytest.mark.asyncio
async def test_posts_to_brevo_with_link(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "key")
    mock_resp = AsyncMock(); mock_resp.status_code = 201
    with patch("app.email.httpx.AsyncClient") as Client:
        inst = Client.return_value.__aenter__.return_value
        inst.post = AsyncMock(return_value=mock_resp)
        await send_magic_link_email("buyer@x.pl", "https://learn.devince.dev/auth/magic?token=abc")
        args, kwargs = inst.post.call_args
        assert "api.brevo.com" in args[0]
        assert "abc" in str(kwargs["json"])
        assert kwargs["json"]["sender"]["email"]

@pytest.mark.asyncio
async def test_noop_when_no_key(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    # must not raise even though no HTTP client is patched
    await send_magic_link_email("buyer@x.pl", "https://x/y")
```

- [ ] **Step 2: Run → fails** (`pytest tests/test_email.py -v`): ImportError.

- [ ] **Step 3: Implement** `app/email.py`:
```python
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)
_BREVO_URL = "https://api.brevo.com/v3/smtp/email"

async def send_magic_link_email(to: str, link: str) -> None:
    """Send the passwordless access link via Brevo. No-op (logged) without a key."""
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY unset — skipping magic-link email to %s", to)
        return
    body = {
        "sender": {"email": settings.BREVO_SENDER_EMAIL, "name": "Devince"},
        "to": [{"email": to}],
        "subject": "Twój dostęp do kursu — link logowania",
        "htmlContent": (
            f"<p>Twój link do wejścia na kurs (ważny 15 minut):</p>"
            f'<p><a href="{link}">{link}</a></p>'
            f"<p>Jeśli wygaśnie — wejdź na /login i wpisz swój e-mail po nowy link.</p>"
        ),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            _BREVO_URL,
            headers={"api-key": settings.BREVO_API_KEY, "content-type": "application/json"},
            json=body,
        )
    if resp.status_code >= 300:
        raise RuntimeError(f"Brevo {resp.status_code}: {resp.text}")
```

- [ ] **Step 4: Run → pass.** `pytest tests/test_email.py -v` → 2 passed.

- [ ] **Step 5: Commit.**
```bash
cd /home/bartek/main-projects/courses-platform
git add backend/app/email.py backend/tests/test_email.py
git commit -m "feat(ndqs): Brevo magic-link email helper"
```

---

### Task 3: Magic-token mint + verify logic

**Files:**
- Modify: `courses-platform/backend/app/auth/jwt.py` (add `create_magic_token`)
- Create: `courses-platform/backend/app/auth/magic.py`
- Test: `courses-platform/backend/tests/test_magic.py`

**Interfaces:**
- Produces: `create_magic_token(user_id: str, email: str) -> str` (JWT, `type="magic"`, 15-min exp, `jti`); `async def consume_magic_token(token: str) -> dict` → returns `{"sub","email"}` on success, marks `jti` single-use in Redis, raises `MagicError` on invalid/expired/replayed.

- [ ] **Step 1: Add `create_magic_token` to `app/auth/jwt.py`** (mirror `create_access_token`, but `type="magic"`, 15-min):
```python
MAGIC_TOKEN_EXPIRE_MINUTES = 15

def create_magic_token(user_id: str, email: str) -> str:
    import uuid
    from datetime import datetime, timedelta, timezone
    from jose import jwt
    expire = datetime.now(timezone.utc) + timedelta(minutes=MAGIC_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "type": "magic", "exp": expire, "jti": str(uuid.uuid4())}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm="HS256")
```
(Keep imports consistent with the existing top-of-file imports in `jwt.py`; if `jwt`/`datetime`/`uuid` are already imported there, drop the inline imports.)

- [ ] **Step 2: Write failing tests** `tests/test_magic.py`:
```python
import pytest
from unittest.mock import AsyncMock, patch
from app.auth.jwt import create_magic_token
from app.auth.magic import consume_magic_token, MagicError

@pytest.mark.asyncio
async def test_consume_valid_token_returns_identity():
    tok = create_magic_token("user-1", "a@b.pl")
    with patch("app.auth.magic.is_token_blacklisted", AsyncMock(return_value=False)), \
         patch("app.auth.magic.blacklist_token", AsyncMock()):
        out = await consume_magic_token(tok)
    assert out == {"sub": "user-1", "email": "a@b.pl"}

@pytest.mark.asyncio
async def test_replayed_token_rejected():
    tok = create_magic_token("user-1", "a@b.pl")
    with patch("app.auth.magic.is_token_blacklisted", AsyncMock(return_value=True)):
        with pytest.raises(MagicError):
            await consume_magic_token(tok)

@pytest.mark.asyncio
async def test_garbage_token_rejected():
    with pytest.raises(MagicError):
        await consume_magic_token("not-a-jwt")
```
(Expiry is enforced by `decode_token`; a dedicated expiry test is redundant with jose's own — covered by the garbage/replay cases + jose. If desired, add one minting with a negative delta.)

- [ ] **Step 3: Run → fails** (`pytest tests/test_magic.py -v`): ImportError.

- [ ] **Step 4: Implement** `app/auth/magic.py`:
```python
from app.auth.jwt import decode_token
from app.redis import blacklist_token, is_token_blacklisted

MAGIC_USED_TTL = 15 * 60  # seconds — matches token lifetime

class MagicError(Exception):
    pass

async def consume_magic_token(token: str) -> dict:
    """Validate a single-use magic token. Returns {sub, email}; marks it used."""
    try:
        payload = decode_token(token, token_type="magic")
    except Exception as e:  # TokenError / jose errors
        raise MagicError("invalid or expired magic token") from e
    jti = payload.get("jti")
    if not jti or await is_token_blacklisted(jti):
        raise MagicError("magic token already used")
    await blacklist_token(jti, MAGIC_USED_TTL)
    return {"sub": payload["sub"], "email": payload.get("email", "")}
```

- [ ] **Step 5: Run → pass.** `pytest tests/test_magic.py -v` → 3 passed.

- [ ] **Step 6: Commit.**
```bash
cd /home/bartek/main-projects/courses-platform
git add backend/app/auth/jwt.py backend/app/auth/magic.py backend/tests/test_magic.py
git commit -m "feat(ndqs): single-use magic-token mint + verify"
```

---

### Task 4: Magic auth router (request + verify endpoints)

**Files:**
- Create: `courses-platform/backend/app/auth/magic_router.py`
- Modify: `courses-platform/backend/app/main.py` (include the router)
- Test: append to `courses-platform/backend/tests/test_magic.py`

**Interfaces:**
- Consumes: `create_magic_token`, `consume_magic_token`, `send_magic_link_email`, `create_access_token`, the `User` model, `get_db`.
- Produces: `POST /api/auth/magic/request {email}` → always `{"sent": true}` (200); `GET /api/auth/magic/verify?token=` → on success `{"access_token","token_type":"bearer","user_id"}`, on failure 400.

- [ ] **Step 1: Write failing endpoint tests** (append to `tests/test_magic.py`), using the inline AsyncClient + mock_db pattern:
```python
from uuid import uuid4
from unittest.mock import MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db

def _override_db(db):
    async def _f(): yield db
    return _f

@pytest.mark.asyncio
async def test_request_unknown_email_still_200_no_send():
    db = AsyncMock()
    res = MagicMock(); res.scalar_one_or_none.return_value = None
    db.execute.return_value = res
    app.dependency_overrides[get_db] = _override_db(db)
    with patch("app.auth.magic_router.send_magic_link_email", AsyncMock()) as send:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/auth/magic/request", json={"email": "ghost@x.pl"})
        assert r.status_code == 200 and r.json() == {"sent": True}
        send.assert_not_awaited()
    app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_request_known_email_sends_link():
    db = AsyncMock()
    user = MagicMock(); user.id = uuid4(); user.email = "buyer@x.pl"
    res = MagicMock(); res.scalar_one_or_none.return_value = user
    db.execute.return_value = res
    app.dependency_overrides[get_db] = _override_db(db)
    with patch("app.auth.magic_router.send_magic_link_email", AsyncMock()) as send:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/auth/magic/request", json={"email": "buyer@x.pl"})
        assert r.status_code == 200
        send.assert_awaited_once()
        assert "/auth/magic?token=" in send.await_args.args[1]
    app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_verify_bad_token_400():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.get("/api/auth/magic/verify", params={"token": "garbage"})
    assert r.status_code == 400
```

- [ ] **Step 2: Run → fails** (router not wired). `pytest tests/test_magic.py -v`.

- [ ] **Step 3: Implement** `app/auth/magic_router.py`:
```python
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, create_magic_token
from app.auth.magic import consume_magic_token, MagicError
from app.auth.models import User
from app.config import settings
from app.database import get_db
from app.email import send_magic_link_email

router = APIRouter(prefix="/api/auth/magic", tags=["auth-magic"])

class MagicRequest(BaseModel):
    email: EmailStr

@router.post("/request")
async def magic_request(body: MagicRequest, db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(select(User).where(User.email == str(body.email)))
    user = result.scalar_one_or_none()
    if user:  # silent for unknown emails — never leak existence
        token = create_magic_token(str(user.id), user.email)
        link = f"{settings.FRONTEND_URL}/auth/magic?token={token}"
        await send_magic_link_email(user.email, link)
    return {"sent": True}

@router.get("/verify")
async def magic_verify(token: str) -> JSONResponse:
    try:
        ident = await consume_magic_token(token)
    except MagicError:
        return JSONResponse(status_code=400, content={"detail": "Link invalid or expired"})
    access = create_access_token(data={"sub": ident["sub"], "role": "student", "email": ident["email"]})
    return JSONResponse({"access_token": access, "token_type": "bearer", "user_id": ident["sub"]})
```

- [ ] **Step 4: Wire it.** In `app/main.py`, add the import near the other router imports and `app.include_router(magic_router)` after `app.include_router(auth_router)`:
```python
from app.auth.magic_router import router as magic_router
# ...
app.include_router(magic_router)
```

- [ ] **Step 5: Add `magic_request` rate limit.** Wrap the handler with the existing limiter using `LOGIN_RATE_LIMIT` (10/5minutes) so requests can't be used to spam emails — follow the exact decorator pattern from `courses/router.py` enroll (`@limiter.limit(LOGIN_RATE_LIMIT, key_func=_get_user_id_or_ip)` + `request: Request` first arg). Import the limiter + key func from `app.rate_limit`.

- [ ] **Step 6: Run → pass.** `pytest tests/test_magic.py -v` → all pass.

- [ ] **Step 7: Commit.**
```bash
cd /home/bartek/main-projects/courses-platform
git add backend/app/auth/magic_router.py backend/app/main.py backend/tests/test_magic.py
git commit -m "feat(ndqs): magic-link request + verify endpoints"
```

---

### Task 5: enroll-by-email service + admin endpoint

**Files:**
- Create: `courses-platform/backend/app/admin/service.py`
- Create: `courses-platform/backend/app/admin/router.py`
- Modify: `courses-platform/backend/app/main.py` (include admin router)
- Test: append to `courses-platform/backend/tests/test_admin_enroll.py`

**Interfaces:**
- Consumes: `User`, `Enrollment`, `Course`, `initialize_quest_states`, `create_magic_token`, `send_magic_link_email`, `get_db`, `require_service_token`.
- Produces: `async def enroll_user_by_email(db, email: str, course_id: UUID) -> dict` → `{"user_id","course_id","status":"enrolled","created_user":bool}`; `POST /api/admin/enroll-by-email` (service-token gated).

- [ ] **Step 1: Write failing tests** (append to `tests/test_admin_enroll.py`) — new user path, existing user (idempotent) path, bad service token. Use AsyncMock db + override `get_db`, patch `initialize_quest_states` and `send_magic_link_email`. Example (new user):
```python
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db
from app.config import settings

def _override_db(db):
    async def _f(): yield db
    return _f

@pytest.mark.asyncio
async def test_enroll_creates_user_and_enrollment(monkeypatch):
    monkeypatch.setattr(settings, "NDQS_SERVICE_TOKEN", "secret")
    db = AsyncMock()
    course = MagicMock(); course.is_published = True
    # 1st execute: user lookup -> None ; 2nd: course lookup -> course ; 3rd: enrollment lookup -> None
    user_res = MagicMock(); user_res.scalar_one_or_none.return_value = None
    course_res = MagicMock(); course_res.scalar_one_or_none.return_value = course
    enr_res = MagicMock(); enr_res.scalar_one_or_none.return_value = None
    db.execute.side_effect = [user_res, course_res, enr_res]
    app.dependency_overrides[get_db] = _override_db(db)
    with patch("app.admin.service.initialize_quest_states", AsyncMock()) as iqs, \
         patch("app.admin.service.send_magic_link_email", AsyncMock()) as send:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/admin/enroll-by-email",
                             headers={"X-Service-Token": "secret"},
                             json={"email": "buyer@x.pl", "course_id": str(uuid.uuid4())})
        assert r.status_code == 201
        body = r.json(); assert body["status"] == "enrolled" and body["created_user"] is True
        iqs.assert_awaited_once(); send.assert_awaited_once()
    app.dependency_overrides.pop(get_db, None)

@pytest.mark.asyncio
async def test_enroll_rejects_bad_service_token(monkeypatch):
    monkeypatch.setattr(settings, "NDQS_SERVICE_TOKEN", "secret")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/admin/enroll-by-email", headers={"X-Service-Token": "wrong"},
                         json={"email": "x@y.pl", "course_id": str(uuid.uuid4())})
    assert r.status_code == 401
```
(Add an "existing user → created_user False, no duplicate enrollment, status still enrolled" test with the lookups returning an existing user + existing enrollment, asserting `db.add` not called for a second enrollment.)

- [ ] **Step 2: Run → fails.** `pytest tests/test_admin_enroll.py -v`.

- [ ] **Step 3: Implement** `app/admin/service.py`:
```python
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_magic_token
from app.auth.models import User
from app.config import settings
from app.courses.models import Course, Enrollment
from app.email import send_magic_link_email
from app.quests.state_machine import initialize_quest_states

async def enroll_user_by_email(db: AsyncSession, email: str, course_id: uuid.UUID) -> dict:
    # upsert user by email (mirror oauth.upsert_user, provider="stripe")
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    created_user = False
    if user is None:
        user = User(email=email, display_name=email.split("@")[0],
                    provider="stripe", provider_id=email, role="student")
        db.add(user); await db.commit(); await db.refresh(user)
        created_user = True

    res = await db.execute(select(Course).where(Course.id == course_id))
    course = res.scalar_one_or_none()
    if not course:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Course not found")

    res = await db.execute(select(Enrollment).where(
        Enrollment.user_id == user.id, Enrollment.course_id == course_id))
    if res.scalar_one_or_none() is None:
        db.add(Enrollment(user_id=user.id, course_id=course_id)); await db.commit()
        await initialize_quest_states(db, user.id, course_id)

    token = create_magic_token(str(user.id), user.email)
    link = f"{settings.FRONTEND_URL}/auth/magic?token={token}"
    await send_magic_link_email(user.email, link)
    return {"user_id": str(user.id), "course_id": str(course_id),
            "status": "enrolled", "created_user": created_user}
```

- [ ] **Step 4: Implement** `app/admin/router.py`:
```python
import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.deps import require_service_token
from app.admin.service import enroll_user_by_email
from app.database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])

class EnrollBody(BaseModel):
    email: EmailStr
    course_id: uuid.UUID

@router.post("/enroll-by-email", status_code=201, dependencies=[Depends(require_service_token)])
async def enroll_by_email(body: EnrollBody, db: AsyncSession = Depends(get_db)) -> dict:
    return await enroll_user_by_email(db, str(body.email), body.course_id)
```

- [ ] **Step 5: Wire it** in `app/main.py`: `from app.admin.router import router as admin_router` + `app.include_router(admin_router)`.

- [ ] **Step 6: Run → pass.** `pytest tests/test_admin_enroll.py -v`.

- [ ] **Step 7: Run the WHOLE backend suite** to confirm no regression: from `backend/` `pytest -q`. Expected: the pre-existing pass count + the new tests, no NEW failures (the 2 known rate-limit failures from the baseline may remain — note them, do not "fix").

- [ ] **Step 8: Commit.**
```bash
cd /home/bartek/main-projects/courses-platform
git add backend/app/admin/service.py backend/app/admin/router.py backend/app/main.py backend/tests/test_admin_enroll.py
git commit -m "feat(ndqs): admin enroll-by-email (service-token) + welcome magic-link"
```

---

## PHASE W1F — NDQS frontend (repo: courses-platform; same branch)

### Task 6: Session helper + `/login` page

**Files:**
- Create: `courses-platform/frontend/src/lib/session.ts`
- Create/replace: `courses-platform/frontend/src/app/login/page.tsx`

**Interfaces:**
- Produces: `setToken(t)`, `getToken(): string | null`, `clearToken()` (localStorage key `ndqs_token`). The magic-link is the session source for the pilot; pages that need the backend JWT read `getToken()`.

- [ ] **Step 1: Implement** `src/lib/session.ts`:
```typescript
const KEY = "ndqs_token";
export function setToken(t: string) { if (typeof window !== "undefined") localStorage.setItem(KEY, t); }
export function getToken(): string | null { return typeof window !== "undefined" ? localStorage.getItem(KEY) : null; }
export function clearToken() { if (typeof window !== "undefined") localStorage.removeItem(KEY); }
```

- [ ] **Step 2: Implement** `src/app/login/page.tsx` — a client component: email input → `POST {NEXT_PUBLIC_API_URL}/api/auth/magic/request` → show "sprawdź mail". Use `apiClient` (`src/lib/api-client.ts`) or a plain fetch. Always show success (mirror the backend's no-leak). Include a short note that the link is valid 15 min.

- [ ] **Step 3: Build to verify it compiles.** From `frontend/`: `npm run build` (or the repo's build script in `package.json`). Expected: build succeeds, `/login` in the route list.

- [ ] **Step 4: Commit.**
```bash
cd /home/bartek/main-projects/courses-platform
git add frontend/src/lib/session.ts frontend/src/app/login/page.tsx
git commit -m "feat(ndqs): magic-link /login page + session helper"
```

---

### Task 7: `/auth/magic` callback page

**Files:**
- Create: `courses-platform/frontend/src/app/auth/magic/page.tsx`

**Interfaces:**
- Consumes: `getToken/setToken`; the backend `GET /api/auth/magic/verify?token=`.

- [ ] **Step 1: Implement** `src/app/auth/magic/page.tsx` — client component: read `token` from the query, call `GET {NEXT_PUBLIC_API_URL}/api/auth/magic/verify?token=...`; on 200 `setToken(access_token)` and `router.replace("/missions")` (or the course landing); on error show "Link wygasł — wróć na /login po nowy". Render a brief "Loguję…" state.

- [ ] **Step 2: Point the gated pages at `getToken()`.** Find where pages currently obtain the token (the `getDevToken()` call sites under `src/app/`). For the pilot, change those call sites to prefer `getToken()` and fall back to `getDevToken()` ONLY when `getToken()` is null AND not production (dev convenience). Keep the change mechanical and minimal — do not refactor NextAuth.

- [ ] **Step 3: Build.** From `frontend/`: `npm run build`. Expected: success, `/auth/magic` in routes.

- [ ] **Step 4: Commit.**
```bash
cd /home/bartek/main-projects/courses-platform
git add frontend/src/app/auth/magic/page.tsx frontend/src/app
git commit -m "feat(ndqs): /auth/magic callback stores backend JWT session"
```

---

## PHASE W1D — Deploy NDQS to learn.devince.dev (Coolify) — **[OWNER-COORDINATED]**

### Task 8: Coolify deploy of NDQS

This task cannot be fully done by an implementer subagent — it needs DNS, secrets, and Coolify resource creation. The controller coordinates it; an implementer prepares the compose file.

**Files:**
- Create: `courses-platform/docker-compose.coolify.yml`

- [ ] **Step 1 (implementer): Coolify-adapted compose.** Copy `docker-compose.prod.yml` → `docker-compose.coolify.yml`, **remove the `caddy` service** (Coolify's proxy/Traefik terminates TLS + routes), keep `backend`, `frontend`, `db`, `redis`. Expose the frontend on the Coolify domain and route `/api/*` + `/docs` + `/openapi.json` to `backend:8000` (Coolify per-service domains or a small router). Keep the backend `command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"` (migrate-on-boot, fail-fast — mirrors devince's pattern). Add the new env vars (`NDQS_SERVICE_TOKEN`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`) to the `backend` env block. Commit on the branch.
- [ ] **Step 2 [OWNER]:** Add DNS `A` record `learn.devince.dev` → the server IP (same as devince).
- [ ] **Step 3 [OWNER]:** Provide an **OpenRouter API key** (for the Game-Master LLM).
- [ ] **Step 4 (controller, Coolify API):** Create a Coolify application from `courses-platform` (compose build pack, `docker-compose.coolify.yml`), set domain `learn.devince.dev`, set env: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET`, `OPENROUTER_API_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `NDQS_SERVICE_TOKEN` (generate a strong value — same one goes to devince in W2), `ENVIRONMENT=production`, `FRONTEND_URL=https://learn.devince.dev`, `NEXT_PUBLIC_API_URL=https://learn.devince.dev`. Deploy.
- [ ] **Step 5 (controller): Seed SHADOW on prod.** After first boot (migrations applied), run the SHADOW seed in the container: `python scripts/seed_shadow_course.py` (+ `scripts/seed_dev.py` if an admin/base row is needed). Record the **SHADOW course UUID** (`select id from courses where ...`) — W2 needs it for the Payment Link metadata.
- [ ] **Step 6 (controller): Smoke.** `GET https://learn.devince.dev/` 200; `GET /api/docs` 200; `POST /api/admin/enroll-by-email` with a throwaway email + the SHADOW UUID + the service token → 201, then the magic-link email arrives (Brevo), clicking it logs in and shows SHADOW. Fix-forward any deploy issues (compose/env/migrations) before W2's live test.

---

## PHASE W2 — devince bridge (repo: this repo; branch: feat/ndqs-sales-bridge)

### Task 9: NDQS enroll util + webhook branch

**Files:**
- Create: `src/utilities/ndqsEnroll.ts`
- Test: `src/utilities/ndqsEnroll.test.ts`
- Modify: `src/app/(frontend)/api/stripe/webhook/route.ts`

**Interfaces:**
- Produces: `async function enrollNdqsByEmail(args: { email: string; courseId: string }): Promise<{ ok: boolean; status: number }>` — POSTs to `process.env.NDQS_ENROLL_URL` with header `X-Service-Token: process.env.NDQS_SERVICE_TOKEN`, body `{ email, course_id }`. Never throws; returns `{ok,status}` so the webhook can log + continue.

- [ ] **Step 1: Write the failing test** `src/utilities/ndqsEnroll.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enrollNdqsByEmail } from './ndqsEnroll'

beforeEach(() => {
  process.env.NDQS_ENROLL_URL = 'https://learn.devince.dev/api/admin/enroll-by-email'
  process.env.NDQS_SERVICE_TOKEN = 'svc'
})

it('POSTs email+course_id with the service token header', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 })
  vi.stubGlobal('fetch', fetchMock)
  const r = await enrollNdqsByEmail({ email: 'b@x.pl', courseId: 'uuid-1' })
  expect(r).toEqual({ ok: true, status: 201 })
  const [url, opts] = fetchMock.mock.calls[0]
  expect(url).toBe(process.env.NDQS_ENROLL_URL)
  expect((opts.headers as any)['X-Service-Token']).toBe('svc')
  expect(JSON.parse(opts.body as string)).toEqual({ email: 'b@x.pl', course_id: 'uuid-1' })
})

it('never throws on network error — returns ok:false', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
  const r = await enrollNdqsByEmail({ email: 'b@x.pl', courseId: 'u' })
  expect(r.ok).toBe(false)
})
```

- [ ] **Step 2: Run → fails.** `DATABASE_URI=... pnpm exec vitest run src/utilities/ndqsEnroll.test.ts`.

- [ ] **Step 3: Implement** `src/utilities/ndqsEnroll.ts`:
```typescript
export async function enrollNdqsByEmail(args: { email: string; courseId: string }): Promise<{ ok: boolean; status: number }> {
  const url = process.env.NDQS_ENROLL_URL
  const token = process.env.NDQS_SERVICE_TOKEN
  if (!url || !token) return { ok: false, status: 0 }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Token': token },
      body: JSON.stringify({ email: args.email, course_id: args.courseId }),
    })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: 0 }
  }
}
```

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Add the webhook branch.** In `src/app/(frontend)/api/stripe/webhook/route.ts`, inside `checkout.session.completed`, alongside the `programId`/`productId` branches, add (mutually exclusive — only when neither programId nor productId is set):
```typescript
const ndqsCourseId = session.metadata?.ndqsCourseId
if (email && ndqsCourseId && !programIdRaw && !productIdRaw) {
  const { enrollNdqsByEmail } = await import('@/utilities/ndqsEnroll')
  const r = await enrollNdqsByEmail({ email, courseId: ndqsCourseId })
  if (!r.ok) {
    console.error(`[stripe webhook] NDQS enroll failed (course ${ndqsCourseId}, ${email}) status=${r.status}; event recorded, recover by re-POSTing enroll-by-email`)
  }
}
```
(Keep it best-effort: do NOT throw; the `stripe-events` row + 200 still happen below, matching the course/app branches.)

- [ ] **Step 6: Verify the build + types.** `pnpm exec tsc --noEmit` clean; `pnpm build` compiles.

- [ ] **Step 7: Commit.**
```bash
git add src/utilities/ndqsEnroll.ts src/utilities/ndqsEnroll.test.ts "src/app/(frontend)/api/stripe/webhook/route.ts"
git commit -m "feat(ndqs-bridge): webhook ndqsCourseId branch -> NDQS enroll-by-email"
```

- [ ] **Step 8 (controller): Coolify env on devince.** Set `NDQS_ENROLL_URL=https://learn.devince.dev/api/admin/enroll-by-email` and `NDQS_SERVICE_TOKEN=<same value as NDQS>` on the devince Coolify app; redeploy after the PR merges.

---

### Task 10: Stripe Payment Link — **[OWNER]**

- [ ] **Step 1 [OWNER]:** In Stripe (live mode), create a **Payment Link** for SHADOW at the chosen price, with **metadata `ndqsCourseId` = the SHADOW course UUID** from Task 8 Step 5. Ensure the link collects the customer email (Payment Links do by default). Share the link URL.
- [ ] **Step 2 (controller):** Confirm the live webhook (already configured for apps/courses) covers `checkout.session.completed` for this Payment Link (same endpoint `https://devince.dev/api/stripe/webhook`). No new webhook needed.

---

## PHASE W3 — Live end-to-end verification

### Task 11: First-sale e2e — **[OWNER + controller]**

- [ ] **Step 1 (controller, test mode first):** Using a test-mode Payment Link (or test keys), drive a `4242` purchase → confirm devince webhook hit the `ndqsCourseId` branch → NDQS shows the enrollment (DB row) + the magic-link email delivered → click → SHADOW visible.
- [ ] **Step 2 [OWNER], live:** Buy SHADOW via the live Payment Link with a real card (small price, refundable — like the apps $1 test).
- [ ] **Step 3 (controller): Verify the chain on prod:** Stripe event `paid` with `metadata.ndqsCourseId`; NDQS `enrollments` row for the buyer email; Brevo email delivered; the magic link logs in; SHADOW first quest can be submitted → Game-Master evaluation returns → next quest unlocks. This is the **definition of done**.
- [ ] **Step 4 (controller):** Record outcome + any rough edges hit; offer the owner a refund of the test charge (their decision, as with the apps $1 test).

---

## Notes / accepted rough edges (do NOT "fix" in this plan)

- NDQS API-key store is in-memory → restart invalidates learner keys; learner re-generates. Persist later.
- Late SHADOW quests (T6–T8) stubbed/hidden — pilot validates the first quests.
- OAuth (GitHub/Google) not used; magic-link is the only login path for the pilot.
- Refund/cancellation does NOT auto-revoke NDQS access — manual for the pilot.
- The 2 known baseline backend test failures (rate-limiting) are pre-existing — note, don't fix.
