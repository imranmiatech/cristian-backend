/*
  Warnings:

  - You are about to drop the column `communicationTags` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `serviceTags` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `oldCommunicationTags` on the `NoteHistory` table. All the data in the column will be lost.
  - You are about to drop the column `oldServiceTags` on the `NoteHistory` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_docId_fkey";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "communicationTags",
DROP COLUMN "serviceTags";

-- AlterTable
ALTER TABLE "NoteHistory" DROP COLUMN "oldCommunicationTags",
DROP COLUMN "oldServiceTags",
ADD COLUMN     "oldInteractionTypes" JSONB,
ADD COLUMN     "oldServices" JSONB,
ADD COLUMN     "oldTags" JSONB;

-- DropTable
DROP TABLE "Document";

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteractionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "InteractionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_NoteServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NoteServices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NoteTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NoteTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NoteInteractions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NoteInteractions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InteractionType_name_key" ON "InteractionType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "_NoteServices_B_index" ON "_NoteServices"("B");

-- CreateIndex
CREATE INDEX "_NoteTags_B_index" ON "_NoteTags"("B");

-- CreateIndex
CREATE INDEX "_NoteInteractions_B_index" ON "_NoteInteractions"("B");

-- AddForeignKey
ALTER TABLE "_NoteServices" ADD CONSTRAINT "_NoteServices_A_fkey" FOREIGN KEY ("A") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteServices" ADD CONSTRAINT "_NoteServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteInteractions" ADD CONSTRAINT "_NoteInteractions_A_fkey" FOREIGN KEY ("A") REFERENCES "InteractionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteInteractions" ADD CONSTRAINT "_NoteInteractions_B_fkey" FOREIGN KEY ("B") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
