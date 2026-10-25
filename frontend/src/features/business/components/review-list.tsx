import { getLocale, getTranslations } from "next-intl/server";
import type { Review } from "@/lib/api/types";
import { RatingStars } from "./rating";

/** Sana faqat serverda formatlanadi — hydration farqi bo'lmaydi */
function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  }).format(new Date(iso));
}

export async function ReviewList({ reviews }: { reviews: Review[] }) {
  const locale = await getLocale();
  const t = await getTranslations("BusinessPage");

  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("reviewsEmpty")}</p>;
  }

  return (
    <ul className="divide-y">
      {reviews.map((review) => (
        <li key={review.id} className="py-4 first:pt-0">
          <article className="space-y-2">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{review.authorName}</span>
              <time dateTime={review.createdAt} className="text-sm text-muted-foreground">
                {formatDate(review.createdAt, locale)}
              </time>
            </header>
            <RatingStars value={review.rating} size="sm" />
            {review.text && <p className="text-sm">{review.text}</p>}
            {review.reply && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="mb-1 font-medium">{t("businessReply")}</p>
                <p>{review.reply.text}</p>
              </div>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
