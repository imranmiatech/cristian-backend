/*
  Warnings:

  - You are about to drop the column `oldTags` on the `NoteHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "NoteHistory" DROP COLUMN "oldTags",
ADD COLUMN     "oldCommunicationTags" TEXT[],
ADD COLUMN     "oldServiceTags" TEXT[];

-- CreateIndex
CREATE INDEX "Note_parentId_idx" ON "Note"("parentId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;
