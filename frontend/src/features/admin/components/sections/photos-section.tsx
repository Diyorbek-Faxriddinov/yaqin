"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PhotoDraft } from "@/features/cabinet/components/photo-draft";
import { draftFromPhotos, photosChanged, toPhotoRefs } from "@/features/cabinet/photo-refs";
import { proposeChange, refreshCabinet } from "@/features/cabinet/use-cabinet";
import { browserApi, call } from "@/lib/api/browser";
import { useOwnerMode } from "../../owner-mode";
import { saveErrorKey, useRefreshBusiness } from "../../use-admin-business";
import { PhotoManager } from "../photo-manager";
import type { SectionProps } from "./section-props";

const MAX_PHOTOS = 12;

/** Biznes rasmlari (birinchisi — muqova) */
export function PhotosSection(props: SectionProps) {
  const owner = useOwnerMode();
  return owner ? <OwnerPhotos {...props} /> : <AdminPhotos {...props} />;
}

/** Egasi: butun ro'yxat (tartib, yangi va o'chirilganlar) bitta taklif bo'lib yuboriladi */
function OwnerPhotos({ business, submitLabel, onDone }: SectionProps) {
  const t = useTranslations("Admin");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => draftFromPhotos(business.photos));
  const [uploading, setUploading] = useState(false);
  const submit = useMutation({
    mutationFn: () =>
      proposeChange(business.id, {
        kind: "photos",
        photos: toPhotoRefs(draft, (index) => t("photos.alt", { name: business.name, index })),
      }),
    onSuccess: () => {
      refreshCabinet(queryClient, business.id);
      onDone();
    },
    onError: (error) => toast.error(t(saveErrorKey(error))),
  });
  const changed = photosChanged(draft, business.photos);

  return (
    <div className="space-y-5">
      <PhotoDraft
        inputId="photo-input"
        businessId={business.id}
        photos={draft}
        onChange={setDraft}
        max={MAX_PHOTOS}
        firstLabel={t("photos.cover")}
        limitMessage={t("photos.limit")}
        onUploadingChange={setUploading}
      />
      <p className="text-sm text-muted-foreground">{t("photos.addHint")}</p>
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => submit.mutate()}
        disabled={uploading || submit.isPending || !changed}
      >
        {submit.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}

/** Admin: har bir rasm darhol yuklanadi/o'chiriladi */
function AdminPhotos({ business, canEdit, submitLabel, onDone }: SectionProps) {
  const t = useTranslations("Admin");
  const refresh = useRefreshBusiness(business.id);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-5">
      <PhotoManager
        inputId="photo-input"
        photos={business.photos}
        max={MAX_PHOTOS}
        canEdit={canEdit}
        uploadUrl={`/api/v1/admin/businesses/${business.id}/photos`}
        altFor={(index) => t("photos.alt", { name: business.name, index })}
        firstLabel={t("photos.cover")}
        limitMessage={t("photos.limit")}
        reorder={(photoIds) =>
          call(
            browserApi.PUT("/admin/businesses/{businessId}/photos/order", {
              params: { path: { businessId: business.id } },
              body: { photoIds },
            }),
          )
        }
        remove={(photoId) =>
          call(
            browserApi.DELETE("/admin/businesses/{businessId}/photos/{photoId}", {
              params: { path: { businessId: business.id, photoId } },
            }),
          )
        }
        onChanged={refresh}
        onUploadingChange={setUploading}
      />
      {canEdit && <p className="text-sm text-muted-foreground">{t("photos.addHint")}</p>}

      {canEdit && (
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onDone}
          disabled={uploading}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
