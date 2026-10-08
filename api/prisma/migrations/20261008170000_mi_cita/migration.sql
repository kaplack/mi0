-- CreateEnum
CREATE TYPE "CitaStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "cita_clinics" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Lima',
    "require_dni" BOOLEAN NOT NULL DEFAULT false,
    "expiration_hours" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cita_clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cita_professionals" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "specialty" VARCHAR(120) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cita_professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cita_schedules" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,

    CONSTRAINT "cita_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cita_appointments" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "request_key" UUID NOT NULL,
    "patient_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "dni" VARCHAR(8),
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "CitaStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),

    CONSTRAINT "cita_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cita_clinics_workspace_id_key" ON "cita_clinics"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "cita_clinics_code_key" ON "cita_clinics"("code");

-- CreateIndex
CREATE INDEX "cita_professionals_clinic_id_active_idx" ON "cita_professionals"("clinic_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "cita_professionals_clinic_id_id_key" ON "cita_professionals"("clinic_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "cita_schedules_professional_id_weekday_start_minute_key" ON "cita_schedules"("professional_id", "weekday", "start_minute");

-- CreateIndex
CREATE UNIQUE INDEX "cita_appointments_request_key_key" ON "cita_appointments"("request_key");

-- CreateIndex
CREATE INDEX "cita_appointments_clinic_id_starts_at_idx" ON "cita_appointments"("clinic_id", "starts_at");

-- CreateIndex
CREATE INDEX "cita_appointments_status_expires_at_idx" ON "cita_appointments"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "cita_clinics" ADD CONSTRAINT "cita_clinics_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita_professionals" ADD CONSTRAINT "cita_professionals_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "cita_clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita_schedules" ADD CONSTRAINT "cita_schedules_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "cita_professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita_appointments" ADD CONSTRAINT "cita_appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "cita_clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita_appointments" ADD CONSTRAINT "cita_appointments_clinic_id_professional_id_fkey" FOREIGN KEY ("clinic_id", "professional_id") REFERENCES "cita_professionals"("clinic_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- PostgreSQL is the final guard against overlapping appointments, even outside the API.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
ALTER TABLE "cita_appointments" ADD CONSTRAINT "cita_no_overlap" EXCLUDE USING gist
  ("professional_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));
ALTER TABLE "cita_appointments" ADD CONSTRAINT "cita_valid_interval" CHECK ("ends_at" > "starts_at" AND "expires_at" <= "starts_at");
ALTER TABLE "cita_clinics" ADD CONSTRAINT "cita_valid_expiration" CHECK ("expiration_hours" IS NULL OR "expiration_hours" IN (2,6,12,24));
ALTER TABLE "cita_professionals" ADD CONSTRAINT "cita_valid_duration" CHECK ("duration_minutes" BETWEEN 10 AND 240);
ALTER TABLE "cita_schedules" ADD CONSTRAINT "cita_valid_schedule" CHECK ("weekday" BETWEEN 0 AND 6 AND "start_minute" >= 0 AND "end_minute" <= 1440 AND "end_minute" > "start_minute");
INSERT INTO "modules" ("id", "code", "name", "description", "active", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'mi-cita', 'Mi Cita', 'Reservas con QR, profesionales y confirmación de citas.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
