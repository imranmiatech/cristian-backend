/*
  Warnings:

  - You are about to drop the column `tags` on the `Note` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Note_tags_idx";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "tags",
ADD COLUMN     "communicationTags" TEXT[],
ADD COLUMN     "serviceTags" TEXT[];

-- CreateIndex
CREATE INDEX "Note_communicationTags_idx" ON "Note"("communicationTags");

-- CreateIndex
CREATE INDEX "Note_serviceTags_idx" ON "Note"("serviceTags");
