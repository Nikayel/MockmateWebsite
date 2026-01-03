'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Archive,
  Trophy,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Calendar,
  Target,
  PartyPopper,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type RoadmapStatusType = 'expired' | 'archived' | 'completed' | 'abandoned'

interface RoadmapStatusBannerProps {
  type: RoadmapStatusType
  roadmap: {
    companyName: string
    questionsCompleted: number
    totalQuestions: number
    actualHoursSpent: number
    interviewDate: Date
    patternCoverage?: any[]
  }
  onCreateNew: () => void
  onArchive?: () => void
  onReactivate?: () => void
  isArchiving?: boolean
  className?: string
}

const statusConfig = {
  expired: {
    icon: Clock,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/5',
    title: 'Interview Date Passed',
    expandedTitle: 'Your interview date has passed',
  },
  archived: {
    icon: Archive,
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-slate-500 dark:text-slate-400',
    borderColor: 'border-slate-500/30',
    bgColor: 'bg-slate-500/5',
    title: 'Roadmap Archived',
    expandedTitle: 'This roadmap was ended early',
  },
  completed: {
    icon: Trophy,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/5',
    title: 'Roadmap Completed!',
    expandedTitle: 'Congratulations! You completed all questions',
  },
  abandoned: {
    icon: XCircle,
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-slate-500 dark:text-slate-400',
    borderColor: 'border-slate-500/30',
    bgColor: 'bg-slate-500/5',
    title: 'Roadmap Replaced',
    expandedTitle: 'This roadmap was replaced by a new one',
  },
}

