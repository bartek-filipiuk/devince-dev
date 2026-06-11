-- =============================================================================
-- ONE-OFF PROD MIGRATION RECONCILE  (plan F0.4)
-- =============================================================================
-- Brings a production DB that was built by the OLD Payload `push:true` flow
-- (and hand-patched) in line with the new migrations baseline
-- `20260610_193458_init`, WITHOUT re-running the baseline CREATE schema.
--
-- It does TWO things:
--   1. Creates `payload_migrations` and marks the baseline as already applied,
--      so the boot-time runner (scripts/migrate.mjs) is a no-op.
--   2. ADDITIVELY creates ONLY the genuinely-missing course-platform objects:
--        tables : lessons, _lessons_v, course_assets, stripe_events, users_roles
--        enums  : enum_lessons_type, enum_lessons_status,
--                 enum__lessons_v_version_type, enum__lessons_v_version_status,
--                 enum__lessons_v_published_locale, enum_users_roles
--        + their indexes / FKs
--        + the course relationship columns/indexes/FKs on the existing
--          payload_locked_documents_rels table.
--
-- STRICTLY ADDITIVE: no DROP, no destructive ALTER. Every statement is
-- idempotent (IF NOT EXISTS / exception-guarded DO blocks), so it can be run
-- multiple times safely. It does NOT depend on the locale enum name
-- (_locales vs enum__locales) — none of these objects reference it.
--
-- The whole file is run inside a single transaction by the TS wrapper.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. payload_migrations table + baseline row
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payload_migrations (
    id integer NOT NULL,
    name character varying,
    batch numeric,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.payload_migrations_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.payload_migrations_id_seq OWNED BY public.payload_migrations.id;
ALTER TABLE ONLY public.payload_migrations
    ALTER COLUMN id SET DEFAULT nextval('public.payload_migrations_id_seq'::regclass);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_migrations_pkey') THEN
        ALTER TABLE ONLY public.payload_migrations
            ADD CONSTRAINT payload_migrations_pkey PRIMARY KEY (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS payload_migrations_created_at_idx
    ON public.payload_migrations USING btree (created_at);
CREATE INDEX IF NOT EXISTS payload_migrations_updated_at_idx
    ON public.payload_migrations USING btree (updated_at);

-- Mark the baseline migration as already applied (batch 1) only if absent.
INSERT INTO public.payload_migrations (id, name, batch)
SELECT nextval('public.payload_migrations_id_seq'), '20260610_193458_init', 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.payload_migrations WHERE name = '20260610_193458_init'
);

-- -----------------------------------------------------------------------------
-- 2. Course enums (idempotent)
-- -----------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE public.enum_lessons_type AS ENUM ('text','embed','video','download');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.enum_lessons_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.enum__lessons_v_version_type AS ENUM ('text','embed','video','download');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.enum__lessons_v_version_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.enum__lessons_v_published_locale AS ENUM ('pl','en');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.enum_users_roles AS ENUM ('admin','customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 3. course_assets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_assets (
    id integer NOT NULL,
    alt character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    url character varying,
    thumbnail_u_r_l character varying,
    filename character varying,
    mime_type character varying,
    filesize numeric,
    width numeric,
    height numeric,
    focal_x numeric,
    focal_y numeric
);
CREATE SEQUENCE IF NOT EXISTS public.course_assets_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.course_assets_id_seq OWNED BY public.course_assets.id;
ALTER TABLE ONLY public.course_assets
    ALTER COLUMN id SET DEFAULT nextval('public.course_assets_id_seq'::regclass);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_assets_pkey') THEN
        ALTER TABLE ONLY public.course_assets ADD CONSTRAINT course_assets_pkey PRIMARY KEY (id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS course_assets_created_at_idx ON public.course_assets USING btree (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS course_assets_filename_idx ON public.course_assets USING btree (filename);
CREATE INDEX IF NOT EXISTS course_assets_updated_at_idx ON public.course_assets USING btree (updated_at);

-- -----------------------------------------------------------------------------
-- 4. lessons
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lessons (
    id integer NOT NULL,
    title character varying,
    program_id integer,
    phase character varying,
    "order" numeric DEFAULT 0,
    type public.enum_lessons_type DEFAULT 'text'::public.enum_lessons_type,
    content jsonb,
    youtube_embed_url character varying,
    download_file_id integer,
    published_at timestamp(3) with time zone,
    generate_slug boolean DEFAULT true,
    slug character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    _status public.enum_lessons_status DEFAULT 'draft'::public.enum_lessons_status
);
CREATE SEQUENCE IF NOT EXISTS public.lessons_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;
ALTER TABLE ONLY public.lessons
    ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_pkey') THEN
        ALTER TABLE ONLY public.lessons ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS lessons__status_idx ON public.lessons USING btree (_status);
CREATE INDEX IF NOT EXISTS lessons_created_at_idx ON public.lessons USING btree (created_at);
CREATE INDEX IF NOT EXISTS lessons_download_file_idx ON public.lessons USING btree (download_file_id);
CREATE INDEX IF NOT EXISTS lessons_program_idx ON public.lessons USING btree (program_id);
CREATE UNIQUE INDEX IF NOT EXISTS lessons_slug_idx ON public.lessons USING btree (slug);
CREATE INDEX IF NOT EXISTS lessons_updated_at_idx ON public.lessons USING btree (updated_at);

-- -----------------------------------------------------------------------------
-- 5. _lessons_v (drafts/versions table)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._lessons_v (
    id integer NOT NULL,
    parent_id integer,
    version_title character varying,
    version_program_id integer,
    version_phase character varying,
    version_order numeric DEFAULT 0,
    version_type public.enum__lessons_v_version_type DEFAULT 'text'::public.enum__lessons_v_version_type,
    version_content jsonb,
    version_youtube_embed_url character varying,
    version_download_file_id integer,
    version_published_at timestamp(3) with time zone,
    version_generate_slug boolean DEFAULT true,
    version_slug character varying,
    version_updated_at timestamp(3) with time zone,
    version_created_at timestamp(3) with time zone,
    version__status public.enum__lessons_v_version_status DEFAULT 'draft'::public.enum__lessons_v_version_status,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    snapshot boolean,
    published_locale public.enum__lessons_v_published_locale,
    latest boolean,
    autosave boolean
);
CREATE SEQUENCE IF NOT EXISTS public._lessons_v_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public._lessons_v_id_seq OWNED BY public._lessons_v.id;
ALTER TABLE ONLY public._lessons_v
    ALTER COLUMN id SET DEFAULT nextval('public._lessons_v_id_seq'::regclass);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_lessons_v_pkey') THEN
        ALTER TABLE ONLY public._lessons_v ADD CONSTRAINT _lessons_v_pkey PRIMARY KEY (id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS _lessons_v_autosave_idx ON public._lessons_v USING btree (autosave);
CREATE INDEX IF NOT EXISTS _lessons_v_created_at_idx ON public._lessons_v USING btree (created_at);
CREATE INDEX IF NOT EXISTS _lessons_v_latest_idx ON public._lessons_v USING btree (latest);
CREATE INDEX IF NOT EXISTS _lessons_v_parent_idx ON public._lessons_v USING btree (parent_id);
CREATE INDEX IF NOT EXISTS _lessons_v_published_locale_idx ON public._lessons_v USING btree (published_locale);
CREATE INDEX IF NOT EXISTS _lessons_v_snapshot_idx ON public._lessons_v USING btree (snapshot);
CREATE INDEX IF NOT EXISTS _lessons_v_updated_at_idx ON public._lessons_v USING btree (updated_at);
CREATE INDEX IF NOT EXISTS _lessons_v_version_version__status_idx ON public._lessons_v USING btree (version__status);
CREATE INDEX IF NOT EXISTS _lessons_v_version_version_created_at_idx ON public._lessons_v USING btree (version_created_at);
CREATE INDEX IF NOT EXISTS _lessons_v_version_version_download_file_idx ON public._lessons_v USING btree (version_download_file_id);
CREATE INDEX IF NOT EXISTS _lessons_v_version_version_program_idx ON public._lessons_v USING btree (version_program_id);
CREATE INDEX IF NOT EXISTS _lessons_v_version_version_slug_idx ON public._lessons_v USING btree (version_slug);
CREATE INDEX IF NOT EXISTS _lessons_v_version_version_updated_at_idx ON public._lessons_v USING btree (version_updated_at);

-- -----------------------------------------------------------------------------
-- 6. stripe_events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id integer NOT NULL,
    event_id character varying NOT NULL,
    type character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.stripe_events_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.stripe_events_id_seq OWNED BY public.stripe_events.id;
ALTER TABLE ONLY public.stripe_events
    ALTER COLUMN id SET DEFAULT nextval('public.stripe_events_id_seq'::regclass);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stripe_events_pkey') THEN
        ALTER TABLE ONLY public.stripe_events ADD CONSTRAINT stripe_events_pkey PRIMARY KEY (id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS stripe_events_created_at_idx ON public.stripe_events USING btree (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_event_id_idx ON public.stripe_events USING btree (event_id);
CREATE INDEX IF NOT EXISTS stripe_events_updated_at_idx ON public.stripe_events USING btree (updated_at);

-- -----------------------------------------------------------------------------
-- 7. users_roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users_roles (
    "order" integer NOT NULL,
    parent_id integer NOT NULL,
    value public.enum_users_roles,
    id integer NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS public.users_roles_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.users_roles_id_seq OWNED BY public.users_roles.id;
ALTER TABLE ONLY public.users_roles
    ALTER COLUMN id SET DEFAULT nextval('public.users_roles_id_seq'::regclass);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_roles_pkey') THEN
        ALTER TABLE ONLY public.users_roles ADD CONSTRAINT users_roles_pkey PRIMARY KEY (id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS users_roles_order_idx ON public.users_roles USING btree ("order");
CREATE INDEX IF NOT EXISTS users_roles_parent_idx ON public.users_roles USING btree (parent_id);

-- -----------------------------------------------------------------------------
-- 8. Foreign keys between the new course tables and pre-existing tables
--    (program, users). Exception-guarded so re-runs are safe.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE ONLY public.lessons
        ADD CONSTRAINT lessons_download_file_id_course_assets_id_fk
        FOREIGN KEY (download_file_id) REFERENCES public.course_assets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ONLY public.lessons
        ADD CONSTRAINT lessons_program_id_program_id_fk
        FOREIGN KEY (program_id) REFERENCES public.program(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ONLY public._lessons_v
        ADD CONSTRAINT _lessons_v_parent_id_lessons_id_fk
        FOREIGN KEY (parent_id) REFERENCES public.lessons(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ONLY public._lessons_v
        ADD CONSTRAINT _lessons_v_version_download_file_id_course_assets_id_fk
        FOREIGN KEY (version_download_file_id) REFERENCES public.course_assets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ONLY public._lessons_v
        ADD CONSTRAINT _lessons_v_version_program_id_program_id_fk
        FOREIGN KEY (version_program_id) REFERENCES public.program(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ONLY public.users_roles
        ADD CONSTRAINT users_roles_parent_fk
        FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 9. payload_locked_documents_rels: add the course relationship columns,
--    indexes and FKs (prod was built before the course tables existed, so
--    these are missing). Columns added with IF NOT EXISTS; FKs guarded.
-- -----------------------------------------------------------------------------
ALTER TABLE public.payload_locked_documents_rels ADD COLUMN IF NOT EXISTS lessons_id integer;
ALTER TABLE public.payload_locked_documents_rels ADD COLUMN IF NOT EXISTS course_assets_id integer;
ALTER TABLE public.payload_locked_documents_rels ADD COLUMN IF NOT EXISTS stripe_events_id integer;

CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_lessons_id_idx
    ON public.payload_locked_documents_rels USING btree (lessons_id);
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_course_assets_id_idx
    ON public.payload_locked_documents_rels USING btree (course_assets_id);
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_stripe_events_id_idx
    ON public.payload_locked_documents_rels USING btree (stripe_events_id);

DO $$ BEGIN
    ALTER TABLE ONLY public.payload_locked_documents_rels
        ADD CONSTRAINT payload_locked_documents_rels_lessons_fk
        FOREIGN KEY (lessons_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ONLY public.payload_locked_documents_rels
        ADD CONSTRAINT payload_locked_documents_rels_course_assets_fk
        FOREIGN KEY (course_assets_id) REFERENCES public.course_assets(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ONLY public.payload_locked_documents_rels
        ADD CONSTRAINT payload_locked_documents_rels_stripe_events_fk
        FOREIGN KEY (stripe_events_id) REFERENCES public.stripe_events(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
