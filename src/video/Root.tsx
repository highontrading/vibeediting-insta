import { Composition } from "remotion";
import "./design/fonts";
import { SystemSpecimen, SPECIMEN_DURATION } from "./compositions/_SystemSpecimen";
import { ClayTest } from "./compositions/_ClayTest";
import { HowThisWasMade, HOW_THIS_WAS_MADE_DURATION } from "./compositions/HowThisWasMade";
import { NobodyPostedThis, NOBODY_POSTED_THIS_DURATION } from "./compositions/NobodyPostedThis";
import { Stillwater, STILLWATER_DURATION } from "./compositions/Stillwater";
import { CuriosityNotInformation, CURIOSITY_DURATION } from "./compositions/CuriosityNotInformation";
import { CompoundInterest, COMPOUND_INTEREST_DURATION } from "./compositions/CompoundInterest";
import { MondayInClay, MONDAY_IN_CLAY_DURATION } from "./compositions/MondayInClay";
import { CameraHistoryPaper, CAMERA_HISTORY_PAPER_DURATION } from "./compositions/CameraHistoryPaper";
import { WhyYouCantStopScrolling, WHY_YOU_CANT_STOP_SCROLLING_DURATION } from "./compositions/WhyYouCantStopScrolling";
import { TransitionsToSteal, TRANSITIONS_TO_STEAL_DURATION } from "./compositions/TransitionsToSteal";

import { ChannelSurfing, CHANNEL_SURFING_DURATION } from "./compositions/ChannelSurfing";

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
    <Composition id="CompoundInterest" component={CompoundInterest} durationInFrames={COMPOUND_INTEREST_DURATION} {...REEL} />
    <Composition id="MondayInClay" component={MondayInClay} durationInFrames={MONDAY_IN_CLAY_DURATION} {...REEL} />
    <Composition id="CameraHistoryPaper" component={CameraHistoryPaper} durationInFrames={CAMERA_HISTORY_PAPER_DURATION} {...REEL} />
    <Composition id="WhyYouCantStopScrolling" component={WhyYouCantStopScrolling} durationInFrames={WHY_YOU_CANT_STOP_SCROLLING_DURATION} {...REEL} />
    <Composition id="TransitionsToSteal" component={TransitionsToSteal} durationInFrames={TRANSITIONS_TO_STEAL_DURATION} {...REEL} />
    <Composition id="ChannelSurfing" component={ChannelSurfing} durationInFrames={CHANNEL_SURFING_DURATION} {...REEL} />
  </>
);
