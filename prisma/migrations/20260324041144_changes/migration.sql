/*
  Warnings:

  - You are about to drop the column `attachment` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `notTags` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `notTitle` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `noteComment` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `noteId` on the `Document` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Made the column `fileSize` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_noteId_fkey";

-- DropIndex
DROP INDEX "Document_authorId_idx";

-- DropIndex
DROP INDEX "Document_companyId_idx";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "attachment",
DROP COLUMN "notTags",
DROP COLUMN "notTitle",
DROP COLUMN "noteComment";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "authorId",
DROP COLUMN "companyId",
DROP COLUMN "noteId",
ADD COLUMN     "docId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "fileSize" SET NOT NULL;

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "noteId" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_docId_fkey" FOREIGN KEY ("docId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
