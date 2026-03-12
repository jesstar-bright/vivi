import { Lock } from "lucide-react";
import { useProgressSummary } from "@/hooks/useProgressSummary";
import { useProgressNarrative } from "@/hooks/useProgressNarrative";
import { useStrengthGains } from "@/hooks/useStrengthGains";

const PlaceholderCard = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
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

const NarrativeCard = ({ narrative }: { narrative: string }) => (
  <div className="card-elevated">
    <h3 className="text-sm font-bold text-foreground mb-2">Your Story</h3>
    <p className="text-sm text-foreground/80 font-medium leading-relaxed">
      {narrative}
    </p>
  </div>
);

const StrengthCard = ({
  gains,
}: {
  gains: Array<{
    exercise: string;
    change: string;
    sessions: number;
  }>;
}) => (
  <div className="card-elevated">
    <h3 className="text-sm font-bold text-foreground mb-3">
      What You Can Do Now
    </h3>
    <div className="space-y-2">
      {gains.map((g) => (
        <div
          key={g.exercise}
          className="flex items-center justify-between py-1.5"
        >
          <span className="text-sm font-medium text-foreground">
            {g.exercise}
          </span>
          <span className="text-xs font-bold text-primary">{g.change}</span>
        </div>
      ))}
    </div>
  </div>
);

const WeekChart = ({
  currentWeek,
  totalWeeks,
}: {
  currentWeek: number;
  totalWeeks: number;
}) => {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => ({
    week: i + 1,
    status:
      i + 1 < currentWeek
        ? "complete"
        : i + 1 === currentWeek
          ? "current"
          : "upcoming",
  }));

  return (
    <div className="card-elevated">
      <h3 className="text-sm font-bold text-foreground mb-4">
        Your {totalWeeks} Weeks
      </h3>
      <div className="flex items-end gap-1.5 h-20">
        {weeks.map(({ week, status }) => (
          <div
            key={week}
            className={`flex-1 rounded-md transition-all ${
              status === "complete"
                ? "bg-primary/60"
                : status === "current"
                  ? "bg-primary"
                  : "bg-secondary"
            }`}
            style={{
              height:
                status === "upcoming"
                  ? "30%"
                  : status === "current"
                    ? "100%"
                    : "60%",
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] font-semibold text-muted-foreground">
          W1
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground">
          W{totalWeeks}
        </span>
      </div>
    </div>
  );
};

const ProfileTab = () => {
  const { data: summary } = useProgressSummary();
  const { data: narrativeData } = useProgressNarrative();
  const { data: strengthData } = useStrengthGains();

  const hasNarrative = narrativeData?.narrative;
  const hasGains = strengthData?.gains && strengthData.gains.length > 0;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-4">
        Progress
      </h1>

      {hasNarrative ? (
        <NarrativeCard narrative={narrativeData.narrative!} />
      ) : (
        <PlaceholderCard
          title="Your Story"
          message="Check in Sunday to unlock your progress story."
        />
      )}

      {hasGains ? (
        <StrengthCard gains={strengthData.gains} />
      ) : (
        <PlaceholderCard
          title="What You Can Do Now"
          message="Train a week. Then the numbers show."
        />
      )}

      {summary ? (
        <WeekChart
          currentWeek={summary.current_week}
          totalWeeks={summary.total_weeks}
        />
      ) : (
        <PlaceholderCard
          title="Under the Surface"
          message="Health trends appear after your first week."
        />
      )}
    </div>
  );
};

export default ProfileTab;
