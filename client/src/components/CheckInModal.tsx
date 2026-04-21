import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageCircle,
  Sliders,
  Trophy,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import DiamondLogo from "./DiamondLogo";
import { useUploadPhoto } from "@/hooks/useCheckin";
import { useAgentInvoke } from "@/hooks/useAgentInvoke";
import type {
  Milestone,
  Proposal,
  TrainerResponse,
} from "@/lib/trainer-types";

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (tab: "workouts" | "lifestyle") => void;
}

const ScaleButton = ({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${
      selected
        ? "text-primary-foreground bg-primary shadow-md"
        : "bg-secondary text-foreground border border-border"
    }`}
  >
    {value}
  </button>
);

// ---------- Proposal rendering helpers ----------

const proposalTypeLabels: Record<Proposal["proposal_type"], string> = {
  training_block: "New Training Block",
  next_week: "Next Week's Plan",
  block_revision: "Block Revision",
  day_regeneration: "Day Regeneration",
};

/**
 * Best-effort summary line(s) for a proposal. The agent's `data` shape varies
 * by `proposal_type`; we probe the expected fields and fall back to JSON
 * preview so the user still sees something rather than a blank card.
 */
function summarizeProposal(p: Proposal): string[] {
  const d = (p.data ?? {}) as Record<string, unknown>;
  const lines: string[] = [];

  const pushIfString = (label: string, value: unknown) => {
    if (typeof value === "string" && value.trim()) lines.push(`${label}: ${value}`);
  };
  const pushIfNumber = (label: string, value: unknown) => {
    if (typeof value === "number") lines.push(`${label}: ${value}`);
  };

  switch (p.proposal_type) {
    case "training_block": {
      pushIfNumber("Weeks", d.weeks);
      pushIfString("Theme", d.theme);
      if (Array.isArray(d.focus_areas) && d.focus_areas.length) {
        lines.push(`Focus: ${d.focus_areas.filter(Boolean).join(", ")}`);
      }
      break;
    }
    case "next_week": {
      pushIfString("Mode", d.mode);
      const sessions = Array.isArray(d.sessions) ? d.sessions.length : undefined;
      if (typeof sessions === "number") lines.push(`Sessions: ${sessions}`);
      break;
    }
    case "block_revision": {
      pushIfString("Reason", d.reason);
      pushIfString("Change", d.change);
      break;
    }
    case "day_regeneration": {
      pushIfString("Day", d.day);
      pushIfString("Reason", d.reason);
      break;
    }
  }

  if (lines.length === 0) {
    // Fallback so the card isn't empty. Trim to keep it readable.
    const preview = JSON.stringify(p.data ?? {}, null, 0);
    if (preview && preview !== "{}") {
      lines.push(preview.length > 140 ? preview.slice(0, 140) + "…" : preview);
    }
  }

  return lines;
}

const ProposalCard = ({ proposal }: { proposal: Proposal }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const summary = summarizeProposal(proposal);

  const notYetWired = (action: string) => {
    const label = `${action} not yet wired`;
    console.log("[Proposal action]", {
      action,
      proposal_type: proposal.proposal_type,
      data: proposal.data,
    });
    toast(label);
  };

  return (
    <div className="card-elevated-sm text-left space-y-3 bg-secondary/40 border border-border">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-primary" />
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          {proposalTypeLabels[proposal.proposal_type]}
        </span>
      </div>

      {summary.length > 0 && (
        <ul className="text-sm text-foreground space-y-1">
          {summary.map((line, i) => (
            <li key={i} className="leading-snug">
              {line}
            </li>
          ))}
        </ul>
      )}

      {proposal.reasoning && (
        <div>
          <button
            type="button"
            onClick={() => setShowReasoning((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {showReasoning ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showReasoning ? "Hide reasoning" : "See my thinking"}
          </button>
          {showReasoning && (
            <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
              {proposal.reasoning}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => notYetWired("Accept")}
          className="btn-primary flex-1 text-sm py-2"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => notYetWired("Adjust")}
          className="btn-ghost flex-1 text-sm py-2 flex items-center justify-center gap-1"
        >
          <Sliders size={14} /> Adjust
        </button>
        <button
          type="button"
          onClick={() => notYetWired("Talk to Trainer")}
          className="btn-ghost flex-1 text-sm py-2 flex items-center justify-center gap-1"
        >
          <MessageCircle size={14} /> Talk
        </button>
      </div>
    </div>
  );
};

const MilestonesCard = ({ milestones }: { milestones: Milestone[] }) => (
  <div className="card-elevated-sm text-left bg-primary/10 border border-primary/20 space-y-2">
    <div className="flex items-center gap-2">
      <Trophy size={14} className="text-primary" />
      <span className="text-xs font-bold uppercase tracking-widest text-primary">
        {milestones.length === 1 ? "Milestone" : "Milestones"}
      </span>
    </div>
    <ul className="text-sm text-foreground space-y-1">
      {milestones.map((m, i) => (
        <li key={i} className="leading-snug">
          {m.description}
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Render the trainer message. We don't have a markdown library installed,
 * so "render as markdown" pragmatically means: preserve line breaks and
 * paragraph spacing. Good enough for the agent's current prose output.
 */
const TrainerMessage = ({ text }: { text: string }) => (
  <div className="text-sm text-foreground text-left whitespace-pre-line leading-relaxed">
    {text}
  </div>
);

// ---------- Main modal ----------

const CheckInModal = ({ open, onClose, onComplete }: CheckInModalProps) => {
  // Steps: 0=energy/motivation, 1=photo, 2=loading/result
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState<number | null>(null);
  const [drive, setDrive] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [result, setResult] = useState<TrainerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invoke = useAgentInvoke();
  const uploadPhoto = useUploadPhoto();

  const handleNext = () => {
    if (step === 0 && energy && drive) setStep(1);
  };

  const doSubmit = async () => {
    if (!energy || !drive) return;
    setStep(2);
    setError(null);

    try {
      const data = await invoke.mutateAsync({
        invocation_type: "check_in",
        trigger_payload: {
          energy,
          motivation: drive,
          notes,
          photo_key: photoKey || undefined,
        },
      });
      setResult(data.response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      setPhotoName(file.name);
      const res = await uploadPhoto.mutateAsync(file);
      setPhotoKey(res.photo_key);
    } catch {
      setPhotoName(null);
    }
  };

  const reset = () => {
    setStep(0);
    setEnergy(null);
    setDrive(null);
    setNotes("");
    setPhotoKey(null);
    setPhotoName(null);
    setResult(null);
    setError(null);
  };

  if (!open) return null;

  const nextCheckInLabel = (() => {
    if (!result?.next_check_in_at) return null;
    const d = new Date(result.next_check_in_at);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-y-auto"
    >
      <button
        onClick={() => {
          onClose();
          reset();
        }}
        className="absolute top-4 right-4 p-2 text-muted-foreground"
      >
        <X size={22} />
      </button>

      <div className="w-full max-w-sm px-6 py-10">
        <AnimatePresence mode="wait">
          {/* Step 0: Energy & Drive */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                  Weekly
                </p>
                <h2 className="text-2xl font-bold">Check-In</h2>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Energy level
                </p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <ScaleButton
                      key={v}
                      value={v}
                      selected={energy === v}
                      onClick={() => setEnergy(v)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Drive & motivation
                </p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <ScaleButton
                      key={v}
                      value={v}
                      selected={drive === v}
                      onClick={() => setDrive(v)}
                    />
                  ))}
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full card-elevated-sm text-sm resize-none h-20 placeholder:text-muted-foreground/60 bg-secondary/50"
              />

              <button
                onClick={handleNext}
                disabled={!energy || !drive}
                className="btn-primary w-full disabled:opacity-40"
              >
                Next
              </button>
            </motion.div>
          )}

          {/* Step 1: Photo */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 text-center"
            >
              <h2 className="text-2xl font-bold">Progress Photo</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Optional — take or upload a photo
              </p>

              {photoKey ? (
                <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <CheckCircle size={16} className="text-primary" />
                  <span className="text-sm font-medium text-primary truncate max-w-[200px]">
                    {photoName || "Photo uploaded"}
                  </span>
                </div>
              ) : (
                <div className="flex gap-3 justify-center">
                  <label className="btn-ghost flex items-center gap-2 cursor-pointer">
                    <Camera size={16} /> Take Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                      }}
                    />
                  </label>
                  <label className="btn-ghost flex items-center gap-2 cursor-pointer">
                    <Upload size={16} /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                      }}
                    />
                  </label>
                </div>
              )}

              {uploadPhoto.isPending && (
                <p className="text-xs text-muted-foreground">Uploading...</p>
              )}

              <button
                onClick={doSubmit}
                disabled={uploadPhoto.isPending}
                className="btn-primary w-full disabled:opacity-60"
              >
                {uploadPhoto.isPending
                  ? "Uploading..."
                  : photoKey
                    ? "Submit"
                    : "Skip Photo & Submit"}
              </button>
            </motion.div>
          )}

          {/* Step 2: Loading / Result / Error */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-5"
            >
              {error ? (
                <div className="space-y-4 py-8 text-center">
                  <p className="text-sm text-destructive font-medium">
                    {error}
                  </p>
                  <button
                    onClick={() => {
                      setError(null);
                      setStep(0);
                    }}
                    className="btn-ghost"
                  >
                    Try Again
                  </button>
                </div>
              ) : !result ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-primary"
                  >
                    <DiamondLogo size={56} />
                  </motion.div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Analyzing your week...
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                      Check-In Complete
                    </p>
                  </div>

                  {result.message && <TrainerMessage text={result.message} />}

                  {result.milestones && result.milestones.length > 0 && (
                    <MilestonesCard milestones={result.milestones} />
                  )}

                  {result.proposals && result.proposals.length > 0 && (
                    <div className="space-y-3">
                      {result.proposals.map((p, i) => (
                        <ProposalCard key={i} proposal={p} />
                      ))}
                    </div>
                  )}

                  {nextCheckInLabel && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarClock size={14} />
                      <span>Next check-in: {nextCheckInLabel}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        onComplete("workouts");
                        reset();
                      }}
                      className="btn-primary flex-1"
                    >
                      See Workouts
                    </button>
                    <button
                      onClick={() => {
                        onComplete("lifestyle");
                        reset();
                      }}
                      className="btn-ghost flex-1"
                    >
                      See Lifestyle
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CheckInModal;
