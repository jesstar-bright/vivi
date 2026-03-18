import { Dumbbell, Heart, TrendingUp } from "lucide-react";

export type Tab = 'workouts' | 'lifestyle' | 'menu' | 'progress';

interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const BowlIcon = ({ size = 22, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Rim */}
    <ellipse cx="12" cy="10" rx="9" ry="3.5" />
    {/* Bowl body */}
    <path d="M3 10 C3 10 4.5 20 12 20 C19.5 20 21 10 21 10" />
  </svg>
);

const tabs: { id: Tab; icon: typeof Dumbbell | typeof BowlIcon; label: string }[] = [
  { id: 'workouts', icon: Dumbbell, label: 'Workouts' },
  { id: 'lifestyle', icon: Heart, label: 'Lifestyle' },
  { id: 'menu', icon: BowlIcon, label: 'Menu' },
  { id: 'progress', icon: TrendingUp, label: 'Progress' },
];

const TabBar = ({ active, onChange }: TabBarProps) => (
  <nav className="glass-tab-bar">
    {tabs.map(({ id, icon: Icon, label }) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all ${
          active === id ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <Icon size={22} strokeWidth={active === id ? 2.2 : 1.5} />
        <span className="text-[11px] font-semibold">{label}</span>
      </button>
    ))}
  </nav>
);

export default TabBar;
