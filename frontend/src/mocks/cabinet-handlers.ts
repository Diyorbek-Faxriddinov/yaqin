import { http, HttpResponse } from "msw";
import type {
  AdminPhoto,
  ChangeKind,
  OwnedBusiness,
  OwnerBusiness,
  OwnerChange,
  PendingUpload,
} from "@/lib/api/types";
import {
  API,
  audit,
  authorize,
  districtRef,
  error,
  invalid,
  langOf,
  randomToken,
  readJson,
  type Fields,
  type Lang,
} from "./admin-common";
import { applyProfileFields, categoryRef, parseItem, toAdminItem } from "./admin-handlers";
import {
  demoState,
  findBusinessRecord,
  itemsOf,
  photosOf,
  type DemoBusinessRecord,
  type StoredChange,
  type StoredMembership,
} from "./demo-state";
import { authenticate } from "./me-handlers";
import { statsSeries, parseDays } from "./stats";

/**
 * Biznes egasi kabineti (ADR-0015) — demo handler'lari, backend `apps/cabinet` qoidalari bilan:
 * egalik taklif havolasi orqali, o'zgarishlar taklif sifatida (moderator tasdiqlaydi), taklif
 * rasmlari ommaviy media'ga tushmaydi.
 * ⚠ Demo: yuklangan rasm o'lchami o'lchanmaydi (namunaviy 1200×900), xotirada saqlanadi.
 */

const MAX_OWNERS = 3;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PENDING_CHANGES = 20;
const MAX_PENDING_UPLOADS = 40;
const MAX_PHOTOS = 12;
const MAX_ITEM_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

const PROFILE_FIELDS = [
  "name",
  "description",
  "categorySlug",
  "districtSlug",
  "address",
  "location",
  "phones",
  "telegram",
  "instagram",
  "website",
  "amenities",
  "schedule",
] as const;
const IMPORTANT = new Set(["name", "categorySlug", "districtSlug", "address", "location"]);
const ITEM_FIELDS = [
  "kind",
  "name",
  "group",
  "description",
  "price",
  "durationMinutes",
  "attributes",
  "isAvailable",
] as const;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Kalitlar tartibidan qat'i nazar solishtirish */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}
const same = (a: unknown, b: unknown) => stable(a) === stable(b);

function membershipOf(userId: string, businessId: string): StoredMembership | undefined {
  return demoState.memberships.find((m) => m.userId === userId && m.businessId === businessId);
}

/** Egasi bo'lmagan biznes — xuddi yo'qdek 404 (backend `owned()`) */
function owned(userId: string, businessId: string): DemoBusinessRecord | null {
  const record = findBusinessRecord(businessId);
  return record && membershipOf(userId, businessId) ? record : null;
}

function pendingOf(businessId: string): StoredChange[] {
  return demoState.changes.filter((c) => c.businessId === businessId && c.status === "pending");
}

function toOwnedBusiness(record: DemoBusinessRecord, userId: string, lang: Lang): OwnedBusiness {
  const cover = photosOf(record.id)[0];
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    status: record.status,
    category: categoryRef(record.categorySlug, lang),
    district: districtRef(record.districtSlug, lang),
    cover: cover
      ? { url: cover.url, width: cover.width, height: cover.height, alt: cover.alt }
      : null,
    pendingChanges: pendingOf(record.id).length,
    ownerSince: membershipOf(userId, record.id)?.createdAt ?? record.createdAt,
  };
}

function toOwnerBusiness(record: DemoBusinessRecord, lang: Lang): OwnerBusiness {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    category: categoryRef(record.categorySlug, lang),
    district: districtRef(record.districtSlug, lang),
    address: record.address,
    location: record.location,
    phones: record.phones,
    telegram: record.telegram,
    instagram: record.instagram,
    website: record.website,
    amenities: record.amenities,
    schedule: record.schedule,
    status: record.status,
    photos: photosOf(record.id),
    items: itemsOf(record).map((item) => toAdminItem(item, record, lang)),
    updatedAt: record.updatedAt,
  };
}

function toOwnerChange(change: StoredChange): OwnerChange {
  return {
    id: change.id,
    kind: change.kind,
    status: change.status,
    itemId: change.itemId,
    fields: change.fields,
    createdAt: change.createdAt,
    reviewedAt: change.reviewedAt,
    rejectionReason: change.rejectionReason,
  };
}

