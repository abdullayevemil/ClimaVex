-- Postgres fires triggers in alphabetical order, so the separate centroid
-- trigger ran before `geom` was populated and always wrote 0/0. Fold the
-- centroid into the single areal-geometry trigger to remove the ordering
-- dependency entirely.

DROP TRIGGER IF EXISTS trg_farm_centroid ON "Farm";
DROP FUNCTION IF EXISTS climavex_sync_farm_centroid();

CREATE OR REPLACE FUNCTION climavex_sync_areal_geom() RETURNS trigger AS $$
DECLARE
  parsed geometry;
BEGIN
  IF NEW."geojson" IS NULL OR NEW."geojson"::text = 'null' THEN
    NEW."geom" := NULL;
    NEW."areaM2" := 0;
    RETURN NEW;
  END IF;

  parsed := ST_SetSRID(ST_GeomFromGeoJSON(NEW."geojson"::text), 4326);

  IF NOT ST_IsValid(parsed) THEN
    parsed := ST_MakeValid(parsed);
  END IF;

  parsed := ST_Multi(ST_CollectionExtract(parsed, 3));

  IF parsed IS NULL OR ST_IsEmpty(parsed) THEN
    RAISE EXCEPTION 'climavex: geojson did not yield a usable polygonal geometry';
  END IF;

  NEW."geom"   := parsed;
  NEW."areaM2" := ROUND(ST_Area(parsed::geography)::numeric, 2);

  IF TG_TABLE_NAME = 'Farm' THEN
    NEW."centroidLng" := ST_X(ST_PointOnSurface(parsed));
    NEW."centroidLat" := ST_Y(ST_PointOnSurface(parsed));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
