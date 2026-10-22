import { Composition } from "remotion";
import "./design/fonts";
import { SystemSpecimen, SPECIMEN_DURATION } from "./compositions/_SystemSpecimen";
import { ClayTest } from "./compositions/_ClayTest";
import { HowThisWasMade, HOW_THIS_WAS_MADE_DURATION } from "./compositions/HowThisWasMade";
import { NobodyPostedThis, NOBODY_POSTED_THIS_DURATION } from "./compositions/NobodyPostedThis";
import { Stillwater, STILLWATER_DURATION } from "./compositions/Stillwater";
import { CuriosityNotInformation, CURIOSITY_DURATION } from "./compositions/CuriosityNotInformation";

// Every Reel is 1080x1920 (9:16) at 30fps.
export const REEL = { width: 1080, height: 1920, fps: 30 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ClayTest" component={ClayTest} durationInFrames={60} {...REEL} />
    <Composition id="SystemSpecimen" component={SystemSpecimen} durationInFrames={SPECIMEN_DURATION} {...REEL} />
    <Composition id="HowThisWasMade" component={HowThisWasMade} durationInFrames={HOW_THIS_WAS_MADE_DURATION} {...REEL} />
    <Composition id="NobodyPostedThis" component={NobodyPostedThis} durationInFrames={NOBODY_POSTED_THIS_DURATION} {...REEL} />
    <Composition id="Stillwater" component={Stillwater} durationInFrames={STILLWATER_DURATION} {...REEL} />
    <Composition id="CuriosityNotInformation" component={CuriosityNotInformation} durationInFrames={CURIOSITY_DURATION} {...REEL} />
  </>
);
