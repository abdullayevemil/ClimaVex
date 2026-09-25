-- CreateIndex
CREATE INDEX "Farm_geom_idx" ON "Farm" USING GIST ("geom");
