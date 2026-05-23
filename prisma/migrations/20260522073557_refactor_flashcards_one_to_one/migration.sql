/*
  Warnings:

  - You are about to drop the column `lectureId` on the `Flashcard` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lectureId]` on the table `Assessment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lectureId]` on the table `Summary` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `flashcardSetId` to the `Flashcard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `Flashcard` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Flashcard" DROP CONSTRAINT "Flashcard_lectureId_fkey";

-- DropIndex
DROP INDEX "public"."Flashcard_lectureId_idx";

-- AlterTable
ALTER TABLE "AssessmentAnswer" ADD COLUMN     "questionSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "lectureId",
ADD COLUMN     "flashcardSetId" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "FlashcardSet" (
    "_id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardSet_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardSet_lectureId_key" ON "FlashcardSet"("lectureId");

-- CreateIndex
CREATE INDEX "FlashcardSet_lectureId_idx" ON "FlashcardSet"("lectureId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_lectureId_key" ON "Assessment"("lectureId");

-- CreateIndex
CREATE INDEX "Flashcard_flashcardSetId_idx" ON "Flashcard"("flashcardSetId");

-- CreateIndex
CREATE UNIQUE INDEX "Summary_lectureId_key" ON "Summary"("lectureId");

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_flashcardSetId_fkey" FOREIGN KEY ("flashcardSetId") REFERENCES "FlashcardSet"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardSet" ADD CONSTRAINT "FlashcardSet_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
