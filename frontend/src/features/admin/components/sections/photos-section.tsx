"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { browserApi, call } from "@/lib/api/browser";
import { useRefreshBusiness } from "../../use-admin-business";
import { PhotoManager } from "../photo-manager";
import type { SectionProps } from "./section-props";

const MAX_PHOTOS = 12;

/** Biznes rasmlari (birinchisi — muqova) */
export function PhotosSection({ business, canEdit, submitLabel, onDone }: SectionProps) {
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
