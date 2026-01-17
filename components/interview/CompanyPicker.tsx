/**
 * Company Picker Dialog
 *
 * Shown when user starts a freeball interview session (not from roadmap).
 * Allows user to pick which company they're targeting for RAG context,
 * or "Just Practicing" for generic feedback.
 *
 * Also includes "Real Interview Mode" toggle for fuzzy problem statements.
 */

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Target, Sparkles, Clock, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { CompanyId } from "@/lib/data/company-questions/types"
import { COMPANY_MAP } from "@/lib/data/company-questions"
import type { InterviewTargetCompany } from "@/lib/stores"

// Companies with strict time limits (in seconds per question)
const STRICT_TIME_COMPANIES: Record<CompanyId, { seconds: number; reason: string }> = {
  meta: {
    seconds: 25 * 60, // 25 minutes
    reason: "Meta gives 45 minutes for 2 coding questions, so ~22-25 min each. They are strict about time.",
  },
}

interface CompanyPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (company: InterviewTargetCompany, realInterviewMode: boolean, strictTimeLimit: number | null) => void
  scenarioCompanies: string[] // Companies tagged on the scenario
}

export function CompanyPicker({ open, onClose, onSelect, scenarioCompanies }: CompanyPickerProps) {
  const [selected, setSelected] = useState<InterviewTargetCompany>(null)
  const [realInterviewMode, setRealInterviewMode] = useState(false)

  // Map scenario company strings to CompanyId (if they match)
  const availableCompanies = scenarioCompanies
    .map((c) => c.toLowerCase() as CompanyId)
    .filter((c) => COMPANY_MAP[c])

  // Check if selected company has strict time limit
  const strictTimeConfig = selected && selected !== "freeball"
    ? STRICT_TIME_COMPANIES[selected as CompanyId]
    : null

  const handleConfirm = () => {
    const strictTimeLimit = strictTimeConfig?.seconds ?? null
    onSelect(selected, realInterviewMode, strictTimeLimit)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#00d9ff]" />
            Which company are you targeting?
          </DialogTitle>
          <DialogDescription>
            We&apos;ll tailor hints and feedback to match the company&apos;s interview style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Company options from scenario tags */}
          {availableCompanies.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                This question is asked at:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableCompanies.map((companyId) => {
                  const company = COMPANY_MAP[companyId]
                  if (!company) return null
                  const isSelected = selected === companyId
                  return (
                    <Button
                      key={companyId}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`gap-2 ${isSelected ? "bg-[#00d9ff] text-black hover:bg-[#00d9ff]/90" : ""}`}
                      onClick={() => setSelected(companyId)}
                    >
                      <Building2 className="h-4 w-4" />
                      {company.name}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Freeball option */}
          <div className="space-y-2 pt-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Or practice without targeting:
            </p>
            <Button
              variant={selected === "freeball" ? "default" : "outline"}
              size="sm"
              className={`gap-2 ${selected === "freeball" ? "bg-gray-600 hover:bg-gray-600/90" : ""}`}
              onClick={() => setSelected("freeball")}
            >
              <Sparkles className="h-4 w-4" />
              Freeballing (just practicing)
            </Button>
          </div>

          {/* Info about selection */}
          {selected && selected !== "freeball" && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">
                  {COMPANY_MAP[selected as CompanyId]?.name}
                </span>{" "}
                interview style will be applied:
              </p>
              <ul className="text-muted-foreground mt-1 list-inside list-disc text-xs">
                <li>Company-specific hints and follow-ups</li>
                <li>Feedback aligned with their expectations</li>
                <li>Culture and values context in behavioral tips</li>
              </ul>
            </div>
          )}

          {selected === "freeball" && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                You&apos;ll get{" "}
                <span className="text-foreground font-medium">generic feedback</span> without
                company-specific context. Good for general practice!
              </p>
            </div>
          )}

          {/* Real Interview Mode toggle */}
          <div className="border-t pt-4 mt-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="real-interview-mode"
                checked={realInterviewMode}
                onCheckedChange={(checked) => setRealInterviewMode(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label
                  htmlFor="real-interview-mode"
                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                >
                  Real Interview Mode
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Problem given vaguely like in real interviews. You&apos;ll need to ask clarifying questions before coding.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Practice asking clarifying questions like in real interviews
                </p>
              </div>
            </div>
          </div>

          {/* Strict time limit warning for Meta */}
          {strictTimeConfig && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-400" />
                <span className="text-orange-400 font-medium">
                  Strict Time: {Math.floor(strictTimeConfig.seconds / 60)} minutes
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-orange-400/70 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>{strictTimeConfig.reason}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-muted-foreground text-xs mt-1">
                Timer will enforce this company&apos;s time expectations
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/90"
          >
            Start Interview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
