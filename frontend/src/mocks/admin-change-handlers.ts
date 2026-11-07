import { http, HttpResponse } from "msw";
import type {
  AdminChange,
  AdminChangeListItem,
  AdminPhoto,
  BusinessOwners,
  ChangeField,
} from "@/lib/api/types";
import {
  API,
  audit,
  authorize,
  error,
  invalid,
  paginate,
  readJson,
  revalidate,
  slugify,
  text,
  type Fields,
} from "./admin-common";
import { applyProfileFields, uniqueSlug } from "./admin-handlers";
import {
  closeChange,
  IMPORTANT,
  itemValues,
  MAX_OWNERS,
  pendingOf,
  photoRefs,
  same,
  tagSuggestions,
} from "./cabinet-handlers";
import {
  DELETED_USER_ID,
  demoState,
  findBusinessRecord,
  itemsOf,
  photosOf,
  type DemoBusinessRecord,
  type StoredChange,
} from "./demo-state";
import type { DemoItem } from "./fixtures/items";

/**
 * Admin: biznes egalari va egalar takliflarini ko'rib chiqish (ADR-0015) — backend
 * `apps/cabinet/admin_views.py` va `services.py` (solishtiruv, tasdiqlash) bilan bir xil.
 */

const STATUSES = new Set(["pending", "approved", "rejected", "withdrawn", "superseded"]);
const UUID = /^[0-9a-f-]{36}$/i;
const NO_AUTHOR = "00000000-0000-0000-0000-000000000000";

type PhotoRef = { photoId?: string; uploadId?: string; alt?: string | null };
type PhotoView = { url: string | null; alt: string | null; new: boolean };

function findChange(id: string): StoredChange | undefined {
  return demoState.changes.find((c) => c.id === id);
}

function photoView(refs: PhotoRef[], existing: AdminPhoto[], change: StoredChange): PhotoView[] {
  return refs.map((ref) =>
    ref.photoId
      ? {
          url: existing.find((p) => p.id === ref.photoId)?.url ?? null,
          alt: ref.alt ?? null,
          new: false,
        }
      : {
          url: `/api/v1/admin/changes/${change.id}/uploads/${ref.uploadId}`,
          alt: ref.alt ?? null,
          new: true,
        },
  );
}

function field(
  name: string,
  before: unknown,
  current: unknown,
  after: unknown,
  important = false,
): ChangeField {
  return { field: name, important, conflict: !same(before, current), before, current, after };
}

function targetItem(change: StoredChange, record: DemoBusinessRecord): DemoItem | undefined {
  return change.itemId ? itemsOf(record).find((i) => i.id === change.itemId) : undefined;
}

/** "Oldin / hozir / taklif" — backend `change_fields` */
function changeFields(change: StoredChange, record: DemoBusinessRecord): ChangeField[] {
  if (change.kind === "profile") {
    return change.fields.map((key) =>
      field(
        key,
        change.before[key],
        record[key as keyof DemoBusinessRecord],
        change.payload[key],
        IMPORTANT.has(key),
      ),
    );
  }
  if (change.kind === "photos") {
    const current = photosOf(record.id);
    const before = (change.before.photos ?? []) as PhotoRef[];
    const after = (change.payload.photos ?? []) as PhotoRef[];
    const entry = field("photos", before, photoRefs(current), after);
    return [
      {
        ...entry,
        before: photoView(before, current, change),
        current: photoView(photoRefs(current), current, change),
        after: photoView(after, current, change),
      },
    ];
  }

  const item = targetItem(change, record);
  const currentItem = item ? itemValues(item, record) : null;
  const beforeItem = (change.before.item ?? null) as Record<string, unknown> | null;
  if (change.kind === "item.delete") return [field("item", beforeItem, currentItem, null)];

  const afterItem = itemValues(change.payload.item as DemoItem, record);
  return change.fields.map((name) => {
    if (name === "photos") {
      const existing = item?.photos ?? [];
      const before = (change.before.photos ?? []) as PhotoRef[];
      const after = (change.payload.photos ?? []) as PhotoRef[];
      const update = change.kind === "item.update";
      const entry = field(
        "photos",
        update ? before : null,
        update ? photoRefs(existing) : null,
        after,
      );
      return {
        ...entry,
        before: update ? photoView(before, existing, change) : null,
        current: update ? photoView(photoRefs(existing), existing, change) : null,
        after: photoView(after, existing, change),
      };
    }
    const key = name.replace(/^item\./, "");
    if (change.kind === "item.create") return field(name, null, null, afterItem[key]);
    return field(name, beforeItem?.[key], currentItem?.[key] ?? null, afterItem[key]);
  });
}

function hasConflict(change: StoredChange, record: DemoBusinessRecord): boolean {
  return change.status === "pending" && changeFields(change, record).some((f) => f.conflict);
}

