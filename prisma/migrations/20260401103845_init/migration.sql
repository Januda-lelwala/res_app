-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" REAL,
    "totalRatings" INTEGER,
    "priceLevel" INTEGER,
    "address" TEXT,
    "openNow" BOOLEAN,
    "photoUrl" TEXT,
    "lat" REAL,
    "lng" REAL,
    "types" TEXT NOT NULL DEFAULT '[]',
    "searchAliases" TEXT NOT NULL DEFAULT '[]',
    "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_placeId_key" ON "Place"("placeId");
