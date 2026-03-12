import DayCard from "./DayCard";
import { weekData } from "@/data/workoutData";
import CreaLogo from "./DiamondLogo";

interface WorkoutsTabProps {
  onDone: () => void;
}

const WorkoutsTab = ({ onDone }: WorkoutsTabProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CreaLogo size={22} />
            <p className="text-sm font-bold uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif", background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Crea</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Week 1 — Ramp-Up</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Mar 12 – Mar 18</p>
        </div>
      </div>
      {weekData.map((day, i) => (
        <DayCard key={day.day} data={day} isToday={i === 0} onDone={onDone} />
      ))}
    </div>
  );
};

export default WorkoutsTab;
