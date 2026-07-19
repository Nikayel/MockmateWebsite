// Sealed reference solution (SERVER-ONLY) for an add-functionality scenario.
// The complete fixed files are moved out of the client module so they never ship
// in the browser bundle. No runtime code reads them; the node-side test gates
// apply them over the starter workspace to prove the suite goes green.
import type { SealedLegacyScenario } from "../legacy-registry.server"

if (typeof window !== "undefined") {
  throw new Error("Sealed legacy scenario content must never load in the browser.")
}

const searchServiceReference = `def search_tickets(tickets, query=None, status=None, priority=None):
    normalized_query = (query or "").strip().lower()
    results = []

    for ticket in tickets:
        if status and ticket.get("status") != status:
            continue
        if priority and ticket.get("priority") != priority:
            continue

        haystack = " ".join([
            ticket.get("title", ""),
            ticket.get("body", ""),
            " ".join(ticket.get("tags", [])),
        ]).lower()
        if normalized_query and normalized_query not in haystack:
            continue

        score = 0
        if normalized_query:
            if normalized_query in ticket.get("title", "").lower():
                score += 5
            if normalized_query in " ".join(ticket.get("tags", [])).lower():
                score += 3
            if normalized_query in ticket.get("body", "").lower():
                score += 1
        score += {"urgent": 3, "high": 2, "normal": 1, "low": 0}.get(ticket.get("priority"), 0)
        results.append({**ticket, "score": score})

    return sorted(results, key=lambda ticket: (-ticket["score"], ticket["id"]))
`

const apiReference = `from src.repository import list_tickets
from src.search_service import search_tickets

def handle_ticket_search(params):
    results = search_tickets(
        list_tickets(),
        query=params.get("query"),
        status=params.get("status"),
        priority=params.get("priority"),
    )
    return {
        "tickets": [
            {
                "id": ticket["id"],
                "title": ticket["title"],
                "status": ticket["status"],
                "priority": ticket["priority"],
                "score": ticket["score"],
            }
            for ticket in results
        ]
    }
`

export const sealed: SealedLegacyScenario = {
  id: "add-feature-support-ticket-search",
  referenceFiles: [
    {
      path: "src/search_service.py",
      role: "editable",
      language: "python",
      content: searchServiceReference,
    },
    {
      path: "src/api.py",
      role: "editable",
      language: "python",
      content: apiReference,
    },
  ],
}
