# Admin Research Dashboard Specifications
## Technical Implementation Guide

---

## 1. Dashboard Architecture

### 1.1 Route Structure

```
/app/admin/research/
├── page.tsx                    # Main dashboard
├── layout.tsx                  # Admin layout with nav
├── components/
│   ├── OverviewCards.tsx       # KPI summary cards
│   ├── AlgorithmComparison.tsx # SM2 vs FSRS comparison
│   ├── RetentionChart.tsx      # 30-day retention trend
│   ├── UserHeatmap.tsx         # Activity calendar
│   ├── LeechTable.tsx          # Problematic problems
│   ├── StatisticalAnalysis.tsx # P-values, confidence
│   └── ExportControls.tsx      # CSV/JSON export
├── ab-testing/
│   └── page.tsx                # A/B test details
├── users/
│   └── page.tsx                # User-level analytics
├── content/
│   └── page.tsx                # Problem/pattern analytics
└── settings/
    └── page.tsx                # Algorithm parameters
```

### 1.2 Data Flow

```
┌─────────────────────┐
│  Firestore          │
│  - research_events  │
│  - daily_metrics    │
│  - aggregate        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  API Routes         │
│  /api/admin/research│
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  React Components   │
│  + React Query      │
└─────────────────────┘
```

---

## 2. API Endpoints

### 2.1 Overview Endpoint

```typescript
// GET /api/admin/research/overview
// Returns: Real-time dashboard summary

interface OverviewResponse {
  // User Metrics
  total_users: number
  active_users_7d: number
  active_users_30d: number

  // Algorithm Distribution
  algorithm_distribution: {
    sm2: { total: number; active: number; percentage: number }
    fsrs: { total: number; active: number; percentage: number }
  }

  // Performance Summary
  overall_retention_rate: number  // Weighted average
  overall_average_score: number
  total_reviews_30d: number
  total_problems_mastered: number

  // A/B Test Status
  ab_test: {
    status: 'running' | 'concluded' | 'insufficient_data'
    winner: 'sm2' | 'fsrs' | null
    confidence: number | null  // 0-100
    fsrs_advantage: {
      retention: number  // Percentage points
      efficiency: number // Reviews saved
    }
  }

  // Alerts
  alerts: {
    type: 'warning' | 'critical'
    message: string
    metric: string
    value: number
  }[]

  last_updated: string
}
```

**Implementation:**

```typescript
// app/api/admin/research/overview/route.ts
import { getAggregateComparison } from '@/lib/spaced-repetition/research-tracker'
import { adminDb } from '@/lib/firebase-admin'

export async function GET() {
  // Get aggregate comparison
  const aggregate = await getAggregateComparison()

  // Get recent activity from daily metrics
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Calculate overview metrics
  const overview: OverviewResponse = {
    total_users: aggregate?.sm2.total_users + aggregate?.fsrs.total_users || 0,
    active_users_7d: aggregate?.sm2.active_users_7d + aggregate?.fsrs.active_users_7d || 0,
    // ... etc
  }

  return Response.json(overview)
}
```

### 2.2 Comparison Endpoint

```typescript
// GET /api/admin/research/comparison
// Returns: Detailed SM-2 vs FSRS comparison

interface ComparisonResponse {
  sm2: AlgorithmCohortStats
  fsrs: AlgorithmCohortStats

  comparison: {
    retention_rate_difference: number
    average_score_difference: number
    time_to_mastery_difference_days: number
    engagement_difference: number
    interval_efficiency_difference: number
  }

  statistical_analysis: {
    sufficient_sample_size: boolean
    min_sample_per_cohort: number  // 30 recommended
    current_sample: { sm2: number; fsrs: number }

    retention_test: {
      t_statistic: number
      p_value: number
      significant: boolean  // p < 0.05
      effect_size: number   // Cohen's d
    }

    score_test: {
      t_statistic: number
      p_value: number
      significant: boolean
      effect_size: number
    }
  }

  recommendation: {
    winner: 'sm2' | 'fsrs' | 'inconclusive'
    confidence_level: number
    reasoning: string
    action: string
  }
}
```

### 2.3 Trends Endpoint

```typescript
// GET /api/admin/research/trends?range=30d&metric=retention
// Returns: Time-series data for charts

interface TrendsResponse {
  range: '7d' | '30d' | '90d'
  metric: 'retention' | 'score' | 'reviews' | 'mastery'

  data: {
    date: string  // YYYY-MM-DD
    sm2: number
    fsrs: number
    overall: number
  }[]

  summary: {
    sm2_trend: 'improving' | 'declining' | 'stable'
    fsrs_trend: 'improving' | 'declining' | 'stable'
    sm2_slope: number   // Daily change
    fsrs_slope: number
  }
}
```

