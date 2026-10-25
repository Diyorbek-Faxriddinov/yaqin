"use client";

import { useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/features/map/components/lazy-map";
import { TASHKENT_CENTER } from "@/features/map/config";
import type { GeoPoint } from "@/lib/geo";
import { useCatalogOptions, useUpdateBusiness } from "../../use-admin-business";
import type { SectionProps } from "./section-props";

export function LocationSection({ business, canEdit, submitLabel, onDone }: SectionProps) {
  const t = useTranslations("Admin");
  const { districts } = useCatalogOptions();
  const update = useUpdateBusiness(business.id);
  const [location, setLocation] = useState<GeoPoint | null>(business.location);
  const [address, setAddress] = useState(business.address.text);
  const [landmark, setLandmark] = useState(business.address.landmark ?? "");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const districtCenter = districts.find((d) => d.slug === business.district.slug)?.center;

  // Do'konda turib: telefon GPS'i (yuqori aniqlik)
  const locateWithGps = () => {
    if (!("geolocation" in navigator)) {
      toast.error(t("location.gpsUnavailable"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setAccuracy(Math.round(position.coords.accuracy));
        setLocation({
          lat: Math.round(position.coords.latitude * 1e6) / 1e6,
          lng: Math.round(position.coords.longitude * 1e6) / 1e6,
        });
      },
      (error) => {
        setLocating(false);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? t("location.gpsDenied")
            : t("location.gpsUnavailable"),
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  const save = () => {
    if (address.trim().length > 300) {
      setAddressError(t("validation.tooLong"));
      return;
    }
    setAddressError(null);
    update.mutate(
      { location, address: { text: address.trim(), landmark: landmark.trim() || null } },
      { onSuccess: onDone, onError: () => toast.error(t("edit.saveError")) },
    );
  };

  return (
    <div className="space-y-5">
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={locateWithGps}
            disabled={locating || !canEdit}
          >
            {locating ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <LocateFixed aria-hidden="true" />
            )}
            {locating ? t("location.gpsLocating") : t("location.gps")}
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-4 text-primary" />
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                {accuracy != null && ` · ${t("location.gpsAccuracy", { meters: accuracy })}`}
              </span>
            ) : (
              t("location.notSet")
            )}
          </p>
        </div>

        <LocationPicker
          value={location}
          fallbackCenter={districtCenter ?? TASHKENT_CENTER}
          onChange={(point) => {
            setAccuracy(null);
            setLocation(point);
          }}
          disabled={!canEdit}
          label={t("location.mapLabel")}
          className="h-72"
        />
        <p className="text-sm text-muted-foreground">{t("location.mapHint")}</p>

        <div className="grid gap-2">
          <Label htmlFor="business-address">{t("location.address")}</Label>
          <Input
            id="business-address"
            autoComplete="street-address"
            placeholder={t("location.addressPlaceholder")}
            value={address}
            maxLength={300}
            aria-invalid={Boolean(addressError)}
            aria-describedby={addressError ? "business-address-error" : undefined}
            onChange={(e) => setAddress(e.target.value)}
          />
          {addressError && (
            <p id="business-address-error" className="text-sm text-destructive">
              {addressError}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="business-landmark">{t("location.landmark")}</Label>
          <Input
            id="business-landmark"
            placeholder={t("location.landmarkPlaceholder")}
            value={landmark}
            maxLength={200}
            onChange={(e) => setLandmark(e.target.value)}
          />
        </div>
      </fieldset>

      {canEdit && (
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={save}
          disabled={update.isPending}
        >
          {update.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
