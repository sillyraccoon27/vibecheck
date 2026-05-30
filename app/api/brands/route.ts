import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createBrand, listBrandsByUser, findLatestRunForBrand } from "@/lib/db";
import { created, errors, ok } from "@/lib/api-response";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();
  const brands = listBrandsByUser(user.user_id);
  const items = brands.map((b) => {
    const run = findLatestRunForBrand(b.brand_id);
    return {
      ...b,
      latest_run: run
        ? {
            run_id: run.run_id,
            status: run.status,
            total_score: run.total_score,
            completed_at: run.completed_at,
          }
        : null,
    };
  });
  return ok({
    items,
    pagination: { page: 1, limit: items.length, total: items.length, total_pages: 1 },
  });
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user) return errors.unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return errors.validation("JSON 본문이 필요합니다.");
  }
  const brand_name = body.brand_name?.trim();
  const category = body.category?.trim();
  const region = body.region?.trim();
  if (!brand_name || !category || !region) {
    return errors.validation("brand_name, category, region은 필수입니다.");
  }

  const brand = createBrand({
    user_id: user.user_id,
    brand_name,
    category,
    region,
    description: body.description ?? "",
    desired_image: body.desired_image ?? "",
    target_customer: body.target_customer ?? "",
  });

  return created(brand);
}
