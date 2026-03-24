/*
  Warnings:

  - You are about to drop the `_AdminCompanies` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AdminCompanies" DROP CONSTRAINT "_AdminCompanies_A_fkey";

-- DropForeignKey
ALTER TABLE "_AdminCompanies" DROP CONSTRAINT "_AdminCompanies_B_fkey";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "assignUsername" TEXT;

-- DropTable
DROP TABLE "_AdminCompanies";
