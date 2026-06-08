import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteBrand,
  findBrand,
  findLatestRunForBrand,
  listBrandLinks,
  listCompetitors,
} from "@/lib/db";
import { errors, noContent, ok } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: { brand_id: string } }
) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();

  const brand = await findBrand(params.brand_id);
  if (!brand) return errors.notFound("BRAND_NOT_FOUND", "해당 브랜드를 찾을 수 없습니다.");
  if (brand.user_id !== user.user_id) return errors.forbidden();

  const [latest, links, competitors] = await Promise.all([
    findLatestRunForBrand(brand.brand_id),
    listBrandLinks(brand.brand_id),
    listCompetitors(brand.brand_id),
  ]);
  return ok({
    ...brand,
    links,
    competitors,
    latest_run: latest
      ? {
          run_id: latest.run_id,
          status: latest.status,
          total_score: latest.total_score,
          completed_at: latest.completed_at,
        }
      : null,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { brand_id: string } }
) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();
  const brand = await findBrand(params.brand_id);
  if (!brand) return errors.notFound("BRAND_NOT_FOUND", "해당 브랜드를 찾을 수 없습니다.");
  if (brand.user_id !== user.user_id) return errors.forbidden();
  await deleteBrand(brand.brand_id);
  return noContent();
}