function listPayload(change: StoredChange, record: DemoBusinessRecord): AdminChangeListItem {
  const author = demoState.users.get(change.authorId);
  const payloadItem = change.payload.item as { name?: string } | undefined;
  const beforeItem = change.before.item as { name?: string } | undefined;
  return {
    id: change.id,
    kind: change.kind,
    status: change.status,
    business: { id: record.id, slug: record.slug, name: record.name },
    author: {
      id: author && change.authorId !== DELETED_USER_ID ? author.id : NO_AUTHOR,
      displayName: author ? author.displayName : "Oʻchirilgan foydalanuvchi",
    },
    itemName: payloadItem?.name ?? targetItem(change, record)?.name ?? beforeItem?.name ?? null,
    important: change.important,
    conflict: hasConflict(change, record),
    createdAt: change.createdAt,
  };
}

function detailPayload(change: StoredChange, record: DemoBusinessRecord): AdminChange {
  return {
    ...listPayload(change, record),
    fields: changeFields(change, record),
    reviewedAt: change.reviewedAt,
    reviewedBy: change.reviewedBy,
    rejectionReason: change.rejectionReason,
  };
}

/** Yakuniy rasm ro'yxati: mavjudlari saqlanadi, yangilari ochiq media'ga ko'chadi, qolgani o'chadi */
function syncPhotos(refs: PhotoRef[], existing: AdminPhoto[]): AdminPhoto[] {
  const result: AdminPhoto[] = [];
  for (const ref of refs) {
    if (ref.photoId) {
      const photo = existing.find((p) => p.id === ref.photoId);
      if (photo) result.push({ ...photo, alt: ref.alt ?? null });
      continue;
    }
    const upload = ref.uploadId ? demoState.uploads.get(ref.uploadId) : undefined;
    if (!upload) continue;
    const id = crypto.randomUUID();
    demoState.media.set(id, { contentType: upload.contentType, bytes: upload.bytes });
    demoState.uploads.delete(upload.id);
    result.push({
      id,
      url: `/api/v1/media/${id}`,
      width: upload.width,
      height: upload.height,
      alt: ref.alt ?? null,
    });
  }
  for (const photo of existing) {
    if (!result.some((p) => p.id === photo.id)) demoState.media.delete(photo.id);
  }
  return result;
}

/** Tasdiqlash: o'zgarish joriy maʼlumot ustiga yoziladi; xato — javob */
function applyChange(change: StoredChange, record: DemoBusinessRecord): Response | null {
  const payload = change.payload;
  if (change.kind === "profile") {
    const fields: Fields = {};
    const next = applyProfileFields(record, payload, fields);
    if (Object.keys(fields).length > 0) return invalid(fields);
    if (next.name !== record.name && !record.publishedAt)
      next.slug = uniqueSlug(slugify(next.name), record.id);
    Object.assign(record, next);
  } else if (change.kind === "photos") {
    demoState.photos.set(
      record.id,
      syncPhotos((payload.photos ?? []) as PhotoRef[], photosOf(record.id)),
    );
  } else if (change.kind === "item.create") {
    const items = itemsOf(record);
    const parsed = payload.item as Omit<DemoItem, "id" | "slug" | "photos">;
    let slug = slugify(parsed.name);
    for (let n = 2; items.some((i) => i.slug === slug); n++) slug = `${slugify(parsed.name)}-${n}`;
    const item: DemoItem = {
      ...parsed,
      id: crypto.randomUUID(),
      slug,
      photos: syncPhotos((payload.photos ?? []) as PhotoRef[], []),
    };
    demoState.items.set(record.id, [...items, item]);
    change.itemId = item.id;
  } else {
    const item = targetItem(change, record);
    if (!item) return error(409, "target_missing", "Mahsulot oʻchirilgan — taklifni rad eting");
    if (change.kind === "item.delete") {
      for (const photo of item.photos) demoState.media.delete(photo.id);
      demoState.items.set(
        record.id,
        itemsOf(record).filter((i) => i.id !== item.id),
      );
      change.itemId = null;
    } else {
      Object.assign(item, payload.item, {
        photos: syncPhotos((payload.photos ?? []) as PhotoRef[], item.photos),
      });
    }
  }
  record.updatedAt = new Date().toISOString();
  return null;
}

