'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  HelpCircle,
  Lightbulb,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { PersonalizedRoadmap } from '@/lib/data/company-questions/types'

type RAGEnhancements = NonNullable<PersonalizedRoadmap['ragEnhancements']>

interface RAGExplanationModalProps {
  isOpen: boolean
  onClose: () => void
  ragEnhancements: RAGEnhancements
  companyName?: string
}

export function RAGExplanationModal({
  isOpen,
  onClose,
  ragEnhancements,
  companyName,
}: RAGExplanationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-accent/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI-Powered Selection</h3>
                  <p className="text-xs text-muted-foreground">Why these questions were chosen for you</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Company-Specific Tips */}
              {(ragEnhancements.companyTips?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    {companyName ? `${companyName} Interview Tips` : 'Company Interview Tips'}
                  </div>
                  <ul className="space-y-1.5 pl-6">
                    {(ragEnhancements.companyTips?.slice(0, 4) || []).map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground list-disc">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pattern Insights */}
              {(ragEnhancements.patternInsights?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Pattern Focus for Today
                  </div>
                  <div className="space-y-2">
                    {(ragEnhancements.patternInsights?.slice(0, 3) || []).map((insight, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground capitalize">
                            {insight.pattern.replace(/-/g, ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {insight.companyFrequency}% frequency
                          </span>
                        </div>
                        {insight.suggestedApproach && (
                          <p className="text-xs text-muted-foreground">{insight.suggestedApproach}</p>
                        )}
                        {insight.tips.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {insight.tips.slice(0, 2).map((tip, j) => (
                              <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary mt-1">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalized Advice */}
              {(ragEnhancements.personalizedAdvice?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Personalized for You
                  </div>
                  <ul className="space-y-1.5 pl-6">
                    {(ragEnhancements.personalizedAdvice?.slice(0, 3) || []).map((advice, i) => (
                      <li key={i} className="text-sm text-muted-foreground list-disc">
                        {advice}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Study Strategies */}
              {(ragEnhancements.studyStrategies?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Target className="h-4 w-4 text-purple-500" />
                    Recommended Strategies
                  </div>
                  <div className="space-y-2">
                    {(ragEnhancements.studyStrategies?.slice(0, 2) || []).map((strategy, i) => (
                      <div key={i} className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                        <p className="text-sm font-medium text-foreground">{strategy.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{strategy.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adaptive Adjustments */}
              {(ragEnhancements.adaptiveAdjustments?.length ?? 0) > 0 && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Adaptive Adjustments Made
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ragEnhancements.adaptiveAdjustments?.[0]?.description}
                    {ragEnhancements.adaptiveAdjustments?.[0]?.reason && (
                      <span className="italic"> — {ragEnhancements.adaptiveAdjustments[0]?.reason}</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Questions are selected using our AI-powered RAG system based on your target company, experience level, and progress.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
