/*
  Warnings:

  - You are about to drop the column `authorId` on the `Note` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_authorId_fkey";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "author" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "authorId";

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
