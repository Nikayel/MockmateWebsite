import type { CompanyInterviewKnowledge } from "../../types"

export const robloxKnowledge: CompanyInterviewKnowledge = {
  companyId: "roblox",
  companyName: "Roblox",
  interviewStyle: {
    description:
      "Roblox interviews focus on practical game development problems and clean code. Questions are often placed in 3D simulation and multiplayer game context. They prioritize readable, maintainable code over clever solutions.",
    pace: "Moderate pace with emphasis on code quality",
    expectations: [
      "Clean, readable code is paramount",
      "Test cases and compilation required",
      "Game simulation context for problems",
      "Recursion and state management focus",
      "C++, Luau, or systems-level languages preferred",
    ],
  },
  topPatterns: [
    {
      pattern: "arrays-hashing",
      frequency: 90,
      tips: ["Event queue management", "Player data lookups", "State caching"],
    },
    {
      pattern: "string",
      frequency: 85,
      tips: ["Serialization problems", "Game state encoding", "Protocol handling"],
    },
    {
      pattern: "dp-1d",
      frequency: 75,
      tips: ["Resource optimization", "Path finding variants", "Game progression"],
    },
    {
      pattern: "graphs",
      frequency: 70,
      tips: ["Player matching", "World connectivity", "Social network features"],
    },
  ],
  interviewProcess: [
    "Recruiter call + CodeSignal assessment",
    "Technical coding round (LeetCode medium, recursion focus)",
    "Practical coding (game simulation problems)",
    "Culture fit + technical discussion",
  ],
  cultureTips: [
    "Show passion for games and virtual worlds",
    "Understand UGC (user-generated content) platforms",
    "Clean coding practices are essential",
    "Interest in metaverse and social gaming",
    "Community-first mindset",
  ],
  commonQuestionTypes: [
    "Player skill-based matching/pairing",
    "Object pooling (bullets, NPCs)",
    "Event queue simulation",
    "Serialize/deserialize game state",
    "State management problems",
  ],
  dosDonts: {
    dos: [
      "Write clean, readable code",
      "Compile and test your code",
      "Explain your game-related context",
      "Show understanding of real-time systems",
      "Demonstrate recursion mastery",
    ],
    donts: [
      "Write clever but unreadable code",
      "Skip test cases",
      "Ignore edge cases in simulation",
      "Forget about state management",
      "Overlook performance in real-time context",
    ],
  },
}
