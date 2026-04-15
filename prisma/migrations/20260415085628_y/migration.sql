-- DropIndex
DROP INDEX "Note_authorId_idx";

-- DropIndex
DROP INDEX "Note_communicationTags_idx";

-- DropIndex
DROP INDEX "Note_companyId_idx";

-- DropIndex
DROP INDEX "Note_createdAt_idx";

-- DropIndex
DROP INDEX "Note_isPinned_idx";

-- DropIndex
DROP INDEX "Note_serviceTags_idx";

-- DropIndex
DROP INDEX "Note_title_idx";

-- DropIndex
DROP INDEX "Note_type_idx";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NoteHistory" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "oldTitle" TEXT,
    "oldContent" TEXT,
    "oldTags" TEXT[],
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,

    CONSTRAINT "NoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_companyId_deletedAt_idx" ON "Note"("companyId", "deletedAt");

-- AddForeignKey
ALTER TABLE "NoteHistory" ADD CONSTRAINT "NoteHistory_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteHistory" ADD CONSTRAINT "NoteHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
