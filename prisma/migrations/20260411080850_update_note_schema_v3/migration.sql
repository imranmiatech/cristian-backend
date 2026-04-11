-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "type" TEXT DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");

-- CreateIndex
CREATE INDEX "Note_type_idx" ON "Note"("type");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
