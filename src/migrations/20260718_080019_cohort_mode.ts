import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_program_cohort_config_checkin_fields_field_type" AS ENUM('boolean', 'number', 'select', 'text');
  CREATE TYPE "public"."enum_program_delivery_mode" AS ENUM('self-paced', 'cohort');
  CREATE TYPE "public"."enum__program_v_version_cohort_config_checkin_fields_field_type" AS ENUM('boolean', 'number', 'select', 'text');
  CREATE TYPE "public"."enum__program_v_version_delivery_mode" AS ENUM('self-paced', 'cohort');
  CREATE TABLE "program_cohort_config_checkin_fields_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "program_cohort_config_checkin_fields_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_cohort_config_checkin_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"field_type" "enum_program_cohort_config_checkin_fields_field_type" DEFAULT 'number',
  	"min" numeric,
  	"max" numeric
  );
  
  CREATE TABLE "program_cohort_config_checkin_fields_locales" (
  	"label" varchar,
  	"section" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_cohort_config_measurement_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar
  );
  
  CREATE TABLE "program_cohort_config_measurement_points_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_cohort_config_measurement_metrics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"unit" varchar,
  	"min" numeric,
  	"max" numeric
  );
  
  CREATE TABLE "program_cohort_config_measurement_metrics_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_cohort_config_completion_extra_targets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field_key" varchar,
  	"target" numeric
  );
  
  CREATE TABLE "program_cohort_config_completion_extra_targets_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_program_v_version_cohort_config_checkin_fields_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_program_v_version_cohort_config_checkin_fields_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_version_cohort_config_checkin_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"field_type" "enum__program_v_version_cohort_config_checkin_fields_field_type" DEFAULT 'number',
  	"min" numeric,
  	"max" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_program_v_version_cohort_config_checkin_fields_locales" (
  	"label" varchar,
  	"section" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_version_cohort_config_measurement_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_program_v_version_cohort_config_measurement_points_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_version_cohort_config_measurement_metrics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"unit" varchar,
  	"min" numeric,
  	"max" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_program_v_version_cohort_config_measurement_metrics_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_version_cohort_config_completion_extra_targets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"field_key" varchar,
  	"target" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_program_v_version_cohort_config_completion_extra_targets_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "cohorts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"program_id" integer NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cohort_members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"cohort_id" integer NOT NULL,
  	"program_id" integer NOT NULL,
  	"joined_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "checkins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"program_id" integer NOT NULL,
  	"date" varchar NOT NULL,
  	"program_day" numeric NOT NULL,
  	"minimum_done" boolean DEFAULT false NOT NULL,
  	"note" varchar,
  	"values" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "course_measurements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"program_id" integer NOT NULL,
  	"point" varchar NOT NULL,
  	"values" jsonb,
  	"recorded_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "course_invites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"program_id" integer NOT NULL,
  	"cohort_id" integer NOT NULL,
  	"token" varchar,
  	"expires_at" timestamp(3) with time zone,
  	"used_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "agent_api_keys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"key_prefix" varchar NOT NULL,
  	"key_hash" varchar NOT NULL,
  	"last_used_at" timestamp(3) with time zone,
  	"revoked_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "program" ADD COLUMN "delivery_mode" "enum_program_delivery_mode" DEFAULT 'self-paced';
  ALTER TABLE "program" ADD COLUMN "cohort_config_program_length" numeric;
  ALTER TABLE "program" ADD COLUMN "cohort_config_unlock_hour" numeric DEFAULT 6;
  ALTER TABLE "program" ADD COLUMN "cohort_config_timezone" varchar DEFAULT 'Europe/Warsaw';
  ALTER TABLE "program" ADD COLUMN "cohort_config_completion_minimum_days_target" numeric;
  ALTER TABLE "program_locales" ADD COLUMN "cohort_config_minimum_label" varchar;
  ALTER TABLE "_program_v" ADD COLUMN "version_delivery_mode" "enum__program_v_version_delivery_mode" DEFAULT 'self-paced';
  ALTER TABLE "_program_v" ADD COLUMN "version_cohort_config_program_length" numeric;
  ALTER TABLE "_program_v" ADD COLUMN "version_cohort_config_unlock_hour" numeric DEFAULT 6;
  ALTER TABLE "_program_v" ADD COLUMN "version_cohort_config_timezone" varchar DEFAULT 'Europe/Warsaw';
  ALTER TABLE "_program_v" ADD COLUMN "version_cohort_config_completion_minimum_days_target" numeric;
  ALTER TABLE "_program_v_locales" ADD COLUMN "version_cohort_config_minimum_label" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cohorts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cohort_members_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "checkins_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "course_measurements_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "course_invites_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_api_keys_id" integer;
  ALTER TABLE "program_cohort_config_checkin_fields_options" ADD CONSTRAINT "program_cohort_config_checkin_fields_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_cohort_config_checkin_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_checkin_fields_options_locales" ADD CONSTRAINT "program_cohort_config_checkin_fields_options_locales_pare_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_cohort_config_checkin_fields_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_checkin_fields" ADD CONSTRAINT "program_cohort_config_checkin_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_checkin_fields_locales" ADD CONSTRAINT "program_cohort_config_checkin_fields_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_cohort_config_checkin_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_measurement_points" ADD CONSTRAINT "program_cohort_config_measurement_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_measurement_points_locales" ADD CONSTRAINT "program_cohort_config_measurement_points_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_cohort_config_measurement_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_measurement_metrics" ADD CONSTRAINT "program_cohort_config_measurement_metrics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_measurement_metrics_locales" ADD CONSTRAINT "program_cohort_config_measurement_metrics_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_cohort_config_measurement_metrics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_completion_extra_targets" ADD CONSTRAINT "program_cohort_config_completion_extra_targets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_cohort_config_completion_extra_targets_locales" ADD CONSTRAINT "program_cohort_config_completion_extra_targets_locales_pa_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_cohort_config_completion_extra_targets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_texts" ADD CONSTRAINT "program_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_checkin_fields_options" ADD CONSTRAINT "_program_v_version_cohort_config_checkin_fields_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_cohort_config_checkin_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_checkin_fields_options_locales" ADD CONSTRAINT "_program_v_version_cohort_config_checkin_fields_options_l_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_cohort_config_checkin_fields_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_checkin_fields" ADD CONSTRAINT "_program_v_version_cohort_config_checkin_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_checkin_fields_locales" ADD CONSTRAINT "_program_v_version_cohort_config_checkin_fields_locales_p_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_cohort_config_checkin_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_measurement_points" ADD CONSTRAINT "_program_v_version_cohort_config_measurement_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_measurement_points_locales" ADD CONSTRAINT "_program_v_version_cohort_config_measurement_points_local_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_cohort_config_measurement_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_measurement_metrics" ADD CONSTRAINT "_program_v_version_cohort_config_measurement_metrics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_measurement_metrics_locales" ADD CONSTRAINT "_program_v_version_cohort_config_measurement_metrics_loca_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_cohort_config_measurement_metrics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_completion_extra_targets" ADD CONSTRAINT "_program_v_version_cohort_config_completion_extra_targets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_cohort_config_completion_extra_targets_locales" ADD CONSTRAINT "_program_v_version_cohort_config_completion_extra_targets_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_cohort_config_completion_extra_targets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_texts" ADD CONSTRAINT "_program_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cohort_members" ADD CONSTRAINT "cohort_members_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checkins" ADD CONSTRAINT "checkins_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "course_measurements" ADD CONSTRAINT "course_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "course_measurements" ADD CONSTRAINT "course_measurements_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "course_invites" ADD CONSTRAINT "course_invites_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "course_invites" ADD CONSTRAINT "course_invites_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "course_invites" ADD CONSTRAINT "course_invites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "program_cohort_config_checkin_fields_options_order_idx" ON "program_cohort_config_checkin_fields_options" USING btree ("_order");
  CREATE INDEX "program_cohort_config_checkin_fields_options_parent_id_idx" ON "program_cohort_config_checkin_fields_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "program_cohort_config_checkin_fields_options_locales_locale_" ON "program_cohort_config_checkin_fields_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "program_cohort_config_checkin_fields_order_idx" ON "program_cohort_config_checkin_fields" USING btree ("_order");
  CREATE INDEX "program_cohort_config_checkin_fields_parent_id_idx" ON "program_cohort_config_checkin_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "program_cohort_config_checkin_fields_locales_locale_parent_i" ON "program_cohort_config_checkin_fields_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "program_cohort_config_measurement_points_order_idx" ON "program_cohort_config_measurement_points" USING btree ("_order");
  CREATE INDEX "program_cohort_config_measurement_points_parent_id_idx" ON "program_cohort_config_measurement_points" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "program_cohort_config_measurement_points_locales_locale_pare" ON "program_cohort_config_measurement_points_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "program_cohort_config_measurement_metrics_order_idx" ON "program_cohort_config_measurement_metrics" USING btree ("_order");
  CREATE INDEX "program_cohort_config_measurement_metrics_parent_id_idx" ON "program_cohort_config_measurement_metrics" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "program_cohort_config_measurement_metrics_locales_locale_par" ON "program_cohort_config_measurement_metrics_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "program_cohort_config_completion_extra_targets_order_idx" ON "program_cohort_config_completion_extra_targets" USING btree ("_order");
  CREATE INDEX "program_cohort_config_completion_extra_targets_parent_id_idx" ON "program_cohort_config_completion_extra_targets" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "program_cohort_config_completion_extra_targets_locales_local" ON "program_cohort_config_completion_extra_targets_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "program_texts_order_parent" ON "program_texts" USING btree ("order","parent_id");
  CREATE INDEX "_program_v_version_cohort_config_checkin_fields_options_order_idx" ON "_program_v_version_cohort_config_checkin_fields_options" USING btree ("_order");
  CREATE INDEX "_program_v_version_cohort_config_checkin_fields_options_parent_id_idx" ON "_program_v_version_cohort_config_checkin_fields_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_cohort_config_checkin_fields_options_loca" ON "_program_v_version_cohort_config_checkin_fields_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_version_cohort_config_checkin_fields_order_idx" ON "_program_v_version_cohort_config_checkin_fields" USING btree ("_order");
  CREATE INDEX "_program_v_version_cohort_config_checkin_fields_parent_id_idx" ON "_program_v_version_cohort_config_checkin_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_cohort_config_checkin_fields_locales_loca" ON "_program_v_version_cohort_config_checkin_fields_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_version_cohort_config_measurement_points_order_idx" ON "_program_v_version_cohort_config_measurement_points" USING btree ("_order");
  CREATE INDEX "_program_v_version_cohort_config_measurement_points_parent_id_idx" ON "_program_v_version_cohort_config_measurement_points" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_cohort_config_measurement_points_locales_" ON "_program_v_version_cohort_config_measurement_points_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_version_cohort_config_measurement_metrics_order_idx" ON "_program_v_version_cohort_config_measurement_metrics" USING btree ("_order");
  CREATE INDEX "_program_v_version_cohort_config_measurement_metrics_parent_id_idx" ON "_program_v_version_cohort_config_measurement_metrics" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_cohort_config_measurement_metrics_local_1" ON "_program_v_version_cohort_config_measurement_metrics_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_version_cohort_config_completion_extra_targets_order_idx" ON "_program_v_version_cohort_config_completion_extra_targets" USING btree ("_order");
  CREATE INDEX "_program_v_version_cohort_config_completion_extra_targets_parent_id_idx" ON "_program_v_version_cohort_config_completion_extra_targets" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_cohort_config_completion_extra_targets_lo" ON "_program_v_version_cohort_config_completion_extra_targets_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_texts_order_parent" ON "_program_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "cohorts_program_idx" ON "cohorts" USING btree ("program_id");
  CREATE INDEX "cohorts_updated_at_idx" ON "cohorts" USING btree ("updated_at");
  CREATE INDEX "cohorts_created_at_idx" ON "cohorts" USING btree ("created_at");
  CREATE INDEX "cohort_members_user_idx" ON "cohort_members" USING btree ("user_id");
  CREATE INDEX "cohort_members_cohort_idx" ON "cohort_members" USING btree ("cohort_id");
  CREATE INDEX "cohort_members_program_idx" ON "cohort_members" USING btree ("program_id");
  CREATE INDEX "cohort_members_updated_at_idx" ON "cohort_members" USING btree ("updated_at");
  CREATE INDEX "cohort_members_created_at_idx" ON "cohort_members" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_program_idx" ON "cohort_members" USING btree ("user_id","program_id");
  CREATE INDEX "checkins_user_idx" ON "checkins" USING btree ("user_id");
  CREATE INDEX "checkins_program_idx" ON "checkins" USING btree ("program_id");
  CREATE INDEX "checkins_updated_at_idx" ON "checkins" USING btree ("updated_at");
  CREATE INDEX "checkins_created_at_idx" ON "checkins" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_program_date_idx" ON "checkins" USING btree ("user_id","program_id","date");
  CREATE INDEX "course_measurements_user_idx" ON "course_measurements" USING btree ("user_id");
  CREATE INDEX "course_measurements_program_idx" ON "course_measurements" USING btree ("program_id");
  CREATE INDEX "course_measurements_updated_at_idx" ON "course_measurements" USING btree ("updated_at");
  CREATE INDEX "course_measurements_created_at_idx" ON "course_measurements" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_program_point_idx" ON "course_measurements" USING btree ("user_id","program_id","point");
  CREATE INDEX "course_invites_program_idx" ON "course_invites" USING btree ("program_id");
  CREATE INDEX "course_invites_cohort_idx" ON "course_invites" USING btree ("cohort_id");
  CREATE UNIQUE INDEX "course_invites_token_idx" ON "course_invites" USING btree ("token");
  CREATE INDEX "course_invites_created_by_idx" ON "course_invites" USING btree ("created_by_id");
  CREATE INDEX "course_invites_updated_at_idx" ON "course_invites" USING btree ("updated_at");
  CREATE INDEX "course_invites_created_at_idx" ON "course_invites" USING btree ("created_at");
  CREATE INDEX "agent_api_keys_user_idx" ON "agent_api_keys" USING btree ("user_id");
  CREATE UNIQUE INDEX "agent_api_keys_key_hash_idx" ON "agent_api_keys" USING btree ("key_hash");
  CREATE INDEX "agent_api_keys_updated_at_idx" ON "agent_api_keys" USING btree ("updated_at");
  CREATE INDEX "agent_api_keys_created_at_idx" ON "agent_api_keys" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cohorts_fk" FOREIGN KEY ("cohorts_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cohort_members_fk" FOREIGN KEY ("cohort_members_id") REFERENCES "public"."cohort_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_checkins_fk" FOREIGN KEY ("checkins_id") REFERENCES "public"."checkins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_measurements_fk" FOREIGN KEY ("course_measurements_id") REFERENCES "public"."course_measurements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_invites_fk" FOREIGN KEY ("course_invites_id") REFERENCES "public"."course_invites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_api_keys_fk" FOREIGN KEY ("agent_api_keys_id") REFERENCES "public"."agent_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_cohorts_id_idx" ON "payload_locked_documents_rels" USING btree ("cohorts_id");
  CREATE INDEX "payload_locked_documents_rels_cohort_members_id_idx" ON "payload_locked_documents_rels" USING btree ("cohort_members_id");
  CREATE INDEX "payload_locked_documents_rels_checkins_id_idx" ON "payload_locked_documents_rels" USING btree ("checkins_id");
  CREATE INDEX "payload_locked_documents_rels_course_measurements_id_idx" ON "payload_locked_documents_rels" USING btree ("course_measurements_id");
  CREATE INDEX "payload_locked_documents_rels_course_invites_id_idx" ON "payload_locked_documents_rels" USING btree ("course_invites_id");
  CREATE INDEX "payload_locked_documents_rels_agent_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_api_keys_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "program_cohort_config_checkin_fields_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_checkin_fields_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_checkin_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_checkin_fields_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_measurement_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_measurement_points_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_measurement_metrics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_measurement_metrics_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_completion_extra_targets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_cohort_config_completion_extra_targets_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "program_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_checkin_fields_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_checkin_fields_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_checkin_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_checkin_fields_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_measurement_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_measurement_points_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_measurement_metrics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_measurement_metrics_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_completion_extra_targets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_version_cohort_config_completion_extra_targets_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_program_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cohorts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cohort_members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checkins" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "course_measurements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "course_invites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "agent_api_keys" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "program_cohort_config_checkin_fields_options" CASCADE;
  DROP TABLE "program_cohort_config_checkin_fields_options_locales" CASCADE;
  DROP TABLE "program_cohort_config_checkin_fields" CASCADE;
  DROP TABLE "program_cohort_config_checkin_fields_locales" CASCADE;
  DROP TABLE "program_cohort_config_measurement_points" CASCADE;
  DROP TABLE "program_cohort_config_measurement_points_locales" CASCADE;
  DROP TABLE "program_cohort_config_measurement_metrics" CASCADE;
  DROP TABLE "program_cohort_config_measurement_metrics_locales" CASCADE;
  DROP TABLE "program_cohort_config_completion_extra_targets" CASCADE;
  DROP TABLE "program_cohort_config_completion_extra_targets_locales" CASCADE;
  DROP TABLE "program_texts" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_checkin_fields_options" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_checkin_fields_options_locales" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_checkin_fields" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_checkin_fields_locales" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_measurement_points" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_measurement_points_locales" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_measurement_metrics" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_measurement_metrics_locales" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_completion_extra_targets" CASCADE;
  DROP TABLE "_program_v_version_cohort_config_completion_extra_targets_locales" CASCADE;
  DROP TABLE "_program_v_texts" CASCADE;
  DROP TABLE "cohorts" CASCADE;
  DROP TABLE "cohort_members" CASCADE;
  DROP TABLE "checkins" CASCADE;
  DROP TABLE "course_measurements" CASCADE;
  DROP TABLE "course_invites" CASCADE;
  DROP TABLE "agent_api_keys" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cohorts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cohort_members_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_checkins_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_course_measurements_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_course_invites_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_api_keys_fk";
  
  DROP INDEX "payload_locked_documents_rels_cohorts_id_idx";
  DROP INDEX "payload_locked_documents_rels_cohort_members_id_idx";
  DROP INDEX "payload_locked_documents_rels_checkins_id_idx";
  DROP INDEX "payload_locked_documents_rels_course_measurements_id_idx";
  DROP INDEX "payload_locked_documents_rels_course_invites_id_idx";
  DROP INDEX "payload_locked_documents_rels_agent_api_keys_id_idx";
  ALTER TABLE "program" DROP COLUMN "delivery_mode";
  ALTER TABLE "program" DROP COLUMN "cohort_config_program_length";
  ALTER TABLE "program" DROP COLUMN "cohort_config_unlock_hour";
  ALTER TABLE "program" DROP COLUMN "cohort_config_timezone";
  ALTER TABLE "program" DROP COLUMN "cohort_config_completion_minimum_days_target";
  ALTER TABLE "program_locales" DROP COLUMN "cohort_config_minimum_label";
  ALTER TABLE "_program_v" DROP COLUMN "version_delivery_mode";
  ALTER TABLE "_program_v" DROP COLUMN "version_cohort_config_program_length";
  ALTER TABLE "_program_v" DROP COLUMN "version_cohort_config_unlock_hour";
  ALTER TABLE "_program_v" DROP COLUMN "version_cohort_config_timezone";
  ALTER TABLE "_program_v" DROP COLUMN "version_cohort_config_completion_minimum_days_target";
  ALTER TABLE "_program_v_locales" DROP COLUMN "version_cohort_config_minimum_label";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cohorts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cohort_members_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "checkins_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "course_measurements_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "course_invites_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_api_keys_id";
  DROP TYPE "public"."enum_program_cohort_config_checkin_fields_field_type";
  DROP TYPE "public"."enum_program_delivery_mode";
  DROP TYPE "public"."enum__program_v_version_cohort_config_checkin_fields_field_type";
  DROP TYPE "public"."enum__program_v_version_delivery_mode";`)
}
