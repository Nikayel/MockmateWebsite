import type { CompanyInterviewKnowledge } from "../../types"

export const spotifyKnowledge: CompanyInterviewKnowledge = {
  companyId: "spotify",
  companyName: "Spotify",
  interviewStyle: {
    description:
      "Spotify interviews can reach LeetCode Hard difficulty. System design focuses on music recommendation. Unique case study round tests incident handling. Spotify values (Innovative, Collaborative, Passionate) heavily weighted.",
    pace: "Moderate with depth emphasis",
    expectations: [
      "Coding can be LeetCode Hard",
      "Music recommendation system design",
      "Case study round (unique)",
      "Spotify values assessment",
      "Streaming data problems common",
    ],
  },
  topPatterns: [
    {
      pattern: "heap",
      frequency: 75,
      tips: ["Median from data stream", "Top-K problems", "Priority scheduling"],
    },
    {
      pattern: "graphs",
      frequency: 85,
      tips: ["Artist/song relationships", "Recommendation graphs", "Playlist networks"],
    },
    {
      pattern: "sliding-window",
      frequency: 70,
      tips: ["Sliding window median", "Moving average", "Stream processing"],
    },
    {
      pattern: "trees",
      frequency: 80,
      tips: ["Music categorization", "Search trees", "Playlist hierarchies"],
    },
  ],
  interviewProcess: [
    "OA - LeetCode easy/medium + logic puzzle",
    "Technical screen - coding + project discussion",
    "Coding round (graphs/trees)",
    "System design (music recommendation)",
    "Culture fit + case study",
  ],
  cultureTips: [
    "Innovative - push boundaries",
    "Collaborative - team success matters",
    "Passionate - love what you do",
    "Playful - have fun with work",
    "Sincere - be genuine",
  ],
  commonQuestionTypes: [
    "Find Median from Data Stream",
    "Sliding Window Median",
    "Music Recommendation System Design",
    "Moving Average from Data Stream",
  ],
  dosDonts: {
    dos: [
      "Practice streaming data problems",
      "Know Spotify values deeply",
      "Prepare for case study scenarios",
      "Use STAR method for behavioral",
      "Show passion for music/audio",
    ],
    donts: [
      "Underestimate coding difficulty",
      "Skip case study preparation",
      "Ignore values assessment",
      "Be unfamiliar with recommendation systems",
      "Forget system design for audio",
    ],
  },
}
