// Sealed legacy-bugfix answer content (SERVER-ONLY). Moved out of the client
// scenario module so the root cause, ground truth, rubric, and reference solution
// never ship in the browser bundle. The window guard is the runtime seal.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const reference = `function toMinutes(observedAt) {
  const [hours, mins] = observedAt.split(":").map(Number);
  return hours * 60 + mins;
}

function annotateWarmupWindows(readings) {
  const waitMinutes = Array(readings.length).fill(0);
  const pendingIndexes = [];

  for (let index = 0; index < readings.length; index += 1) {
    const currentTemperature = readings[index].temperatureCelsius;

    while (
      pendingIndexes.length > 0 &&
      currentTemperature > readings[pendingIndexes[pendingIndexes.length - 1]].temperatureCelsius
    ) {
      const previousIndex = pendingIndexes.pop();
      waitMinutes[previousIndex] =
        toMinutes(readings[index].observedAt) - toMinutes(readings[previousIndex].observedAt);
    }

    pendingIndexes.push(index);
  }

  return readings.map((reading, index) => ({
    ...reading,
    minutesUntilWarmer: waitMinutes[index],
  }));
}

module.exports = { annotateWarmupWindows };
`

export const sealed: SealedLegacyScenario = {
  id: "bugfix-temperature-alert-regression",
  bugDescription:
    "The pending-stack resolution runs only once per warmer sample instead of draining every cooler reading that sample clears, so when a single recovery ends a multi-reading cold streak, only the most recent cold reading gets its wait and the earlier ones stay at zero.",
  groundTruth:
    "Root cause: the pending-index resolution fires at most once per incoming reading, so a warmer sample that should clear a whole descending streak only resolves the last cold reading; the earlier ones are never annotated and stay at zero, which undercounts the recovery windows the ops summary reports. Fix: drain every pending reading the current sample is strictly warmer than, not just the top one. Survival story: resolving one pending reading per sample reads as reasonable and is correct for a single dip, so it passed review; it only undercounts on a sustained multi-reading cold streak. Red herrings, all reachable and provably innocent: (1) the strict > comparison invites a change to >=, but equal temperatures are a flatline, not a warmup, and a flatline test proves >= would over-annotate; (2) waits come from observedAt deltas, not index deltas, because sampling is non-uniform, so a fix that counts indexes is wrong; (3) a duplicate-minute retry is tolerated and yields a zero-length delta between the duplicates, which is correct.",
  rootCauseRubric: [
    "Explains why a single recovery sample can resolve multiple prior readings, not just the most recent.",
    "Connects the unresolved pending readings to the undercounted operations summary.",
    "Rules out the strict > comparison and the observedAt-delta as innocent, showing equal temps and non-uniform gaps are handled by design.",
    "Proposes regression coverage for a long descending streak, a flatline, and a duplicate-minute retry.",
  ],
  referenceFiles: [
    {
      path: "src/temperature-alerts.js",
      role: "editable",
      language: "javascript",
      content: reference,
    },
  ],
}
