/**
 * Company Picker Dialog
 *
 * Shown when user starts a freeball interview session (not from roadmap).
 * Allows user to pick which company they're targeting for RAG context,
 * or "Just Practicing" for generic feedback.
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
import { Building2, Target, Sparkles } from "lucide-react"
import type { CompanyId } from "@/lib/data/company-questions/types"
import { COMPANY_MAP } from "@/lib/data/company-questions"
import type { InterviewTargetCompany } from "@/lib/stores"

interface CompanyPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (company: InterviewTargetCompany) => void
  scenarioCompanies: string[] // Companies tagged on the scenario
}

export function CompanyPicker({ open, onClose, onSelect, scenarioCompanies }: CompanyPickerProps) {
  const [selected, setSelected] = useState<InterviewTargetCompany>(null)

  // Map scenario company strings to CompanyId (if they match)
  const availableCompanies = scenarioCompanies
    .map((c) => c.toLowerCase() as CompanyId)
    .filter((c) => COMPANY_MAP[c])

  const handleConfirm = () => {
    onSelect(selected)
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
