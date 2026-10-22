import { Composition } from "remotion";
import { HowThisWasMade, HOW_THIS_WAS_MADE_DURATION } from "./compositions/HowThisWasMade";
import { NobodyPostedThis, NOBODY_POSTED_THIS_DURATION } from "./compositions/NobodyPostedThis";

// Every Reel is 1080x1920 (9:16) at 30fps.
export const REEL = { width: 1080, height: 1920, fps: 30 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="HowThisWasMade" component={HowThisWasMade} durationInFrames={HOW_THIS_WAS_MADE_DURATION} {...REEL} />
    <Composition id="NobodyPostedThis" component={NobodyPostedThis} durationInFrames={NOBODY_POSTED_THIS_DURATION} {...REEL} />
  </>
);
