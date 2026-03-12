import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, CheckCircle } from "lucide-react";
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
  // Steps: 0=energy/drive, 1=photo, 2=manual metrics (if needed), 3=loading/result
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState<number | null>(null);
  const [drive, setDrive] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [manualMetrics, setManualMetrics] = useState({
    sleep_avg: "",
    body_battery_avg: "",
    hrv_current: "",
    stress_avg: "",
  });
  const [result, setResult] = useState<{
    mode: string;
    trainer_message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsMetrics, setNeedsMetrics] = useState(false);

  const checkin = useCheckin();
  const uploadPhoto = useUploadPhoto();

  const handleNext = () => {
    if (step === 0 && energy && drive) setStep(1);
  };

  const doSubmit = (extraBody?: { manual_metrics: Record<string, number> }) => {
    if (!energy || !drive) return;
    setStep(3);
    setError(null);
    setNeedsMetrics(false);

    const body: any = {
      energy,
      motivation: drive,
      notes,
      photo_key: photoKey || undefined,
      ...extraBody,
    };

    checkin.mutate(body, {
      onSuccess: (data) => {
        setResult({ mode: data.mode, trainer_message: data.trainer_message });
      },
      onError: (err: any) => {
        if (err.body?.needs_metrics) {
          setNeedsMetrics(true);
          setStep(2); // Go to manual metrics input
        } else {
          setError(err.message);
        }
      },
    });
  };

  const handleSubmitFromPhoto = () => doSubmit();

  const handleSubmitWithMetrics = () => {
    const m = manualMetrics;
    if (!m.sleep_avg || !m.body_battery_avg || !m.hrv_current || !m.stress_avg) return;
    doSubmit({
      manual_metrics: {
        sleep_avg: parseFloat(m.sleep_avg),
        body_battery_avg: parseFloat(m.body_battery_avg),
        hrv_current: parseFloat(m.hrv_current),
        stress_avg: parseFloat(m.stress_avg),
      },
    });
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
    setManualMetrics({ sleep_avg: "", body_battery_avg: "", hrv_current: "", stress_avg: "" });
    setResult(null);
    setError(null);
    setNeedsMetrics(false);
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
                onClick={handleSubmitFromPhoto}
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

          {/* Step 2: Manual Metrics (shown when Garmin data not found) */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold">Enter Metrics</h2>
                <p className="text-sm text-muted-foreground font-medium mt-2">
                  No Garmin data found. Enter your averages for this week.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: "sleep_avg" as const, label: "Avg Sleep (hours)", placeholder: "7.5" },
                  { key: "body_battery_avg" as const, label: "Avg Body Battery", placeholder: "65" },
                  { key: "hrv_current" as const, label: "Current HRV", placeholder: "45" },
                  { key: "stress_avg" as const, label: "Avg Stress", placeholder: "35" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      value={manualMetrics[key]}
                      onChange={(e) =>
                        setManualMetrics((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={placeholder}
                      className="w-full card-elevated-sm text-sm bg-secondary/50 placeholder:text-muted-foreground/40"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmitWithMetrics}
                disabled={
                  !manualMetrics.sleep_avg ||
                  !manualMetrics.body_battery_avg ||
                  !manualMetrics.hrv_current ||
                  !manualMetrics.stress_avg ||
                  checkin.isPending
                }
                className="btn-primary w-full disabled:opacity-40"
              >
                {checkin.isPending ? "Submitting..." : "Submit Check-In"}
              </button>
            </motion.div>
          )}

          {/* Step 3: Loading / Result / Error */}
          {step === 3 && (
            <motion.div
              key="step3"
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
