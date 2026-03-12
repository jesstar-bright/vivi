import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import TabBar from "@/components/TabBar";
import WorkoutsTab from "@/components/WorkoutsTab";
import LifestyleTab from "@/components/LifestyleTab";
import ProfileTab from "@/components/ProfileTab";
import CheckInModal from "@/components/CheckInModal";
import PostWorkoutModal from "@/components/PostWorkoutModal";

type Tab = 'workouts' | 'lifestyle' | 'profile';

const Index = () => {
  const [tab, setTab] = useState<Tab>('workouts');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [postWorkoutOpen, setPostWorkoutOpen] = useState(false);

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-md mx-auto px-4 pt-12">
        {tab === 'workouts' && <WorkoutsTab onDone={() => setPostWorkoutOpen(true)} />}
        {tab === 'lifestyle' && <LifestyleTab />}
        {tab === 'profile' && <ProfileTab />}
      </div>

      <TabBar active={tab} onChange={setTab} />

      <AnimatePresence>
        {checkInOpen && (
          <CheckInModal
            open={checkInOpen}
            onClose={() => setCheckInOpen(false)}
            onComplete={(t) => { setCheckInOpen(false); setTab(t); }}
          />
        )}
        {postWorkoutOpen && (
          <PostWorkoutModal open={postWorkoutOpen} onClose={() => setPostWorkoutOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
