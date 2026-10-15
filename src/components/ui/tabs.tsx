"use client";

import { useId, useState, type ReactNode } from "react";

export type Tab = { id: string; label: string; content: ReactNode };

/** Accessible tabs (roles, arrow keys that follow the reading direction) (arrow keys, roles) over content the server already rendered. */
export function Tabs({ tabs }: { tabs: Tab[] }) {
  const base = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  const move = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    // arrows follow the reading direction, so flip them for right-to-left pages
    const rtl = getComputedStyle(e.currentTarget as Element).direction === "rtl";
    const next = tabs[(i + (rtl ? -step : step) + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`${base}-tab-${next.id}`)?.focus();
  };
  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-border">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            id={`${base}-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={tab.id === active}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(e) => move(e, i)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab.id === active ? "border-accent text-foreground" : "border-transparent text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${base}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="py-4 leading-relaxed"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
