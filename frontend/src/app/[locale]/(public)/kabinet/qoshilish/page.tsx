import { AcceptInvite } from "@/features/cabinet/components/accept-invite";

/**
 * Taklif havolasi: `/kabinet/qoshilish#<token>`. Token fragmentda — serverga kelmaydi, shuning
 * uchun kirish tekshiruvi ham brauzerda (proxy.ts bu sahifani yo'naltirmaydi).
 */
export default function AcceptInvitePage() {
  return <AcceptInvite />;
}
