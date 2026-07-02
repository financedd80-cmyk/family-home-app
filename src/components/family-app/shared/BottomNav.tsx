import { TABS } from "@/data/familyDemoData";
import type { ActiveTab } from "@/types/familyApp";

export function BottomNav({
  activeTab,
  onTabClick,
  tabs = TABS,
  tabLabel,
}: {
  activeTab: ActiveTab;
  onTabClick: (tab: ActiveTab) => void;
  tabs?: readonly ActiveTab[];
  tabLabel?: (tab: ActiveTab) => string;
}) {
  return (
    <nav className="grid grid-cols-1 gap-1 border-t border-card-border bg-card px-1 py-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabClick(tab)}
          className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium ${
            activeTab === tab ? "bg-accent-soft text-accent" : "text-muted"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              activeTab === tab ? "bg-accent" : "bg-transparent"
            }`}
          />
          {tabLabel ? tabLabel(tab) : tab}
        </button>
      ))}
    </nav>
  );
}
