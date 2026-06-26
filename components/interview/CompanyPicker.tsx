/**
 * Company Picker Dialog
 *
 * Shown when user starts a freeball interview session (not from roadmap).
 * Allows user to pick which company they're targeting for RAG context,
 * or "Just Practicing" for generic feedback.
 *
 * Also includes "Real Interview Mode" toggle for fuzzy problem statements.
 *
 * When `lockedCompany` is provided (e.g., from roadmap), the company is pre-selected
 * and locked, and the dialog focuses on the fuzzy mode choice.
 */

"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Target, Sparkles, Clock, Info, Lock, MessageSquareMore } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CompanyId } from "@/lib/data/company-questions/types"
import { COMPANY_MAP } from "@/lib/data/company-questions"
import type { InterviewTargetCompany } from "@/lib/stores"
import { getStrictTimeConfig } from "@/lib/interview/company-time-limits"

interface CompanyPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (
    company: InterviewTargetCompany,
    realInterviewMode: boolean,
    strictTimeLimit: number | null
  ) => void
  scenarioCompanies: string[] // Companies tagged on the scenario
  hasFuzzyMode?: boolean // Whether the scenario has fuzzy statement data
  lockedCompany?: InterviewTargetCompany // Pre-selected company (e.g., from roadmap) - locks selection
}

export function CompanyPicker({
  open,
  onClose,
  onSelect,
  scenarioCompanies,
  hasFuzzyMode = false,
  lockedCompany,
}: CompanyPickerProps) {
  const [selected, setSelected] = useState<InterviewTargetCompany>(lockedCompany ?? null)
  const [realInterviewMode, setRealInterviewMode] = useState(false)

  // Sync selected state when lockedCompany changes
  useEffect(() => {
    if (lockedCompany) {
      setSelected(lockedCompany)
    }
  }, [lockedCompany])

  const isLocked = !!lockedCompany

  // Map scenario company strings to CompanyId (if they match)
  const availableCompanies = scenarioCompanies
    .map((c) => c.toLowerCase() as CompanyId)
    .filter((c) => COMPANY_MAP[c])

  // Check if selected company has strict time limit (uses shared config)
  const strictTimeConfig =
    selected && selected !== "freeball" ? getStrictTimeConfig(selected as CompanyId) : null

  const handleConfirm = () => {
    const strictTimeLimit = strictTimeConfig?.seconds ?? null
    onSelect(selected, realInterviewMode, strictTimeLimit)
    onClose()
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isLocked ? (
                <>
                  <MessageSquareMore className="h-5 w-5 text-[#c4703f]" />
                  Real Interview Mode Available
                </>
              ) : (
                <>
                  <Target className="h-5 w-5 text-[#c4703f]" />
                  Which company are you targeting?
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isLocked
                ? "This question supports a more realistic interview experience."
                : "We'll tailor hints and feedback to match the company's interview style."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Locked company display (from roadmap) */}
            {isLocked && selected && selected !== "freeball" && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Targeting (from your roadmap):
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="cursor-default gap-2 bg-[#c4703f] text-white hover:bg-[#c4703f]"
                    disabled
                  >
                    <Building2 className="h-4 w-4" />
                    {COMPANY_MAP[selected as CompanyId]?.name || selected}
                    <Lock className="h-3 w-3 opacity-60" />
                  </Button>
                </div>
              </div>
            )}

            {/* Locked freeball display */}
            {isLocked && selected === "freeball" && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Practice mode (from your roadmap):
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="cursor-default gap-2 bg-muted hover:bg-muted"
                  disabled
                >
                  <Sparkles className="h-4 w-4" />
                  General Practice
                  <Lock className="h-3 w-3 opacity-60" />
                </Button>
              </div>
            )}

            {/* Company options from scenario tags (only when not locked) */}
            {!isLocked && availableCompanies.length > 0 && (
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
                        className={`gap-2 ${isSelected ? "bg-[#c4703f] text-white hover:bg-[#c4703f]/90" : ""}`}
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

            {/* Freeball option (only when not locked) */}
            {!isLocked && (
              <div className="space-y-2 pt-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Or practice without targeting:
                </p>
                <Button
                  variant={selected === "freeball" ? "default" : "outline"}
                  size="sm"
                  className={`gap-2 ${selected === "freeball" ? "bg-muted hover:bg-muted/90" : ""}`}
                  onClick={() => setSelected("freeball")}
                >
                  <Sparkles className="h-4 w-4" />
                  Freeballing (just practicing)
                </Button>
              </div>
            )}

            {/* Info about selection (only when not locked) */}
            {!isLocked && selected && selected !== "freeball" && (
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

            {!isLocked && selected === "freeball" && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  You&apos;ll get{" "}
                  <span className="text-foreground font-medium">generic feedback</span> without
                  company-specific context. Good for general practice!
                </p>
              </div>
            )}

            {/* Real Interview Mode toggle - only show if scenario has fuzzy mode */}
            {hasFuzzyMode && (
              <div className="mt-2 border-t pt-4">
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
                      className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                    >
                      Real Interview Mode
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="text-muted-foreground h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>
                            Problem given vaguely like in real interviews. You&apos;ll need to ask
                            clarifying questions before coding.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Practice asking clarifying questions like in real interviews
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Strict time limit warning for Meta */}
            {strictTimeConfig && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <span className="font-medium text-orange-400">
                    Strict Time: {Math.floor(strictTimeConfig.seconds / 60)} minutes
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help text-orange-400/70" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>{strictTimeConfig.reason}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Timer will enforce this company&apos;s time expectations
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {isLocked ? "Skip" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selected}
              className="bg-[#c4703f] text-white hover:bg-[#c4703f]/90"
            >
              {isLocked && realInterviewMode ? "Start Real Interview" : "Start Interview"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
