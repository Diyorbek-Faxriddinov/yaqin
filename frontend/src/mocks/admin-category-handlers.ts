import { http, HttpResponse } from "msw";
import type {
  AdminAttribute,
  AdminCategory,
  CategoryIconKey,
  LocalizedText,
} from "@/lib/api/types";
import {
  API,
  audit,
  authorize,
  error,
  invalid,
  readJson,
  revalidate,
  text,
  type Fields,
} from "./admin-common";
import { demoState, findCategory, type DemoCategoryRecord } from "./demo-state";

/**
 * Kategoriyalar va atributlar (ruxsat: category.manage). Ikki daraja: yuqori daraja (ikonka bilan)
 * va ichki kategoriya — biznes faqat ichkisiga biriktiriladi. Slug o'zgarmaydi.
 */

export const CATEGORY_ICON_KEYS = [
  "shopping",
  "food",
  "beauty",
  "home-services",
  "auto",
  "health",
  "education",
  "sport",
  "travel",
  "events",
  "pets",
  "professional",
] as const satisfies readonly CategoryIconKey[];

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ATTRIBUTE_KEY = /^[a-z][a-z0-9_]{1,39}$/;
const OPTION_VALUE = /^[a-z0-9_-]{1,40}$/;
const ATTRIBUTE_TYPES = new Set<AdminAttribute["type"]>([
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
]);

function isIconKey(value: unknown): value is CategoryIconKey {
  return (CATEGORY_ICON_KEYS as readonly unknown[]).includes(value);
}

/** Ikki tildagi matn: har biri min–60 belgi */
function localized(value: unknown, min: number): LocalizedText | null {
  const record = value as Partial<Record<"uz" | "ru", unknown>> | null;
  const uz = text(record?.uz);
  const ru = text(record?.ru);
  return uz.length >= min && uz.length <= 60 && ru.length >= min && ru.length <= 60
    ? { uz, ru }
    : null;
}

/** Kategoriya va barcha ichki kategoriyalaridagi bizneslar (har qanday holatda) */
function businessCount(category: DemoCategoryRecord): number {
  const slugs = new Set([
    category.slug,
    ...demoState.categories.filter((c) => c.parentSlug === category.slug).map((c) => c.slug),
  ]);
  return demoState.businesses.filter((b) => slugs.has(b.categorySlug)).length;
}

function toAdminCategory(category: DemoCategoryRecord): AdminCategory {
  const parent = category.parentSlug ? findCategory(category.parentSlug) : undefined;
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    iconKey: category.iconKey,
    parentId: parent?.id ?? null,
    businessCount: businessCount(category),
    attributes: category.attributes,
  };
}

function findById(id: string) {
  return demoState.categories.find((c) => c.id === id);
}

/** Atributlar ro'yxati — kontraktdagi AdminAttribute qoidalari */
export function parseAttributes(
  value: unknown,
): { attributes: AdminAttribute[] } | { fields: Fields } {
  if (!Array.isArray(value)) return { fields: { attributes: ["Roʻyxat kerak"] } };
  if (value.length > 20) return { fields: { attributes: ["Koʻpi bilan 20 ta"] } };
  const fields: Fields = {};
  const keys = new Set<string>();
  const attributes: AdminAttribute[] = [];

  value.forEach((raw: Record<string, unknown>, index) => {
    const problems: string[] = [];
    const key = text(raw?.key);
    const type = raw?.type as AdminAttribute["type"];
    const name = localized(raw?.name, 1);
    if (!ATTRIBUTE_KEY.test(key)) problems.push("Kalit: lotin harflari, raqam va _ (2–40)");
    else if (keys.has(key)) problems.push("Kalit takrorlangan");
    keys.add(key);
    if (!name) problems.push("Nomi ikkala tilda kerak");
    if (!ATTRIBUTE_TYPES.has(type)) problems.push("Turi notoʻgʻri");

    const unit = type === "number" ? text(raw?.unit).slice(0, 20) || null : null;
    let options: AdminAttribute["options"] = [];
    if (type === "select" || type === "multiselect") {
      const rawOptions = Array.isArray(raw?.options) ? raw.options : [];
      const values = new Set<string>();
      options = rawOptions.flatMap((option: Record<string, unknown>) => {
        const optionValue = text(option?.value);
        const label = localized(option?.label, 1);
        if (!OPTION_VALUE.test(optionValue) || values.has(optionValue) || !label) return [];
        values.add(optionValue);
        return [{ value: optionValue, label }];
      });
      if (options.length !== rawOptions.length) problems.push("Variantlar notoʻgʻri");
      if (options.length < 2 || options.length > 30) problems.push("2–30 ta variant");
    }

    if (problems.length > 0 || !name) {
      fields[`attributes.${index}`] = problems;
      return;
    }
    attributes.push({ key, name, type, unit, options, filterable: raw?.filterable === true });
  });

  return Object.keys(fields).length > 0 ? { fields } : { attributes };
}