export function RoadmapStatusBanner({
  type,
  roadmap,
  onCreateNew,
  onArchive,
  onReactivate,
  isArchiving = false,
  className,
}: RoadmapStatusBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = statusConfig[type]
  const Icon = config.icon

  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)
  const interviewDate = new Date(roadmap.interviewDate)
  const now = new Date()
  const daysUntil = Math.ceil((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysUntil < 0
  const canReactivate = (type === 'archived' || type === 'abandoned') && !isExpired

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'border rounded-xl overflow-hidden transition-all',
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.iconBg)}>
            <Icon className={cn('h-4 w-4', config.iconColor)} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">{config.title}</span>
              {type === 'completed' && (
                <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {roadmap.companyName} • {progress}% complete
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick action buttons - visible in collapsed state */}
          <div className="hidden sm:flex items-center gap-2">
            {type === 'expired' && onArchive && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive()
                }}
                disabled={isArchiving}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </button>
            )}
            {canReactivate && onReactivate && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onReactivate()
                }}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
              >
                <RefreshCw className="h-3 w-3 inline mr-1" />
                Resume
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateNew()
              }}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3 w-3 inline mr-1" />
              New
            </button>
          </div>

          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50">
              {/* Status-specific message */}
              <p className="text-sm text-muted-foreground mb-4">
                {type === 'expired' && (
                  <>
                    Your interview was on{' '}
                    <span className="font-medium text-foreground">
                      {interviewDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    . Archive this roadmap to clear it, or create a new one.
                  </>
                )}
                {type === 'archived' && (
                  <>
                    This roadmap was ended early.
                    {canReactivate && ' You can resume it since the interview date hasn\'t passed yet.'}
                  </>
                )}
                {type === 'completed' && (
                  <>
                    Amazing work! You've completed all {roadmap.totalQuestions} questions.
                    {daysUntil > 0 && ` ${daysUntil} days until your interview.`}
                  </>
                )}
                {type === 'abandoned' && (
                  <>
                    This roadmap was replaced when you created a new one.
                    {canReactivate && ' You can still resume it.'}
                  </>
                )}
              </p>

              {/* Progress Stats - Compact Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p className={cn(
                    "text-lg font-bold",
                    type === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                  )}>
                    {progress}%
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completed</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-foreground">{roadmap.questionsCompleted}/{roadmap.totalQuestions}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Questions</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-foreground">{Math.round(roadmap.actualHoursSpent || 0)}h</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Studied</p>
                </div>
              </div>

              {/* Interview Date Info */}
              {type !== 'completed' && (
                <div className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg mb-4 text-xs",
                  isExpired
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-muted/50 text-muted-foreground"
                )}>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Interview: {interviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {isExpired ? ' (passed)' : ` (${daysUntil} days)`}
                  </span>
                </div>
              )}

              {/* Completed celebration */}
              {type === 'completed' && daysUntil > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg mb-4 bg-primary/5 border border-primary/20 text-xs text-primary">
                  <PartyPopper className="h-3.5 w-3.5" />
                  <span>{daysUntil} days to polish your skills before the interview!</span>
                </div>
              )}

              {/* Action Buttons - Mobile friendly */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onCreateNew}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create New Roadmap
                </button>

                {type === 'expired' && onArchive && (
                  <button
                    onClick={onArchive}
                    disabled={isArchiving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Archive className="h-4 w-4" />
                    {isArchiving ? 'Archiving...' : 'Archive & Clear'}
                  </button>
                )}

                {canReactivate && onReactivate && (
                  <button
                    onClick={onReactivate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Resume Roadmap
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Compact archived roadmaps list - shows as small cards/badges
 * For displaying multiple archived roadmaps without taking up space
 */
interface ArchivedRoadmapItemProps {
  roadmap: {
    id: string
    companyName: string
    status: 'archived' | 'completed' | 'abandoned'
    questionsCompleted: number
    totalQuestions: number
    interviewDate: Date
  }
  onReactivate?: (id: string) => void
  isReactivating?: boolean
}

export function ArchivedRoadmapItem({
  roadmap,
  onReactivate,
  isReactivating = false,
}: ArchivedRoadmapItemProps) {
  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)
  const interviewDate = new Date(roadmap.interviewDate)
  const isExpired = interviewDate < new Date()
  const canReactivate = !isExpired && roadmap.status !== 'completed'

  const getStatusIcon = () => {
    switch (roadmap.status) {
      case 'completed':
        return <Trophy className="h-3 w-3 text-green-600" />
      case 'archived':
        return <Archive className="h-3 w-3 text-slate-500" />
      case 'abandoned':
        return <XCircle className="h-3 w-3 text-slate-500" />
      default:
        return <Target className="h-3 w-3 text-slate-500" />
    }
  }

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
          Expired
        </span>
      )
    }
    switch (roadmap.status) {
      case 'completed':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
            Completed
          </span>
        )
      case 'archived':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded">
            Archived
          </span>
        )
      case 'abandoned':
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded">
            Replaced
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
          {getStatusIcon()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">{roadmap.companyName}</span>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{progress}% complete</span>
            <span>•</span>
            <span>{roadmap.questionsCompleted}/{roadmap.totalQuestions}</span>
          </div>
        </div>
      </div>

      {canReactivate && onReactivate && (
        <button
          onClick={() => onReactivate(roadmap.id)}
          disabled={isReactivating}
          className="shrink-0 px-2.5 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isReactivating ? (
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Resume
            </span>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * Collapsible list of archived roadmaps
 * Shows a count, expands to show items
 */
interface ArchivedRoadmapsListProps {
  roadmaps: Array<{
    id: string
    companyName: string
    status: 'archived' | 'completed' | 'abandoned'
    questionsCompleted: number
    totalQuestions: number
    interviewDate: Date
  }>
  onReactivate?: (id: string) => void
  reactivatingId?: string | null
}

export function ArchivedRoadmapsList({
  roadmaps,
  onReactivate,
  reactivatingId,
}: ArchivedRoadmapsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (roadmaps.length === 0) return null

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">Archived Roadmaps</span>
          <span className="text-muted-foreground">({roadmaps.length})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2 bg-background">
              {roadmaps.map((roadmap) => (
                <ArchivedRoadmapItem
                  key={roadmap.id}
                  roadmap={roadmap}
                  onReactivate={onReactivate}
                  isReactivating={reactivatingId === roadmap.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
