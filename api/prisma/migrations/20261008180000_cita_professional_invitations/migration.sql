-- CreateTable
CREATE TABLE "cita_professional_accesses" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cita_professional_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cita_invitations" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "cita_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cita_professional_accesses_clinic_id_user_id_key" ON "cita_professional_accesses"("clinic_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cita_invitations_token_hash_key" ON "cita_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "cita_invitations_professional_id_status_idx" ON "cita_invitations"("professional_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cita_invitations_clinic_id_email_key" ON "cita_invitations"("clinic_id", "email");

-- AddForeignKey
ALTER TABLE "cita_professional_accesses" ADD CONSTRAINT "cita_professional_accesses_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "cita_clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita_professional_accesses" ADD CONSTRAINT "cita_professional_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita_professional_accesses" ADD CONSTRAINT "cita_professional_accesses_clinic_id_professional_id_fkey" FOREIGN KEY ("clinic_id", "professional_id") REFERENCES "cita_professionals"("clinic_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita_invitations" ADD CONSTRAINT "cita_invitations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "cita_clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cita_invitations" ADD CONSTRAINT "cita_invitations_clinic_id_professional_id_fkey" FOREIGN KEY ("clinic_id", "professional_id") REFERENCES "cita_professionals"("clinic_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE UNIQUE INDEX "cita_access_one_active_professional" ON "cita_professional_accesses" ("professional_id") WHERE "active" = true;
ALTER TABLE "cita_invitations" ADD CONSTRAINT "cita_invitation_status" CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REVOKED'));
