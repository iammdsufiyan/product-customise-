-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT,
    "productHandle" TEXT,
    "templateData" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "templates_productId_idx" ON "templates"("productId");

-- CreateIndex
CREATE INDEX "templates_productId_isActive_idx" ON "templates"("productId", "isActive");

-- CreateIndex
CREATE INDEX "templates_isActive_idx" ON "templates"("isActive");

-- CreateIndex
CREATE INDEX "templates_createdAt_idx" ON "templates"("createdAt");

-- CreateIndex
CREATE INDEX "product_option_sets_productId_idx" ON "product_option_sets"("productId");

-- CreateIndex
CREATE INDEX "product_option_sets_productId_isActive_idx" ON "product_option_sets"("productId", "isActive");

-- CreateIndex
CREATE INDEX "product_option_sets_optionSetId_idx" ON "product_option_sets"("optionSetId");

-- CreateIndex
CREATE INDEX "product_option_sets_isActive_idx" ON "product_option_sets"("isActive");

-- CreateIndex
CREATE INDEX "product_option_sets_createdAt_idx" ON "product_option_sets"("createdAt");

-- CreateIndex
CREATE INDEX "product_option_sets_productHandle_idx" ON "product_option_sets"("productHandle");
