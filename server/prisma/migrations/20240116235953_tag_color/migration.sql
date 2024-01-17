/*
  Warnings:

  - Added the required column `color` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tag"
  ADD COLUMN "color" TEXT,
  ADD COLUMN "textColor" TEXT;

UPDATE "Tag"
SET
  "color" = 'ccffff',
  "textColor" = '222';


ALTER TABLE "Tag"
  ALTER COLUMN "color" SET NOT NULL,
  ALTER COLUMN "textColor" SET NOT NULL;
