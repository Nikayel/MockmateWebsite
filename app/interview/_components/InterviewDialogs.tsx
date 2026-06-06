"use client"

import { memo } from "react"
import nextDynamic from "next/dynamic"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Scenario } from "@/lib/scenarios"
import type { InterviewTargetCompany } from "@/lib/stores"
import type { WorkspaceContextFile } from "../_types"

const CodeViewerSidePanel = nextDynamic(
  () =>
    import("@/components/CodeViewerSidePanel").then((mod) => ({
      default: mod.CodeViewerSidePanel,
    })),
  { ssr: false }
)

const CompanyPicker = nextDynamic(
  () => import("@/components/interview").then((mod) => ({ default: mod.CompanyPicker })),
  { ssr: false }
)

interface InterviewDialogsProps {
  selectedFile: WorkspaceContextFile | null
  isCodeViewerOpen: boolean
  onCodeViewerOpenChange: (open: boolean) => void
  onSelectedFileChange: (file: WorkspaceContextFile | null) => void
  selectedScenario: Scenario | null
  showCompanyPicker: boolean
  onCompanyPickerOpenChange: (open: boolean) => void
  lockedCompanyForPicker: InterviewTargetCompany
  onLockedCompanyChange: (company: InterviewTargetCompany) => void
  onCompanySelected: (
    company: InterviewTargetCompany,
    realInterviewMode: boolean,
    strictTimeLimit: number | null
  ) => void
  showCloseDialog: boolean
  onShowCloseDialogChange: (open: boolean) => void
  onCloseInterview: () => void
}

export const InterviewDialogs = memo(function InterviewDialogs({
  selectedFile,
  isCodeViewerOpen,
  onCodeViewerOpenChange,
  onSelectedFileChange,
  selectedScenario,
  showCompanyPicker,
  onCompanyPickerOpenChange,
  lockedCompanyForPicker,
  onLockedCompanyChange,
  onCompanySelected,
  showCloseDialog,
  onShowCloseDialogChange,
  onCloseInterview,
}: InterviewDialogsProps) {
  return (
    <>
      {isCodeViewerOpen && selectedFile && (
        <CodeViewerSidePanel
          key={selectedFile.path}
          isOpen={true}
          onClose={() => {
            onCodeViewerOpenChange(false)
            onSelectedFileChange(null)
          }}
          fileName={selectedFile.path}
          content={selectedFile.content}
        />
      )}

      {selectedScenario && (
        <CompanyPicker
          open={showCompanyPicker}
          onClose={() => {
            onCompanyPickerOpenChange(false)
            onLockedCompanyChange(null)
          }}
          onSelect={(company, realInterviewMode, strictTimeLimit) => {
            onCompanyPickerOpenChange(false)
            onLockedCompanyChange(null)
            onCompanySelected(company, realInterviewMode, strictTimeLimit)
          }}
          scenarioCompanies={selectedScenario.companies || []}
          hasFuzzyMode={!!(selectedScenario as { fuzzyStatement?: string }).fuzzyStatement}
          lockedCompany={lockedCompanyForPicker}
        />
      )}

      <AlertDialog open={showCloseDialog} onOpenChange={onShowCloseDialogChange}>
        <AlertDialogContent className="border-gray-700 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              You want to close this interview?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              If you close now, your progress will be saved but you'll exit the interview session.
              You can always come back to continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onShowCloseDialogChange(false)
                onCloseInterview()
              }}
              className="bg-[#00d9ff] text-white hover:bg-[#00d9ff]/80"
            >
              Close Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
