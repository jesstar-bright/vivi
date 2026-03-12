import { progressData } from "@/data/workoutData";
import { Lock, TrendingUp } from "lucide-react";

const PlaceholderCard = ({ title, message }: { title: string; message: string }) => (
  <div className="card-elevated py-8">
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
        <Lock size={16} className="text-muted-foreground" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground font-medium">{message}</p>
    </div>
  </div>
);

const WeekChart = () => {
  return (
    <div className="card-elevated">
      <h3 className="text-sm font-bold text-foreground mb-4">Your 12 Weeks</h3>
      <div className="flex items-end gap-1.5 h-20">
        {progressData.weeks.map(({ week }) => (
          <div
            key={week}
            className="flex-1 rounded-md bg-secondary transition-all"
            style={{ height: '100%' }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] font-semibold text-muted-foreground">W1</span>
        <span className="text-[10px] font-semibold text-muted-foreground">W12</span>
      </div>
    </div>
  );
};

const ProfileTab = () => (
  <div className="space-y-3">
    <h1 className="text-2xl font-bold tracking-tight text-foreground mb-4">Progress</h1>
    <PlaceholderCard title="Your Story" message={progressData.narrative} />
    <PlaceholderCard title="What You Can Do Now" message={progressData.strength} />
    <PlaceholderCard title="Under the Surface" message={progressData.metrics} />
    <WeekChart />
  </div>
);

export default ProfileTab;
