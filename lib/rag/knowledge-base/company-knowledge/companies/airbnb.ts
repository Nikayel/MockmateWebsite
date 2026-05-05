import type { CompanyInterviewKnowledge } from "../../types"

export const airbnbKnowledge: CompanyInterviewKnowledge = {
  companyId: "airbnb",
  companyName: "Airbnb",
  interviewStyle: {
    description:
      "Airbnb interviews emphasize product sense and engineering craft. They look for engineers who can build delightful user experiences with solid technical foundations.",
    pace: "Moderate with emphasis on craft",
    expectations: [
      "Strong product intuition",
      "Clean, maintainable code",
      "User experience focus",
      "Cross-functional collaboration",
      "Full-stack thinking",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 85,
      tips: ["Search and filtering", "Availability calendars", "Booking systems"],
    },
    {
      pattern: "graphs",
      frequency: 80,
      tips: ["Social connections", "Location relationships", "Trust networks"],
    },
    {
      pattern: "intervals",
      frequency: 75,
      tips: ["Booking availability", "Calendar operations", "Date range queries"],
    },
    {
      pattern: "dp-1d",
      frequency: 70,
      tips: ["Pricing optimization", "Search ranking", "Resource allocation"],
    },
    {
      pattern: "string",
      frequency: 65,
      tips: ["Search parsing", "Input validation", "Internationalization"],
    },
  ],
  interviewProcess: [
    "Recruiter screen",
    "Phone screen (coding)",
    "On-site: 5 interviews",
    "Cross-functional + architecture",
    "Core values assessment",
  ],
  cultureTips: [
    "Belong Anywhere - core mission",
    "Design thinking valued",
    "Host and guest perspective",
    "Community-focused",
  ],
  commonQuestionTypes: [
    "Search and ranking",
    "Calendar/booking systems",
    "Review and rating systems",
    "Payment processing",
    "Trust and safety",
  ],
  dosDonts: {
    dos: [
      "Consider both hosts and guests",
      "Think about trust and safety",
      "Design delightful experiences",
      "Show craft in code",
      "Consider global users",
    ],
    donts: [
      "Ignore user experience",
      "Write hacky solutions",
      "Forget about edge cases",
      "Overlook internationalization",
      "Ignore safety concerns",
    ],
  },
}