/** Rad etish, qaytarib olish, almashtirish: taklifga bog'liq yangi rasmlar o'chiriladi */
export function closeChange(change: StoredChange, status: StoredChange["status"]) {
  change.status = status;
  for (const [id, upload] of demoState.uploads) {
    if (upload.changeId === change.id) demoState.uploads.delete(id);
  }
}

function photoRefs(photos: AdminPhoto[]) {
  return photos.map((p) => ({ photoId: p.id, alt: p.alt ?? null }));
}

/** PhotoRef ro'yxati: mavjud rasmlar shu nishonniki, yangilari shu biznesga yuklangan va bo'sh */
function parsePhotoRefs(
  raw: unknown,
  existing: AdminPhoto[],
  businessId: string,
  target: string,
  limit: number,
): Array<Record<string, string | null>> | { fields: Fields } {
  if (!Array.isArray(raw) || raw.length > limit)
    return { fields: { photos: [`Koʻpi bilan ${limit} ta rasm`] } };
  const seen = new Set<string>();
  const result: Array<Record<string, string | null>> = [];
  for (const ref of raw as Array<Record<string, unknown>>) {
    const keys = ref && typeof ref === "object" ? Object.keys(ref) : [];
    const hasPhoto = keys.includes("photoId");
    if (hasPhoto === keys.includes("uploadId"))
      return { fields: { photos: ["Rasmlar roʻyxati notoʻgʻri"] } };
    const alt = ref.alt;
    if (alt != null && (typeof alt !== "string" || alt.length > 200))
      return { fields: { photos: ["Tavsif 200 belgigacha"] } };
    const value = String(hasPhoto ? ref.photoId : ref.uploadId);
    if (seen.has(value)) return { fields: { photos: ["Bir rasm ikki marta"] } };
    seen.add(value);
    if (hasPhoto && !existing.some((p) => p.id === value))
      return { fields: { photos: ["Rasm topilmadi — sahifani yangilang"] } };
    if (!hasPhoto) {
      const upload = demoState.uploads.get(value);
      const owner = upload?.changeId
        ? demoState.changes.find((c) => c.id === upload.changeId)
        : undefined;
      const busy = owner !== undefined && !(owner.status === "pending" && owner.target === target);
      const fresh = upload && Date.now() - Date.parse(upload.createdAt) < UPLOAD_TTL_MS;
      if (!upload || upload.businessId !== businessId || !fresh || busy)
        return { fields: { photos: ["Yuklangan rasm topilmadi — qayta yuklang"] } };
    }
    result.push({
      [hasPhoto ? "photoId" : "uploadId"]: value,
      alt: typeof alt === "string" ? alt.trim() || null : null,
    });
  }
  return result;
}

type Draft = Pick<
  StoredChange,
  "target" | "itemId" | "payload" | "before" | "fields" | "important"
>;

