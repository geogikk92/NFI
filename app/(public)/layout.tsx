// ТЕРИТОРИЯ НА БОБИ.
// Писано от Жоро, докато Боби е в отпуск.

import type { ReactNode } from "react";
import { SiteShell } from "@/components/content/site-shell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