### 2.4 Leeches Endpoint

```typescript
// GET /api/admin/research/leeches?limit=50
// Returns: Problems with high failure rates

interface LeechesResponse {
  problems: {
    problem_id: string
    title: string
    pattern: string
    difficulty: 'easy' | 'medium' | 'hard'

    // Failure metrics
    total_attempts: number
    lapse_count: number
    lapse_rate: number  // %

    // Performance
    average_score: number
    average_time_minutes: number
    hints_used_average: number

    // By algorithm
    sm2_performance: { attempts: number; lapse_rate: number }
    fsrs_performance: { attempts: number; lapse_rate: number }

    // Action recommendation
    action: 'review_content' | 'add_hints' | 'simplify' | 'split_problem'
  }[]

  summary: {
    total_leeches: number
    worst_pattern: string
    worst_difficulty: 'easy' | 'medium' | 'hard'
  }
}
```

### 2.5 User Analytics Endpoint

```typescript
// GET /api/admin/research/users?sort=retention&order=desc&limit=100
// Returns: User-level analytics

interface UserAnalyticsResponse {
  users: {
    user_id: string
    email: string
    algorithm: 'sm2' | 'fsrs'
    algorithm_overridden: boolean

    // Activity
    total_reviews: number
    days_active: number
    current_streak: number
    last_active: string

    // Performance
    retention_rate: number
    average_score: number
    problems_mastered: number
    problems_struggling: number

    // Efficiency
    reviews_per_mastered: number
    average_time_to_mastery_days: number
  }[]

  filters_applied: {
    algorithm?: 'sm2' | 'fsrs'
    min_reviews?: number
    active_since?: string
  }

  pagination: {
    total: number
    page: number
    limit: number
  }
}
```

---

## 3. Component Specifications

### 3.1 Overview Cards

```tsx
// components/admin/research/OverviewCards.tsx

interface OverviewCardProps {
  title: string
  value: string | number
  change?: number  // +/- percentage
  changeLabel?: string
  status?: 'good' | 'warning' | 'critical'
  icon?: React.ReactNode
}

const cards: OverviewCardProps[] = [
  {
    title: 'Active Users (7d)',
    value: 247,
    change: +12,
    changeLabel: 'vs last week',
    status: 'good'
  },
  {
    title: 'Overall Retention',
    value: '87.3%',
    change: +2.1,
    changeLabel: 'vs last month',
    status: 'good'
  },
  {
    title: 'Algorithm Winner',
    value: 'FSRS',
    changeLabel: '92% confidence',
    status: 'good'
  },
  {
    title: 'Total Reviews (30d)',
    value: '12,847',
    change: +8,
    changeLabel: 'vs last month',
    status: 'good'
  }
]
```

### 3.2 Retention Chart

```tsx
// components/admin/research/RetentionChart.tsx

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts'

interface RetentionChartProps {
  data: {
    date: string
    sm2: number
    fsrs: number
  }[]
  range: '7d' | '30d' | '90d'
}

export function RetentionChart({ data, range }: RetentionChartProps) {
  return (
    <div className="bg-white rounded-lg p-6 shadow">
      <h3 className="text-lg font-semibold mb-4">Retention Rate Trend</h3>
      <LineChart width={800} height={300} data={data}>
        <XAxis dataKey="date" />
        <YAxis domain={[60, 100]} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="sm2"
          stroke="#f59e0b"
          name="SM-2"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="fsrs"
          stroke="#3b82f6"
          name="FSRS"
          strokeWidth={2}
        />
      </LineChart>
    </div>
  )
}
```

### 3.3 Algorithm Comparison Table

```tsx
// components/admin/research/AlgorithmComparison.tsx

interface ComparisonRowProps {
  metric: string
  sm2Value: number | string
  fsrsValue: number | string
  difference: number
  winner: 'sm2' | 'fsrs' | 'tie'
  significant: boolean
}

const comparisonData: ComparisonRowProps[] = [
  {
    metric: 'Retention Rate',
    sm2Value: '84.2%',
    fsrsValue: '88.7%',
    difference: +4.5,
    winner: 'fsrs',
    significant: true
  },
  {
    metric: 'Average Score',
    sm2Value: '72.1',
    fsrsValue: '75.8',
    difference: +3.7,
    winner: 'fsrs',
    significant: true
  },
  {
    metric: 'Time to Mastery',
    sm2Value: '18.2 days',
    fsrsValue: '14.7 days',
    difference: -3.5,  // Negative = faster = better
    winner: 'fsrs',
    significant: true
  },
  {
    metric: 'Reviews/Mastered',
    sm2Value: '6.3',
    fsrsValue: '4.8',
    difference: -1.5,  // Fewer = better
    winner: 'fsrs',
    significant: true
  },
  {
    metric: 'Lapse Rate',
    sm2Value: '12.1%',
    fsrsValue: '8.4%',
    difference: -3.7,  // Lower = better
    winner: 'fsrs',
    significant: true
  }
]
```