/** Taklif maydonlari (saqlanmagan) yoki xatolar — backend `services._draft` */
function draftChange(
  kind: ChangeKind,
  body: Record<string, unknown>,
  record: DemoBusinessRecord,
): Draft | { fields: Fields } {
  if (kind === "profile") {
    const profile = body.profile as Record<string, unknown> | undefined;
    const keys = profile && typeof profile === "object" ? Object.keys(profile) : [];
    if (
      keys.length === 0 ||
      !keys.every((k) => (PROFILE_FIELDS as readonly string[]).includes(k))
    ) {
      return { fields: { profile: ["Oʻzgartirish mumkin boʻlgan maydonlarni yuboring"] } };
    }
    const fields: Fields = {};
    const next = applyProfileFields(record, profile ?? {}, fields);
    if (Object.keys(fields).length > 0) return { fields };
    const changed = PROFILE_FIELDS.filter((k) => keys.includes(k) && !same(next[k], record[k]));
    return {
      target: "profile",
      itemId: null,
      payload: Object.fromEntries(changed.map((k) => [k, next[k]])),
      before: Object.fromEntries(changed.map((k) => [k, record[k]])),
      fields: changed,
      important: changed.some((k) => IMPORTANT.has(k)),
    };
  }

  if (kind === "item.create" || kind === "item.update" || kind === "item.delete") {
    const existing =
      kind === "item.create"
        ? undefined
        : itemsOf(record).find((item) => item.id === String(body.itemId));
    if (kind !== "item.create" && !existing)
      return { fields: { itemId: ["Mahsulot topilmadi — sahifani yangilang"] } };
    if (kind === "item.delete" && existing) {
      return {
        target: `item:${existing.id}`,
        itemId: existing.id,
        payload: {},
        before: { item: existing, photos: photoRefs(existing.photos) },
        fields: ["item"],
        important: false,
      };
    }
    if (!body.item || typeof body.item !== "object")
      return { fields: { item: ["Mahsulot maʼlumotlari kerak"] } };
    const parsed = parseItem(body.item as Record<string, unknown>, record);
    if ("fields" in parsed) return parsed;
    const target = existing ? `item:${existing.id}` : `new:${crypto.randomUUID()}`;
    const refs = parsePhotoRefs(
      body.photos,
      existing?.photos ?? [],
      record.id,
      target,
      MAX_ITEM_PHOTOS,
    );
    if ("fields" in refs) return refs;
    const fields = existing
      ? ITEM_FIELDS.filter((k) => !same(parsed.item[k], existing[k])).map((k) => `item.${k}`)
      : [...ITEM_FIELDS.map((k) => `item.${k}`), ...(refs.length ? ["photos"] : [])];
    if (existing && !same(refs, photoRefs(existing.photos))) fields.push("photos");
    return {
      target,
      itemId: existing?.id ?? null,
      payload: { item: parsed.item, photos: refs },
      before: existing ? { item: existing, photos: photoRefs(existing.photos) } : {},
      fields,
      important: false,
    };
  }

  if (kind === "photos") {
    const current = photosOf(record.id);
    const refs = parsePhotoRefs(body.photos, current, record.id, "photos", MAX_PHOTOS);
    if ("fields" in refs) return refs;
    return {
      target: "photos",
      itemId: null,
      payload: { photos: refs },
      before: { photos: photoRefs(current) },
      fields: same(refs, photoRefs(current)) ? [] : ["photos"],
      important: false,
    };
  }

  return { fields: { kind: ["Taklif turi notoʻgʻri"] } };
}

const KINDS = new Set<string>(["profile", "item.create", "item.update", "item.delete", "photos"]);

