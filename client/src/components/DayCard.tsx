import { useState } from "react";
import { ChevronDown, AlertTriangle, Info, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DayData } from "@/data/workoutData";

interface DayCardProps {
  data: DayData;
  isToday?: boolean;
  onDone?: () => void;
}

const borderClass: Record<string, string> = {
  strength: 'day-border-strength',
  vigorous: 'day-border-vigorous',
  recovery: 'day-border-recovery',
  rest: 'day-border-rest',
};

const badgeClass: Record<string, string> = {
  strength: 'type-badge type-badge-strength',
  vigorous: 'type-badge type-badge-vigorous',
  recovery: 'type-badge type-badge-recovery',
  rest: 'type-badge type-badge-rest',
};

const typeLabel: Record<string, string> = {
  strength: 'Strength',
  vigorous: 'Vigorous',
  recovery: 'Recovery',
  rest: 'Rest',
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mt-5 mb-2.5">
    <div className="w-1 h-4 rounded-full bg-primary/30" />
    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{children}</p>
  </div>
);

const ExerciseList = ({ items }: { items: string[] }) => (
  <div className="space-y-1">
    {items.map((ex, i) => {
      // Parse exercise name and sets
      const parts = ex.match(/^(.+?)(\s+\d+×?\d*.*|\s+\d+\s+sec.*|\s+\d+\s+each.*|\s+\d+$)/);
      const name = parts ? parts[1] : ex;
      const detail = parts ? parts[2].trim() : null;

      return (
        <div key={i} className="flex items-baseline justify-between py-1.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
          <span className="text-sm font-medium text-foreground">{name}</span>
          {detail && (
            <span className="text-xs font-semibold text-muted-foreground ml-3 shrink-0">{detail}</span>
          )}
        </div>
      );
    })}
  </div>
);

const DayCard = ({ data, isToday, onDone }: DayCardProps) => {
  const [open, setOpen] = useState(isToday ?? false);

  return (
    <div className={`card-elevated ${borderClass[data.type]} overflow-hidden ${isToday ? 'ring-2 ring-primary/20' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <span className={badgeClass[data.type]}>{typeLabel[data.type]}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">{data.day}</span>
              <span className="text-sm text-muted-foreground">{data.date}</span>
              {isToday && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">Today</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium">{data.subtitle}</p>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="mt-2">
            <ChevronDown size={20} className="text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-1">
              {data.caution && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/8 border border-destructive/15 text-sm">
                  <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
                  <span className="text-foreground/90 font-medium">{data.caution}</span>
                </div>
              )}

              {data.note && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-secondary border border-border text-sm">
                  <Info size={16} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/90 font-medium">{data.note}</span>
                </div>
              )}

              {data.rest && data.activities && (
                <>
                  <SectionLabel>Today</SectionLabel>
                  <ExerciseList items={data.activities} />
                </>
              )}

              {data.vigorous && (
                <>
                  <SectionLabel>{data.vigorous.title}</SectionLabel>
                  <div className="card-elevated-sm text-sm whitespace-pre-line text-foreground/90 font-medium bg-secondary/60">
                    {data.vigorous.content}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 px-1">
                    <Zap size={12} className="text-primary" />
                    <p className="text-xs font-semibold text-primary">Target: {data.vigorous.target}</p>
                  </div>
                </>
              )}

              {data.warmup && (
                <>
                  <SectionLabel>Warm-up</SectionLabel>
                  <ExerciseList items={data.warmup} />
                </>
              )}

              {data.main && (
                <>
                  <SectionLabel>Main Work</SectionLabel>
                  <ExerciseList items={data.main} />
                </>
              )}

              {data.superset && (
                <>
                  <SectionLabel>{data.superset.label}</SectionLabel>
                  <div className="card-elevated-sm bg-secondary/40">
                    <ExerciseList items={data.superset.exercises} />
                  </div>
                </>
              )}

              {data.circuit && (
                <>
                  <SectionLabel>{data.circuit.label}</SectionLabel>
                  <ExerciseList items={data.circuit.exercises} />
                </>
              )}

              {data.core && (
                <>
                  <SectionLabel>{data.core.label}</SectionLabel>
                  <ExerciseList items={data.core.exercises} />
                </>
              )}

              {data.finisher && (
                <>
                  <SectionLabel>Finisher</SectionLabel>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Zap size={14} className="text-primary shrink-0" />
                    <p className="text-sm font-medium text-foreground">{data.finisher}</p>
                  </div>
                </>
              )}

              {isToday && onDone && (
                <button onClick={(e) => { e.stopPropagation(); onDone(); }} className="btn-primary w-full text-center mt-4">
                  Complete Workout ✓
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DayCard;
