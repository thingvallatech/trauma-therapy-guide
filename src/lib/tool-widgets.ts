/**
 * Single source of truth for `componentName` (from a tool's markdown
 * frontmatter) to its Astro widget. Previously duplicated across all four
 * tool routes — English and Spanish, standard and fullscreen.
 */
import SUDScale from '../components/tools/SUDScale.astro';
import VOCScale from '../components/tools/VOCScale.astro';
import BreathPacer from '../components/tools/BreathPacer.astro';
import Grounding from '../components/tools/Grounding.astro';
import BLSVisual from '../components/tools/BLSVisual.astro';
import BLSAudio from '../components/tools/BLSAudio.astro';
import BLSCombined from '../components/tools/BLSCombined.astro';
import BLSTapping from '../components/tools/BLSTapping.astro';
import Container from '../components/tools/Container.astro';
import SafePlace from '../components/tools/SafePlace.astro';
import Lightstream from '../components/tools/Lightstream.astro';
import ButterflyHug from '../components/tools/ButterflyHug.astro';
import FeelingWheel from '../components/tools/FeelingWheel.astro';
import Sandtray from '../components/tools/Sandtray.astro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_WIDGETS: Record<string, any> = {
  SUDScale, VOCScale, BreathPacer, Grounding,
  BLSVisual, BLSAudio, BLSCombined, BLSTapping,
  Container, SafePlace, Lightstream, ButterflyHug,
  FeelingWheel, Sandtray,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function widgetFor(componentName: string): any | null {
  return TOOL_WIDGETS[componentName] ?? null;
}