export const adminCategoryHandlers = [
  http.get(`${API}/admin/categories`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "category.manage");
    if ("response" in auth) return auth.response;
    return HttpResponse.json(demoState.categories.map(toAdminCategory));
  }),

  http.post(`${API}/admin/categories`, async ({ request, cookies }) => {
    const auth = authorize(request, cookies, "category.manage");
    if ("response" in auth) return auth.response;
    const body = await readJson(request);
    const slug = text(body?.slug);
    const name = localized(body?.name, 2);
    const parentId = typeof body?.parentId === "string" ? body.parentId : null;
    const parent = parentId ? findById(parentId) : undefined;

    const fields: Fields = {};
    if (!SLUG.test(slug) || slug.length < 2 || slug.length > 60)
      fields.slug = ["Lotin harflari, raqamlar va chiziqcha (2–60)"];
    if (!name) fields.name = ["Nomi ikkala tilda, 2–60 belgi"];
    if (parentId && (!parent || parent.parentSlug !== null))
      fields.parentId = ["Ota-kategoriya — yuqori darajadagi kategoriya"];
    if (!parentId && !isIconKey(body?.iconKey)) fields.iconKey = ["Ikonkani tanlang"];
    if (Object.keys(fields).length > 0 || !name) return invalid(fields);
    if (findCategory(slug)) {
      return error(409, "slug_taken", "Bu slug band", { slug: ["Bu slug band"] });
    }

    const category: DemoCategoryRecord = {
      id: crypto.randomUUID(),
      slug,
      name,
      iconKey: parent ? parent.iconKey : (body?.iconKey as CategoryIconKey),
      parentSlug: parent?.slug ?? null,
      attributes: [],
    };
    if (parent) {
      // Ota-kategoriyaning oxirgi bolasidan keyin — ro'yxat tartibi saqlanadi
      const siblings = demoState.categories.filter((c) => c.parentSlug === parent.slug);
      const anchor = siblings.at(-1) ?? parent;
      demoState.categories.splice(demoState.categories.indexOf(anchor) + 1, 0, category);
    } else {
      demoState.categories.push(category);
    }

    audit(auth.admin, "category.create", "category", category.id, `Qoʻshildi: ${name.uz}`);
    const tags = ["categories", ...(parent ? [`category:${parent.slug}`] : [])];
    return HttpResponse.json(toAdminCategory(category), {
      status: 201,
      headers: revalidate(new Headers(), ...tags),
    });
  }),

  http.patch(`${API}/admin/categories/:categoryId`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "category.manage");
    if ("response" in auth) return auth.response;
    const category = findById(String(params.categoryId));
    if (!category) return error(404, "not_found", "Topilmadi");
    const body = (await readJson(request)) ?? {};

    const fields: Fields = {};
    const name = "name" in body ? localized(body.name, 2) : category.name;
    if (!name) fields.name = ["Nomi ikkala tilda, 2–60 belgi"];
    if ("iconKey" in body) {
      if (category.parentSlug !== null)
        fields.iconKey = ["Ikonka yuqori darajadagi kategoriyada belgilanadi"];
      else if (!isIconKey(body.iconKey)) fields.iconKey = ["Ikonkani tanlang"];
    }
    if (Object.keys(fields).length > 0 || !name) return invalid(fields);

    category.name = name;
    if (isIconKey(body.iconKey)) {
      category.iconKey = body.iconKey;
      for (const child of demoState.categories) {
        if (child.parentSlug === category.slug) child.iconKey = body.iconKey;
      }
    }
    audit(auth.admin, "category.update", "category", category.id, `Oʻzgartirildi: ${name.uz}`);
    return HttpResponse.json(toAdminCategory(category), {
      // Kategoriya nomi biznes kartalarida ham ko'rinadi
      headers: revalidate(new Headers(), "categories", `category:${category.slug}`, "businesses"),
    });
  }),

  http.delete(`${API}/admin/categories/:categoryId`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "category.manage");
    if ("response" in auth) return auth.response;
    const category = findById(String(params.categoryId));
    if (!category) return error(404, "not_found", "Topilmadi");
    if (demoState.categories.some((c) => c.parentSlug === category.slug)) {
      return error(409, "has_children", "Avval ichki kategoriyalarni oʻchiring");
    }
    if (businessCount(category) > 0) {
      return error(409, "has_businesses", "Kategoriyada bizneslar bor — avval ularni koʻchiring");
    }
    demoState.categories.splice(demoState.categories.indexOf(category), 1);
    audit(
      auth.admin,
      "category.delete",
      "category",
      category.id,
      `Oʻchirildi: ${category.name.uz}`,
    );
    const tags = [
      "categories",
      `category:${category.slug}`,
      ...(category.parentSlug ? [`category:${category.parentSlug}`] : []),
    ];
    return new HttpResponse(null, { status: 204, headers: revalidate(new Headers(), ...tags) });
  }),

  http.put(
    `${API}/admin/categories/:categoryId/attributes`,
    async ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "category.manage");
      if ("response" in auth) return auth.response;
      const category = findById(String(params.categoryId));
      if (!category) return error(404, "not_found", "Topilmadi");
      if (category.parentSlug === null) {
        return invalid({ attributes: ["Atributlar ichki kategoriyalar uchun"] });
      }
      const parsed = parseAttributes((await readJson(request))?.attributes);
      if ("fields" in parsed) return invalid(parsed.fields);
      category.attributes = parsed.attributes;
      audit(
        auth.admin,
        "category.attributes",
        "category",
        category.id,
        `Atributlar (${parsed.attributes.length}): ${category.name.uz}`,
      );
      return HttpResponse.json(toAdminCategory(category), {
        headers: revalidate(new Headers(), `category:${category.slug}`),
      });
    },
  ),
];
