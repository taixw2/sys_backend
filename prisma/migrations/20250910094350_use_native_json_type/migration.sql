/*
  Warnings:

  - You are about to alter the column `sentences` on the `beautiful_articles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.

*/
-- AlterTable
ALTER TABLE `beautiful_articles` MODIFY `sentences` JSON NOT NULL;
