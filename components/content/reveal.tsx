"use client";

// ТЕРИТОРИЯ НА БОБИ · дизайн-система, движение — появяване при скрол.
//
// ПРАВИЛОТО, което пази всичко останало: съдържанието е ВИДИМО по
// подразбиране. Скриването става чак в браузъра, след mount, и само ако:
//   • човекът НЕ е поискал намалено движение;
//   • елементът е ПОД сгъвката (иначе скриваме нещо, което се вижда).
// Така без JavaScript, с изключен JS, за търсачки и при reduced-motion
// страницата е просто… страница. Анимацията е бонус, не условие.
//
// Иначе казано: това не е „анимационна библиотека", а 60 реда, които
// правят една-единствена постъпка правилно. Framer Motion за същото би
// домъкнал 30kb и втори начин нещата да се чупят.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Групата дава каскада: всяко дете закъснява с още една стъпка. */
const StaggerContext = createContext<{ step: number } | null>(null);

interface RevealProps {
  children: ReactNode;
  /** Пореден номер в каскадата — определя закъснението. */
  index?: number;
  /** Изместване в px, откъдето елементът „идва". */
  distance?: number;
  className?: string;
  /** span за инлайн контекст (напр. в заглавие). */
  as?: "div" | "span" | "li";
}

export function Reveal({
  children,
  index = 0,
  distance = 18,
  className,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement & HTMLLIElement>(null);
  const group = useContext(StaggerContext);
  const delayMs = index * (group?.step ?? 70);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Без IntersectionObserver няма кой да покаже скритото — не крием.
    if (typeof IntersectionObserver === "undefined") return;

    // Видимото на екрана при зареждане НЕ се крие — иначе първата
    // секция примигва. Загатнатият ръб (80% от viewport-а) се приема
    // за „още невидяно".
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) return;

    el.classList.add("will-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-revealed");
            io.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = {
    "--reveal-delay": `${delayMs}ms`,
    "--reveal-distance": `${distance}px`,
  } as CSSProperties;

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className} style={style}>
      {children}
    </Tag>
  );
}

/** Обвивка за каскада: <RevealGroup><Reveal index={i}>…</Reveal></RevealGroup> */
export function RevealGroup({
  children,
  step = 70,
}: {
  children: ReactNode;
  /** Милисекунди между стъпките на каскадата. */
  step?: number;
}) {
  return (
    <StaggerContext.Provider value={{ step }}>
      {children}
    </StaggerContext.Provider>
  );
}
