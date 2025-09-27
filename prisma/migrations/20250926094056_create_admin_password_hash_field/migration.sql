/*
  Warnings:

  - Added the required column `passwordHash` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordSalt` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminId` to the `merchants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `admins` ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL,
    ADD COLUMN `passwordSalt` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `merchants` ADD COLUMN `adminId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
