import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { weekData } from "@/data/workoutData";

interface PostWorkoutModalProps {
  open: boolean;
  onClose: () => void;
}

type Rating = 'good' | 'light' | 'heavy' | 'skipped';

const ratingOptions: { id: Rating; label: string; emoji: string }[] = [
  { id: 'good', label: 'Good', emoji: '👍' },
  { id: 'light', label: 'Light', emoji: '🪶' },
  { id: 'heavy', label: 'Heavy', emoji: '🏋️' },
  { id: 'skipped', label: 'Skip', emoji: '⏭️' },
];

const PostWorkoutModal = ({ open, onClose }: PostWorkoutModalProps) => {
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const today = weekData[0];
  const exercises = [...(today.main || []), ...(today.superset?.exercises || [])];

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-[100] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border shadow-xl"
    >
      <div className="p-5 pb-24">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-foreground">Rate Your Workout</h2>
          <button onClick={onClose} className="p-2 text-muted-foreground"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          {exercises.map((ex) => (
            <div key={ex} className="card-elevated-sm bg-secondary/40">
              <p className="text-sm font-semibold text-foreground mb-2">{ex}</p>
              <div className="flex gap-1.5">
                {ratingOptions.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => setRatings(prev => ({ ...prev, [ex]: id }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      ratings[ex] === id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-card border border-border text-foreground'
                    }`}
                  >
                    <span className="block">{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <textarea placeholder="Notes (optional)" className="w-full card-elevated-sm text-sm resize-none h-20 mt-4 placeholder:text-muted-foreground/60 bg-secondary/50" />

        <button onClick={onClose} className="btn-primary w-full mt-4">
          Submit
        </button>
      </div>
    </motion.div>
  );
};

export default PostWorkoutModal;
