import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createBrandLink, findBrand, listBrandLinks } from "@/lib/db";
import { created, errors, ok } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: { brand_id: string } }
) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();
  const brand = findBrand(params.brand_id);
  if (!brand) return errors.notFound("BRAND_NOT_FOUND", "해당 브랜드를 찾을 수 없습니다.");
  if (brand.user_id !== user.user_id) return errors.forbidden();
  const items = listBrandLinks(brand.brand_id);
  return ok({
    items,
    pagination: { page: 1, limit: items.length, total: items.length, total_pages: 1 },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { brand_id: string } }
) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();
  const brand = findBrand(params.brand_id);
  if (!brand) return errors.notFound("BRAND_NOT_FOUND", "해당 브랜드를 찾을 수 없습니다.");
  if (brand.user_id !== user.user_id) return errors.forbidden();

  const body = (await req.json()) as { link_type?: string; url?: string };
  if (!body.link_type || !body.url) {
    return errors.validation("link_type, url은 필수입니다.");
  }
  const link = createBrandLink({
    brand_id: brand.brand_id,
    link_type: body.link_type as any,
    url: body.url,
  });
  return created(link);
}
