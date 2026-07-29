// ТЕРИТОРИЯ НА ЖОРО.
// Ползва обвивката на Боби, за да е навигацията една и съща — иначе
// клиентът усеща шев между сайта и магазина.

import type { ReactNode } from "react";
import { SiteShell } from "@/components/content/site-shell";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
