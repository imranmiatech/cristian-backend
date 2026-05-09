-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "contactName" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "contactName" TEXT;

-- AlterTable
ALTER TABLE "NoteHistory" ADD COLUMN     "newContactName" TEXT,
ADD COLUMN     "newContent" TEXT,
ADD COLUMN     "newDocuments" JSONB,
ADD COLUMN     "newInteractionTypes" JSONB,
ADD COLUMN     "newIsPinned" BOOLEAN,
ADD COLUMN     "newServices" JSONB,
ADD COLUMN     "newTitle" TEXT,
ADD COLUMN     "newType" TEXT,
ADD COLUMN     "oldContactName" TEXT,
ADD COLUMN     "oldIsPinned" BOOLEAN,
ADD COLUMN     "oldType" TEXT;
