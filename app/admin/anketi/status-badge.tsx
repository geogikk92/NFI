// АДМИН · значката за състояние на заявка за обаждане.
//
// Отделен файл, защото я ползват ДВА екрана — списъкът и детайлът. Другите
// раздели си държат картата локално (виж app/admin/abonati/page.tsx) и това
// е добре, докато е на едно място. Тук местата станаха две, а карта, преписана
// два пъти, се разминава при първия нов статус.

import { Badge } from "@/components/ui/badge";
import {
  CALL_REQUEST_STATUS_LABELS,
  type CallRequestStatus,
} from "@/lib/admin/queries";

/**
 * Цветът е ДОПЪЛНЕНИЕ към текста, не заместител (WCAG 1.4.1) — в значката
 * винаги стои изписаният статус.
 */
const STATUS_VARIANT: Record<
  CallRequestStatus,
  "default" | "secondary" | "destructive" | "outline" | "ghost"
> = {
  NEW: "default",
  CONTACTED: "secondary",
  SCHEDULED: "outline",
  CLOSED: "ghost",
  SPAM: "destructive",
};

export function CallRequestStatusBadge({
  status,
}: {
  status: CallRequestStatus;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {CALL_REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}
