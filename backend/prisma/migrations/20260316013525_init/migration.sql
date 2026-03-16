-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "parent_email" TEXT NOT NULL,
    "normalized_first_name" TEXT NOT NULL,
    "normalized_last_name" TEXT NOT NULL,
    "normalized_parent_email" TEXT NOT NULL,
    "metaphone_first_name" TEXT NOT NULL,
    "metaphone_last_name" TEXT NOT NULL,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_metaphone" ON "athletes"("metaphone_first_name", "metaphone_last_name");

-- CreateIndex
CREATE INDEX "idx_normalized_name" ON "athletes"("normalized_first_name", "normalized_last_name");

-- CreateIndex
CREATE INDEX "idx_normalized_email" ON "athletes"("normalized_parent_email");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_normalized_first_name_normalized_last_name_normali_key" ON "athletes"("normalized_first_name", "normalized_last_name", "normalized_parent_email");
