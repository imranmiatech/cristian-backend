/*
  Warnings:

  - You are about to drop the column `language` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mfaEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notification_recipients` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_userId_fkey";

-- DropForeignKey
ALTER TABLE "notification_recipients" DROP CONSTRAINT "notification_recipients_notificationId_fkey";

-- DropForeignKey
ALTER TABLE "notification_recipients" DROP CONSTRAINT "notification_recipients_userId_fkey";

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "userAgent" DROP NOT NULL,
ALTER COLUMN "ipAddress" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "language",
DROP COLUMN "mfaEnabled";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "notification_preferences";

-- DropTable
DROP TABLE "notification_recipients";

-- DropEnum
DROP TYPE "Language";

-- DropEnum
DROP TYPE "NotificationActorType";

-- DropEnum
DROP TYPE "NotificationResourceType";

-- DropEnum
DROP TYPE "NotificationType";
