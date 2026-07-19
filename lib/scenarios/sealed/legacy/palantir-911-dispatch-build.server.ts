// Sealed reference solution (SERVER-ONLY) for an add-functionality scenario.
// The complete fixed files are moved out of the client module so they never ship
// in the browser bundle. No runtime code reads them; the node-side test gates
// apply them over the starter workspace to prove the suite goes green.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const dispatchReference = `from src.geo import distance

STALE_THRESHOLD = 300

def recommend_responders(incident, responders, top_k=3):
    if not incident or "location" not in incident:
        return []

    required = incident.get("type")
    valid = []
    for r in responders:
        if r.get("status") != "available":
            continue
        if required not in r.get("capabilities", []):
            continue
        if r.get("last_update", 0) > STALE_THRESHOLD:
            continue
        dist = distance(incident["location"], r["location"])
        valid.append({
            "id": r["id"],
            "distance": dist,
            "explanation": f"Available {required} unit, {dist:.2f} units away.",
        })

    valid.sort(key=lambda x: x["distance"])
    return valid[:top_k]
`

const dispatchServiceReference = `from src.dispatch import recommend_responders

def recommend_response(incident, responders, top_k=3):
    recommendations = recommend_responders(incident, responders, top_k)
    return {"count": len(recommendations), "recommendations": recommendations}
`

export const sealed: SealedLegacyScenario = {
  id: "palantir-911-dispatch-build",
  referenceFiles: [
    {
      path: "src/dispatch.py",
      role: "editable",
      language: "python",
      content: dispatchReference,
    },
    {
      path: "src/dispatch_service.py",
      role: "editable",
      language: "python",
      content: dispatchServiceReference,
    },
  ],
}
