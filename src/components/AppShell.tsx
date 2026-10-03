import { Link } from "@tanstack/react-router";
import { AlarmClock, CalendarDays, Home, Repeat, Settings } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/alarmes", label: "Alarmes", icon: AlarmClock },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/escala", label: "Escala", icon: Repeat },
  { to: "/configuracoes", label: "Config.", icon: Settings },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function StatusPill({
  status,
  className = "",
}: {
  status: "TRABALHO" | "FOLGA";
  className?: string;
}) {
  const work = status === "TRABALHO";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        work ? "bg-work-soft text-work-foreground" : "bg-off-soft text-off-foreground"
      } ${className}`}
    >
      <span className={`size-2 rounded-full ${work ? "bg-work" : "bg-off"}`} aria-hidden />
      {work ? "TRABALHO" : "FOLGA"}
    </span>
  );
}
