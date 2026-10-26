import type { User as FirebaseUser } from "firebase/auth"
import type { Scenario } from "@/lib/scenarios"
import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import type { EditorLanguage } from "../../_utils/language"
import type {
  ChatMessage,
  ConsoleLogEntry,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../../_types"

export interface UseInterviewAutosaveOptions {
  // Gating / identity
  isInterviewStarted: boolean
  selectedScenario: Scenario | null
  firebaseUser: FirebaseUser | null
  isGuestMode: boolean
  guestId: string | null
  currentSessionId: string | null

  // Session payload reads
  code: string
  chatMessages: ChatMessage[]
  interviewerMessages: ChatMessage[]
  selectedLanguage: EditorLanguage
  elapsedTime: number
  testResults: TestResult[]
  testSummary: TestSummary
  workspaceContext: WorkspaceContextFile[]
  activeWorkspacePath: string | null
  consoleLogs: ConsoleLogEntry[]
  bugfixEvidenceEvents: BugfixEvidenceEvent[]
  showPostInterviewDiscussion: boolean

  // Read-but-omitted from deps (see dep array below)
  realInterviewMode: boolean
  strictTimeLimit: number | null
  interviewerInput?: string
  chatInput?: string
  canCheckpoint?: boolean
  ownerId?: string
  testRunRevision?: string | null
  strictDeadlineAt?: number | null
  paused?: boolean
}
