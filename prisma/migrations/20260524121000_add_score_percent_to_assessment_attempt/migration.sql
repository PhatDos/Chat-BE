-- AlterTable
ALTER TABLE "AssessmentAttempt"
ADD COLUMN "scorePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill normalized score for existing attempts
UPDATE "AssessmentAttempt" AS attempt
SET "scorePercent" = CASE
  WHEN COALESCE(assessment."totalPoints", 0) = 0 THEN 0
  ELSE (attempt."finalScore" / assessment."totalPoints") * 100
END
FROM "Assessment" AS assessment
WHERE assessment."_id" = attempt."assessmentId";
