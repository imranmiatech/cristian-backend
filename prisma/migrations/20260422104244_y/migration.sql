/*
  Warnings:

  - You are about to drop the column `oldTags` on the `NoteHistory` table. All the data in the column will be lost.
  - You are about to drop the `_NoteTags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_NoteTags" DROP CONSTRAINT "_NoteTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_NoteTags" DROP CONSTRAINT "_NoteTags_B_fkey";

-- AlterTable
ALTER TABLE "NoteHistory" DROP COLUMN "oldTags";

-- DropTable
DROP TABLE "_NoteTags";

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");

-- CreateIndex
CREATE INDEX "Note_type_idx" ON "Note"("type");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");