export const cabinetHandlers = [
  // --- Admin: egalik taklif havolasi (havola faqat shu javobda) ---
  http.post(
    `${API}/admin/businesses/:businessId/owner-invite`,
    async ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.owners");
      if ("response" in auth) return auth.response;
      const record = findBusinessRecord(String(params.businessId));
      if (!record) return error(404, "not_found", "Topilmadi");
      if (demoState.memberships.filter((m) => m.businessId === record.id).length >= MAX_OWNERS)
        return error(409, "owner_limit", `Biznesda koʻpi bilan ${MAX_OWNERS} ta ega`);
      const token = randomToken(43);
      const now = new Date();
      const invite = {
        businessId: record.id,
        tokenHash: await sha256(token),
        createdBy: auth.admin.displayName,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS).toISOString(),
      };
      demoState.ownerInvites = [
        ...demoState.ownerInvites.filter((i) => i.businessId !== record.id),
        invite,
      ];
      audit(auth.admin, "owner.invite", "business", record.id, "Egalik taklif havolasi yaratildi");
      const origin = new URL(request.url).origin;
      return HttpResponse.json(
        {
          url: `${origin}/kabinet/qoshilish#${token}`,
          status: {
            createdAt: invite.createdAt,
            expiresAt: invite.expiresAt,
            createdBy: invite.createdBy,
          },
        },
        { status: 201 },
      );
    },
  ),

  http.delete(
    `${API}/admin/businesses/:businessId/owner-invite`,
    ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.owners");
      if ("response" in auth) return auth.response;
      const businessId = String(params.businessId);
      if (!findBusinessRecord(businessId)) return error(404, "not_found", "Topilmadi");
      demoState.ownerInvites = demoState.ownerInvites.filter((i) => i.businessId !== businessId);
      audit(
        auth.admin,
        "owner.invite.revoke",
        "business",
        businessId,
        "Taklif havolasi bekor qilindi",
      );
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // --- Kabinet ---
  http.post(`${API}/cabinet/invites/accept`, async ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const body = await readJson(request);
    const token = typeof body?.token === "string" ? body.token : "";
    if (!TOKEN.test(token)) return invalid({ token: ["Havola notoʻgʻri"] });
    const hash = await sha256(token);
    const invite = demoState.ownerInvites.find(
      (i) => i.tokenHash === hash && Date.parse(i.expiresAt) > Date.now(),
    );
    const record = invite ? findBusinessRecord(invite.businessId) : undefined;
    if (!invite || !record) return error(404, "not_found", "Havola topilmadi yoki eskirgan");
    const { userId } = auth.session;
    // Takroriy bosish xato emas, taklif sarflanmaydi
    if (membershipOf(userId, record.id))
      return HttpResponse.json(toOwnedBusiness(record, userId, langOf(request)));
    if (demoState.memberships.filter((m) => m.businessId === record.id).length >= MAX_OWNERS)
      return error(409, "owner_limit", `Biznesda koʻpi bilan ${MAX_OWNERS} ta ega`);
    demoState.memberships.push({
      id: crypto.randomUUID(),
      userId,
      businessId: record.id,
      invitedBy: invite.createdBy,
      createdAt: new Date().toISOString(),
    });
    demoState.ownerInvites = demoState.ownerInvites.filter((i) => i !== invite);
    return HttpResponse.json(toOwnedBusiness(record, userId, langOf(request)));
  }),

  http.get(`${API}/cabinet/businesses`, ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const { userId } = auth.session;
    const lang = langOf(request);
    return HttpResponse.json(
      demoState.memberships
        .filter((m) => m.userId === userId)
        .flatMap((m) => {
          const record = findBusinessRecord(m.businessId);
          return record ? [toOwnedBusiness(record, userId, lang)] : [];
        }),
    );
  }),

  http.get(`${API}/cabinet/businesses/:businessId`, ({ request, cookies, params }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const record = owned(auth.session.userId, String(params.businessId));
    if (!record) return error(404, "not_found", "Topilmadi");
    return HttpResponse.json(toOwnerBusiness(record, langOf(request)));
  }),

  http.delete(
    `${API}/cabinet/businesses/:businessId/membership`,
    ({ request, cookies, params }) => {
      const auth = authenticate(request, cookies);
      if ("response" in auth) return auth.response;
      const { userId } = auth.session;
      const record = owned(userId, String(params.businessId));
      if (!record) return error(404, "not_found", "Topilmadi");
      demoState.memberships = demoState.memberships.filter(
        (m) => !(m.userId === userId && m.businessId === record.id),
      );
      for (const change of pendingOf(record.id)) {
        if (change.authorId === userId) closeChange(change, "withdrawn");
      }
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.get(`${API}/cabinet/businesses/:businessId/stats`, ({ request, cookies, params }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const record = owned(auth.session.userId, String(params.businessId));
    if (!record) return error(404, "not_found", "Topilmadi");
    return HttpResponse.json(statsSeries([record], parseDays(request)));
  }),

  http.post(
    `${API}/cabinet/businesses/:businessId/uploads`,
    async ({ request, cookies, params }) => {
      const auth = authenticate(request, cookies);
      if ("response" in auth) return auth.response;
      const record = owned(auth.session.userId, String(params.businessId));
      if (!record) return error(404, "not_found", "Topilmadi");
      let file: FormDataEntryValue | null = null;
      try {
        file = (await request.formData()).get("file");
      } catch {
        // pastda
      }
      if (!(file instanceof Blob)) return invalid({ file: ["Rasm tanlang"] });
      if (!PHOTO_TYPES.has(file.type)) return invalid({ file: ["Fayl turi notoʻgʻri"] });
      if (file.size > MAX_PHOTO_BYTES) return error(413, "file_too_large", "Fayl 5 MB dan katta");
      const waiting = [...demoState.uploads.values()].filter((u) => {
        if (u.businessId !== record.id || Date.now() - Date.parse(u.createdAt) >= UPLOAD_TTL_MS)
          return false;
        const change = u.changeId ? demoState.changes.find((c) => c.id === u.changeId) : undefined;
        return !change || change.status === "pending";
      });
      if (waiting.length >= MAX_PENDING_UPLOADS)
        return error(
          409,
          "too_many_uploads",
          `Tasdiqlanmagan rasmlar koʻp (${MAX_PENDING_UPLOADS})`,
        );
      const id = crypto.randomUUID();
      const createdAt = new Date();
      demoState.uploads.set(id, {
        id,
        businessId: record.id,
        userId: auth.session.userId,
        changeId: null,
        contentType: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
        width: 1200,
        height: 900,
        createdAt: createdAt.toISOString(),
      });
      const upload: PendingUpload = {
        id,
        previewUrl: `/api/v1/cabinet/businesses/${record.id}/uploads/${id}`,
        width: 1200,
        height: 900,
        expiresAt: new Date(createdAt.getTime() + UPLOAD_TTL_MS).toISOString(),
      };
      return HttpResponse.json(upload, { status: 201 });
    },
  ),

  http.get(
    `${API}/cabinet/businesses/:businessId/uploads/:uploadId`,
    ({ request, cookies, params }) => {
      const auth = authenticate(request, cookies);
      if ("response" in auth) return auth.response;
      const record = owned(auth.session.userId, String(params.businessId));
      const upload = demoState.uploads.get(String(params.uploadId));
      if (!record || !upload || upload.businessId !== record.id)
        return error(404, "not_found", "Topilmadi");
      return new HttpResponse(upload.bytes, {
        headers: {
          "Content-Type": upload.contentType,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    },
  ),

  http.get(`${API}/cabinet/businesses/:businessId/changes`, ({ request, cookies, params }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const record = owned(auth.session.userId, String(params.businessId));
    if (!record) return error(404, "not_found", "Topilmadi");
    return HttpResponse.json(
      demoState.changes
        .filter((c) => c.businessId === record.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50)
        .map(toOwnerChange),
    );
  }),

  http.post(
    `${API}/cabinet/businesses/:businessId/changes`,
    async ({ request, cookies, params }) => {
      const auth = authenticate(request, cookies);
      if ("response" in auth) return auth.response;
      const record = owned(auth.session.userId, String(params.businessId));
      if (!record) return error(404, "not_found", "Topilmadi");
      const body = (await readJson(request)) ?? {};
      const kind = String(body.kind);
      if (!KINDS.has(kind)) return invalid({ kind: ["Taklif turi notoʻgʻri"] });
      const draft = draftChange(kind as ChangeKind, body, record);
      if (!("target" in draft)) return invalid(draft.fields);
      const result = draft;
      if (result.fields.length === 0)
        return invalid({ non_field_errors: ["Hech narsa oʻzgarmagan"] });

      const pending = pendingOf(record.id);
      const replaced = pending.filter((c) => c.target === result.target);
      if (pending.length - replaced.length >= MAX_PENDING_CHANGES) {
        return error(
          409,
          "too_many_pending",
          `Koʻrib chiqilmagan takliflar koʻp (${MAX_PENDING_CHANGES}) — tasdiqlanishini kuting`,
        );
      }
      const change: StoredChange = {
        id: crypto.randomUUID(),
        businessId: record.id,
        authorId: auth.session.userId,
        kind: kind as ChangeKind,
        status: "pending",
        ...result,
        // Bir millisekundda ikki taklif bo'lsa ham tartib barqaror
        createdAt: new Date(
          Math.max(Date.now(), ...demoState.changes.map((c) => Date.parse(c.createdAt) + 1)),
        ).toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      };
      demoState.changes.push(change);
      const photos = (result.payload.photos ?? []) as Array<Record<string, string | null>>;
      for (const ref of photos) {
        const upload = ref.uploadId ? demoState.uploads.get(ref.uploadId) : undefined;
        if (upload) upload.changeId = change.id;
      }
      for (const old of replaced) closeChange(old, "superseded");
      return HttpResponse.json(toOwnerChange(change), { status: 201 });
    },
  ),

  http.post(
    `${API}/cabinet/businesses/:businessId/changes/:changeId/withdraw`,
    ({ request, cookies, params }) => {
      const auth = authenticate(request, cookies);
      if ("response" in auth) return auth.response;
      const record = owned(auth.session.userId, String(params.businessId));
      const change = demoState.changes.find(
        (c) =>
          c.id === String(params.changeId) &&
          c.businessId === record?.id &&
          c.authorId === auth.session.userId,
      );
      if (!record || !change) return error(404, "not_found", "Topilmadi");
      if (change.status !== "pending")
        return error(409, "not_pending", "Taklif allaqachon koʻrib chiqilgan");
      closeChange(change, "withdrawn");
      return HttpResponse.json(toOwnerChange(change));
    },
  ),
];
