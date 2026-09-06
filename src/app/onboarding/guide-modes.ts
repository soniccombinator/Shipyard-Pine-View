export type GuideMode = "voice" | "text";

/** Which ways of talking to the Passport Guide are configured on this deployment. */
export type GuideAvailability = { voice: boolean; text: boolean };

/**
 * Voice and typing are independent services. The real guide renders as soon
 * as either one is configured; the scripted demo is only for a deployment
 * with neither key.
 */
export function hasRealGuide(available: GuideAvailability): boolean {
  return available.voice || available.text;
}

/**
 * Skip the chooser when there is only one real option, so nobody clicks
 * through a screen to discover the other button is disabled.
 */
export function initialGuideMode(available: GuideAvailability): GuideMode | null {
  if (available.voice && available.text) return null;
  if (available.voice) return "voice";
  if (available.text) return "text";
  return null;
}
