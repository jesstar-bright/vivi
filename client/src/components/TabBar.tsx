import { Dumbbell, Heart, User } from "lucide-react";

type Tab = 'workouts' | 'lifestyle' | 'profile';

interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: typeof Dumbbell; label: string }[] = [
  { id: 'workouts', icon: Dumbbell, label: 'Workouts' },
  { id: 'lifestyle', icon: Heart, label: 'Lifestyle' },
  { id: 'profile', icon: User, label: 'Profile' },
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
