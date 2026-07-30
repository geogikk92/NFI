// ТЕРИТОРИЯ НА БОБИ · задача 2b — състоянията на интерфейса.
// Писано от Жоро, докато Боби е в отпуск.
//
// Съществуват, защото „празно", „зареждане" и „грешка" се забравят и
// после се дописват криво на десет места. Тук са веднъж, с правилната
// достъпност: зареждането се обявява с role="status", грешката с
// role="alert", а skeleton-ите са скрити от екранния четец — той не
// бива да чете сиви правоъгълници.

import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
//  Празно
// ─────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center",
        className,
      )}
    >
      <span className="text-subtle" aria-hidden>
        {icon ?? <Inbox className="size-8" />}
      </span>
      <p className="mt-4 font-medium">{title}</p>
      {description ? (
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Грешка
// ─────────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  /** Съобщение на езика на потребителя. НЕ техническо. */
  title?: string;
  description?: string;
  /** Ако е подадено, се показва бутон за повторен опит. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Da ist etwas schiefgelaufen",
  description = "Bitte versuchen Sie es erneut. Falls das Problem bleibt, melden Sie sich bei uns.",
  onRetry,
  retryLabel = "Erneut versuchen",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="text-destructive" aria-hidden>
        <AlertCircle className="mx-auto size-8" />
      </span>
      <p className="mt-4 font-medium text-destructive">{title}</p>
      <p className="mt-2 mx-auto max-w-prose text-sm text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" className="mt-6">
          <RefreshCw aria-hidden />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Зареждане
// ─────────────────────────────────────────────────────────────────────────

interface LoadingStateProps {
  /** Обявява се на екранния четец. Затова е смислен текст, не „…". */
  label?: string;
  className?: string;
}

export function LoadingState({
  label = "Wird geladen",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center gap-3 py-16", className)}
    >
      {/* Въртенето спира при prefers-reduced-motion — правилото е глобално
          в globals.css, затова тук няма нужда от условен клас. */}
      <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Skeleton
// ─────────────────────────────────────────────────────────────────────────
//
// Всички skeleton-и са `aria-hidden` и носят един `role="status"` с текст
// отвън. Иначе екранният четец изчита десет празни блока.

function Bar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block animate-pulse rounded-md bg-muted", className)}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <Bar className="h-5 w-2/3" />
      <Bar className="mt-3 h-4 w-full" />
      <Bar className="mt-2 h-4 w-4/5" />
      <div className="mt-6 flex items-center justify-between">
        <Bar className="h-6 w-20" />
        <Bar className="h-8 w-24" />
      </div>
    </div>
  );
}

interface CardGridSkeletonProps {
  count?: number;
  label?: string;
}

export function CardGridSkeleton({
  count = 6,
  label = "Inhalte werden geladen",
}: CardGridSkeletonProps) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  label?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  label = "Tabelle wird geladen",
}: TableSkeletonProps) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="divide-y divide-border rounded-lg border border-border">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-3">
            {Array.from({ length: columns }, (_, colIndex) => (
              <Bar
                key={colIndex}
                className={cn("h-4", colIndex === 0 ? "w-1/3" : "flex-1")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Text wird geladen</span>
      {Array.from({ length: lines }, (_, index) => (
        <Bar
          key={index}
          className={cn("h-4", index === 0 ? "mt-0" : "mt-3", index === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}