### 3.4 Statistical Significance Panel

```tsx
// components/admin/research/StatisticalAnalysis.tsx

interface StatisticalPanelProps {
  retentionPValue: number
  scorePValue: number
  sufficientSample: boolean
  confidenceLevel: number
  effectSize: number  // Cohen's d
}

export function StatisticalPanel(props: StatisticalPanelProps) {
  const significanceLevel = 0.05

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h4 className="font-semibold mb-4">Statistical Validity</h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-600">Sample Size</label>
          <div className={props.sufficientSample ? 'text-green-600' : 'text-yellow-600'}>
            {props.sufficientSample ? '✓ Sufficient' : '⚠ Insufficient'}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Confidence Level</label>
          <div className="text-lg font-bold">
            {props.confidenceLevel}%
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Retention p-value</label>
          <div className={props.retentionPValue < significanceLevel ? 'text-green-600' : 'text-gray-600'}>
            p = {props.retentionPValue.toFixed(4)}
            {props.retentionPValue < significanceLevel && ' (significant)'}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-600">Effect Size (Cohen's d)</label>
          <div>
            {props.effectSize.toFixed(2)}
            <span className="text-sm text-gray-500 ml-2">
              ({props.effectSize < 0.2 ? 'small' :
                props.effectSize < 0.5 ? 'medium' :
                props.effectSize < 0.8 ? 'large' : 'very large'})
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 4. Data Queries

### 4.1 Aggregate Comparison Query

```typescript
// Already implemented in research-tracker.ts
import { getAggregateComparison } from '@/lib/spaced-repetition/research-tracker'

const comparison = await getAggregateComparison()
// Returns: AlgorithmComparisonAggregate | null
```

### 4.2 Daily Metrics Query

```typescript
import { getUserDailyMetrics } from '@/lib/spaced-repetition/research-tracker'

// Get last 30 days for all users (admin)
async function getAllDailyMetrics(startDate: string, endDate: string) {
  const snapshot = await adminDb
    .collectionGroup('daily')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date', 'desc')
    .get()

  return snapshot.docs.map(doc => doc.data() as AlgorithmDailyMetrics)
}
```

### 4.3 Leech Detection Query

```typescript
async function detectLeeches(minAttempts: number = 5, minLapseRate: number = 0.2) {
  // Query all research events
  const events = await adminDb
    .collection('algorithm_research_events')
    .orderBy('timestamp', 'desc')
    .limit(10000)
    .get()

  // Aggregate by problem
  const problemStats = new Map<string, {
    problem_id: string
    attempts: number
    lapses: number
    total_score: number
    title?: string
    pattern?: string
    difficulty?: string
  }>()

  events.docs.forEach(doc => {
    const event = doc.data() as AlgorithmResearchEvent
    const current = problemStats.get(event.problem_id) || {
      problem_id: event.problem_id,
      attempts: 0,
      lapses: 0,
      total_score: 0,
      pattern: event.pattern,
      difficulty: event.difficulty
    }

    current.attempts++
    current.total_score += event.score
    if (event.score < 40) current.lapses++

    problemStats.set(event.problem_id, current)
  })

  // Filter to leeches
  return Array.from(problemStats.values())
    .filter(p => p.attempts >= minAttempts && p.lapses / p.attempts >= minLapseRate)
    .map(p => ({
      ...p,
      lapse_rate: (p.lapses / p.attempts * 100).toFixed(1),
      average_score: Math.round(p.total_score / p.attempts)
    }))
    .sort((a, b) => b.lapses / b.attempts - a.lapses / a.attempts)
}
```

---

## 5. Scheduled Jobs

### 5.1 Daily Aggregate Refresh

```typescript
// scripts/refresh-aggregate.ts
// Run via cron: 0 2 * * * (2 AM daily)

import { generateAggregateComparison } from '@/lib/spaced-repetition/research-tracker'