export const adminChangeHandlers = [
  http.get(
    `${API}/admin/businesses/:businessId/tag-suggestions`,
    ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.view");
      if ("response" in auth) return auth.response;
      const record = findBusinessRecord(String(params.businessId));
      if (!record) return error(404, "not_found", "Topilmadi");
      return HttpResponse.json({ tags: tagSuggestions(record) });
    },
  ),

  // --- Egalar ---
  http.get(`${API}/admin/businesses/:businessId/owners`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.view");
    if ("response" in auth) return auth.response;
    const record = findBusinessRecord(String(params.businessId));
    if (!record) return error(404, "not_found", "Topilmadi");
    const invite = demoState.ownerInvites.find(
      (i) => i.businessId === record.id && Date.parse(i.expiresAt) > Date.now(),
    );
    const body: BusinessOwners = {
      owners: demoState.memberships
        .filter((m) => m.businessId === record.id)
        .flatMap((m) => {
          const user = demoState.users.get(m.userId);
          return user
            ? [
                {
                  membershipId: m.id,
                  user: { id: user.id, displayName: user.displayName },
                  provider: user.provider,
                  since: m.createdAt,
                  invitedBy: m.invitedBy,
                },
              ]
            : [];
        }),
      invite: invite
        ? { createdAt: invite.createdAt, expiresAt: invite.expiresAt, createdBy: invite.createdBy }
        : null,
      maxOwners: MAX_OWNERS,
    };
    return HttpResponse.json(body);
  }),

  http.delete(
    `${API}/admin/businesses/:businessId/owners/:membershipId`,
    ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.owners");
      if ("response" in auth) return auth.response;
      const record = findBusinessRecord(String(params.businessId));
      const membership = demoState.memberships.find(
        (m) => m.id === String(params.membershipId) && m.businessId === record?.id,
      );
      if (!record || !membership) return error(404, "not_found", "Topilmadi");
      for (const change of pendingOf(record.id)) {
        if (change.authorId === membership.userId) closeChange(change, "withdrawn");
      }
      demoState.memberships = demoState.memberships.filter((m) => m !== membership);
      audit(
        auth.admin,
        "owner.remove",
        "membership",
        membership.id,
        `${record.name}: egalik bekor qilindi`,
      );
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // --- Takliflar ---
  http.get(`${API}/admin/changes`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "change.review");
    if ("response" in auth) return auth.response;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const businessId = url.searchParams.get("businessId");
    if (status !== null && !STATUSES.has(status)) return invalid({ status: ["Holat notoʻgʻri"] });
    if (businessId !== null && !UUID.test(businessId))
      return invalid({ businessId: ["ID notoʻgʻri"] });
    // Navbat — eng eskisi birinchi; tarix — eng yangisi birinchi
    const changes = demoState.changes
      .filter(
        (c) =>
          (status === null || c.status === status) && (!businessId || c.businessId === businessId),
      )
      .sort((a, b) =>
        status === "pending"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
      );
    const page = paginate(request, changes);
    return HttpResponse.json({
      ...page,
      items: page.items.flatMap((change) => {
        const record = findBusinessRecord(change.businessId);
        return record ? [listPayload(change, record)] : [];
      }),
    });
  }),

  http.get(`${API}/admin/changes/:changeId`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "change.review");
    if ("response" in auth) return auth.response;
    const change = findChange(String(params.changeId));
    const record = change ? findBusinessRecord(change.businessId) : undefined;
    if (!change || !record) return error(404, "not_found", "Topilmadi");
    return HttpResponse.json(detailPayload(change, record));
  }),

  http.post(`${API}/admin/changes/:changeId/approve`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "change.review");
    if ("response" in auth) return auth.response;
    const change = findChange(String(params.changeId));
    const record = change ? findBusinessRecord(change.businessId) : undefined;
    if (!change || !record) return error(404, "not_found", "Topilmadi");
    if (change.status !== "pending")
      return error(409, "not_pending", "Taklif allaqachon koʻrib chiqilgan");
    const oldSlug = record.slug;
    const failure = applyChange(change, record);
    if (failure) return failure;
    change.status = "approved";
    change.reviewedAt = new Date().toISOString();
    change.reviewedBy = auth.admin.displayName;
    audit(
      auth.admin,
      "change.approve",
      "change",
      change.id,
      `${record.name}: ${change.kind} — egasi taklifi tasdiqlandi`,
    );
    const headers = revalidate(
      new Headers(),
      "businesses",
      "categories",
      `business:${record.slug}`,
      ...(oldSlug !== record.slug ? [`business:${oldSlug}`] : []),
    );
    return HttpResponse.json(detailPayload(change, record), { headers });
  }),

  http.post(`${API}/admin/changes/:changeId/reject`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "change.review");
    if ("response" in auth) return auth.response;
    const change = findChange(String(params.changeId));
    const record = change ? findBusinessRecord(change.businessId) : undefined;
    if (!change || !record) return error(404, "not_found", "Topilmadi");
    const reason = text((await readJson(request))?.reason);
    if (reason.length < 3 || reason.length > 200)
      return invalid({ reason: ["Sababini yozing (3–200 belgi)"] });
    if (change.status !== "pending")
      return error(409, "not_pending", "Taklif allaqachon koʻrib chiqilgan");
    closeChange(change, "rejected");
    change.reviewedAt = new Date().toISOString();
    change.reviewedBy = auth.admin.displayName;
    change.rejectionReason = reason;
    audit(
      auth.admin,
      "change.reject",
      "change",
      change.id,
      `${record.name}: ${change.kind} — rad etildi`,
    );
    return HttpResponse.json(detailPayload(change, record));
  }),

  http.get(`${API}/admin/changes/:changeId/uploads/:uploadId`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "change.review");
    if ("response" in auth) return auth.response;
    const upload = demoState.uploads.get(String(params.uploadId));
    if (!upload || upload.changeId !== String(params.changeId))
      return error(404, "not_found", "Topilmadi");
    return new HttpResponse(upload.bytes, {
      headers: {
        "Content-Type": upload.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }),
];
