/*
  Warnings:

  - A unique constraint covering the columns `[rekognitionId]` on the table `FaceBiometric` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rekognitionId` to the `FaceBiometric` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FaceBiometric" ADD COLUMN     "rekognitionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FaceBiometric_rekognitionId_key" ON "FaceBiometric"("rekognitionId");
