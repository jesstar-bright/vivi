import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X } from "lucide-react";
import DiamondLogo from "./DiamondLogo";
import { useCheckin, useUploadPhoto } from "@/hooks/useCheckin";

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

const modeLabels: Record<string, string> = {
  push: "Push Week",
  maintain: "Maintain Week",
  rampup: "Ramp-Up Week",
};

const CheckInModal = ({ open, onClose, onComplete }: CheckInModalProps) => {
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState<number | null>(null);
  const [drive, setDrive] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [result, setResult] = useState<{
    mode: string;
    trainer_message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkin = useCheckin();
  const uploadPhoto = useUploadPhoto();

  const handleNext = () => {
    if (step === 0 && energy && drive) setStep(1);
  };

  const handleSubmit = () => {
    if (!energy || !drive) return;
    setStep(2);
    setError(null);

    checkin.mutate(
      {
        energy,
        motivation: drive,
        notes,
        photo_key: photoKey || undefined,
      },
      {
        onSuccess: (data) => {
          setResult({ mode: data.mode, trainer_message: data.trainer_message });
        },
        onError: (err: any) => {
          if (err.body?.needs_metrics) {
            setError(err.body.message || "Metrics needed — check Garmin email.");
          } else {
            setError(err.message);
          }
        },
      },
    );
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      const res = await uploadPhoto.mutateAsync(file);
      setPhotoKey(res.photo_key);
    } catch {
      // Photo is optional — don't block
    }
  };

  const reset = () => {
    setStep(0);
    setEnergy(null);
    setDrive(null);
    setNotes("");
    setPhotoKey(null);
    setResult(null);
    setError(null);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
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

      <div className="w-full max-w-sm px-6">
        <AnimatePresence mode="wait">
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
                  Sunday
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
              {photoKey && (
                <p className="text-xs text-primary font-medium">
                  Photo uploaded
                </p>
              )}
              {uploadPhoto.isPending && (
                <p className="text-xs text-muted-foreground">Uploading...</p>
              )}
              <button onClick={handleSubmit} className="btn-primary w-full">
                {photoKey ? "Submit" : "Skip & Submit"}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6"
            >
              {error ? (
                <div className="space-y-4 py-8">
                  <p className="text-sm text-destructive font-medium">
                    {error}
                  </p>
                  <button
                    onClick={() => {
                      setStep(0);
                      setError(null);
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
                  <div className="py-4">
                    <span className="type-badge type-badge-vigorous text-base px-5 py-2.5 inline-block">
                      {modeLabels[result.mode] || result.mode}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {result.trainer_message}
                  </p>
                  <div className="flex gap-3">
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