async function refreshAggregate() {
  console.log('Starting daily aggregate refresh...')

  try {
    const aggregate = await generateAggregateComparison()
    console.log('Aggregate updated:', {
      sm2_users: aggregate.sm2.total_users,
      fsrs_users: aggregate.fsrs.total_users,
      winner: aggregate.comparison.overall_winner,
      confidence: aggregate.comparison.confidence_level
    })
  } catch (error) {
    console.error('Failed to refresh aggregate:', error)
    // Send alert to admin
  }
}

refreshAggregate()
```

### 5.2 Weekly Report Generation

```typescript
// scripts/generate-weekly-report.ts
// Run via cron: 0 8 * * 1 (8 AM every Monday)

interface WeeklyReport {
  week_start: string
  week_end: string

  highlights: {
    total_reviews: number
    new_users: number
    problems_mastered: number
    retention_improvement: number
  }

  algorithm_performance: {
    sm2: { retention: number; score: number; efficiency: number }
    fsrs: { retention: number; score: number; efficiency: number }
  }

  top_performers: { user_id: string; score: number }[]
  struggling_users: { user_id: string; issue: string }[]
  leech_problems: { problem_id: string; lapse_rate: number }[]

  recommendations: string[]
}

async function generateWeeklyReport(): Promise<WeeklyReport> {
  // Implementation
}
```

---

## 6. Access Control

### 6.1 Admin Middleware

```typescript
// middleware/admin.ts

import { auth } from '@/lib/firebase-admin'

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await auth.getUser(userId)
  const customClaims = user.customClaims || {}
  return customClaims.admin === true
}

// In API route:
export async function GET(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.id || !await isAdmin(session.user.id)) {
    return new Response('Unauthorized', { status: 403 })
  }

  // ... admin-only logic
}
```

### 6.2 Admin User List

Store in Firestore or environment:

```typescript
const ADMIN_EMAILS = [
  'admin@mockmate.com',
  'research@mockmate.com'
]
```

---

## 7. Export Functionality

### 7.1 CSV Export

```typescript
// app/api/admin/research/export/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'csv'
  const range = searchParams.get('range') || '30d'

  // Fetch data
  const events = await getRecentEvents(10000)

  if (format === 'csv') {
    const csv = convertToCSV(events)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="research-${range}.csv"`
      }
    })
  }

  return Response.json(events)
}

function convertToCSV(events: AlgorithmResearchEvent[]): string {
  const headers = [
    'timestamp', 'user_id', 'algorithm', 'problem_id', 'pattern',
    'difficulty', 'score', 'mastery_score', 'predicted_retention',
    'actual_retention', 'interval_days', 'time_spent_minutes'
  ]

  const rows = events.map(e => [
    e.timestamp,
    e.user_id,
    e.algorithm,
    e.problem_id,
    e.pattern,
    e.difficulty,
    e.score,
    e.mastery_score,
    e.pre_review.predicted_retention,
    e.actual_retention ? 1 : 0,
    e.post_review.new_interval_days,
    e.time_spent_minutes
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}
```

---

## 8. Alert System

### 8.1 Alert Thresholds

```typescript
interface AlertConfig {
  metric: string
  warning_threshold: number
  critical_threshold: number
  direction: 'above' | 'below'
}

const ALERT_CONFIGS: AlertConfig[] = [
  { metric: 'retention_rate', warning_threshold: 80, critical_threshold: 70, direction: 'below' },
  { metric: 'lapse_rate', warning_threshold: 15, critical_threshold: 25, direction: 'above' },
  { metric: 'daily_active_users', warning_threshold: 50, critical_threshold: 20, direction: 'below' },
  { metric: 'average_score', warning_threshold: 60, critical_threshold: 50, direction: 'below' }
]
```

### 8.2 Alert Checking

```typescript
async function checkAlerts(): Promise<Alert[]> {
  const aggregate = await getAggregateComparison()
  const alerts: Alert[] = []

  // Check retention
  const overallRetention = (aggregate.sm2.average_retention_rate + aggregate.fsrs.average_retention_rate) / 2
  if (overallRetention < 70) {
    alerts.push({
      type: 'critical',
      metric: 'retention_rate',
      value: overallRetention,
      message: `Overall retention dropped to ${overallRetention}%`
    })
  }

  // ... check other metrics

  return alerts
}
```

---

## Summary

This specification provides:

1. **Complete API structure** for the admin research dashboard
2. **Component designs** for visualizations
3. **Data query patterns** for Firestore
4. **Statistical analysis** specifications
5. **Export and alerting** functionality

The existing `research-tracker.ts` provides most of the data collection - this spec focuses on the admin-facing presentation layer.
