# Admin Pages Refactoring Guide

This guide documents the refactoring pattern for admin pages, demonstrating how to use shared components and utilities to reduce code duplication and improve maintainability.

## Overview

The refactoring reduces admin page sizes by 30-40% while maintaining all functionality by:
- Using shared layout components
- Extracting data fetching logic to custom hooks
- Using reusable table and card components
- Centralizing API client utilities

## Files Created

### Shared Infrastructure

1. **`lib/admin/api-client.ts`** (~230 lines)
   - `AdminApiClient` - Type-safe API client with auth
   - `loadAdminData()` - Simplified data loading
   - `executeAdminAction()` - Execute admin actions (migrate, backfill, etc.)
   - `buildQueryString()` - Query param builder
   - Format utilities: `formatCurrency()`, `formatTokens()`, `formatPercent()`, etc.
   - `exportToCSV()` - CSV export functionality

2. **`lib/admin/index.ts`**
   - Central exports for admin utilities

### Shared Components

Located in `components/admin/shared/`:

1. **`AdminLayout.tsx`** (~150 lines)
   - `AdminLayout` - Common page layout with header, loading, error states
   - `AdminSection` - Section wrapper with title
   - `TimeRangeSelector` - Time range selector (7d, 30d, 90d, all)

2. **`StatCard.tsx`** (~120 lines)
   - `StatCard` - Small stat display for grids
   - `MetricCard` - Larger metric card with description
   - `ComparisonCard` - Side-by-side comparison card

3. **`DataTable.tsx`** (~250 lines)
   - `DataTable` - Full-featured data table with:
     - Search
     - Sorting
     - Pagination
     - Custom renderers
     - Loading/empty states
   - `renderBadge()` - Badge rendering helper

4. **`ExportButton.tsx`** (~80 lines)
   - `ExportButton` - CSV export button
   - `ExportMenu` - Multiple export options

5. **`index.ts`**
   - Component exports

## Refactoring Pattern

### Step 1: Create a Custom Hook

Extract data fetching logic to a custom hook in `lib/hooks/`:

```typescript
// lib/hooks/useYourPageData.ts
import { useState, useEffect, useCallback } from "react"
import { User } from "firebase/auth"
import { loadAdminData, executeAdminAction } from "@/lib/admin"

interface YourData {
  // Define your data structure
}

interface UseYourDataReturn {
  data: YourData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  loadData: (forceRefresh?: boolean) => Promise<void>
  // Add other actions
}

export function useYourPageData(firebaseUser: User | null): UseYourDataReturn {
  const [data, setData] = useState<YourData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!firebaseUser) return

    if (forceRefresh) setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const url = `/api/admin/your-endpoint${forceRefresh ? '?refresh=true' : ''}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to load data')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    refreshing,
    error,
    loadData,
  }
}
```

### Step 2: Refactor the Page Component

```typescript
"use client"

import { useAuth } from "@/lib/auth-context"
import { AdminLayout, DataTable, Column } from "@/components/admin/shared"
import { useYourPageData } from "@/lib/hooks/useYourPageData"

export default function YourAdminPage() {
  const { firebaseUser } = useAuth()
  const { data, loading, refreshing, error, loadData } = useYourPageData(firebaseUser)

  // Define table columns
  const columns: Column<YourDataType>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    // ... more columns
  ]

  return (
    <AdminLayout
      title="Your Page Title"
      description="Your page description"
      loading={loading}
      error={error}
      onRefresh={() => loadData(true)}
      refreshing={refreshing}
    >
      {/* Your page content */}
      <DataTable
        title="Your Data"
        data={data?.items || []}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    </AdminLayout>
  )
}
```

### Step 3: Use Shared Components

Replace repetitive patterns with shared components:

#### Before (Loading State)
```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
    </div>
  )
}
```

#### After (AdminLayout handles it)
```typescript
return (
  <AdminLayout loading={loading}>
    {/* content */}
  </AdminLayout>
)
```

#### Before (Manual Table)
```typescript
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-gray-800">
      <th className="text-left py-2 px-3">Name</th>
      {/* ... */}
    </tr>
  </thead>
  <tbody>
    {data.map((item) => (
      <tr key={item.id}>
        <td className="py-2 px-3">{item.name}</td>
        {/* ... */}
      </tr>
    ))}
  </tbody>
</table>
```

#### After (DataTable)
```typescript
<DataTable
  data={data}
  columns={[
    { key: "name", label: "Name" },
    // ...
  ]}
  keyExtractor={(item) => item.id}
/>
```

## Real Example: Research Page Refactoring

### Before: 830 lines
- Manual loading state
- Manual error handling
- Inline data fetching
- Repetitive table markup

### After: 505 lines (39% reduction)

**Changes made:**

1. Created `lib/hooks/useResearchData.ts` (150 lines)
   - Extracted all data fetching logic
   - Handles loading, error, and refreshing states
   - Provides actions (migrate, backfill)

2. Used `AdminLayout` component
   - Replaced manual loading/error UI
   - Centralized header with refresh button
   - Added custom actions (migrate, backfill buttons)

3. Used `DataTable` component
   - Replaced manual table markup (60+ lines → 10 lines)
   - Added built-in search, sort, pagination support
   - Consistent styling

4. Kept page-specific components
   - `AlgorithmCard` - Unique to research page
   - `WinnerBanner` - Research-specific
   - `MetricComparisonCard` - Research-specific

## Applying to Other Admin Pages

### AI Usage Page (`app/admin/ai-usage/page.tsx` - 772 lines)

Opportunities:
- Create `useAIUsageData` hook
- Use `DataTable` for top users table
- Use `MetricCard` from `components/admin/charts`
- Use `AdminLayout` for consistent structure

**Estimated reduction: 300-350 lines → ~420 lines**

### Users Page (`app/admin/users/page.tsx` - 533 lines)

Opportunities:
- Create `useUsersData` hook
- Already uses some shared components
- Can use `DataTable` for user list
- Use `AdminLayout`

**Estimated reduction: 150-200 lines → ~350 lines**

### Revenue Page (`app/admin/revenue/page.tsx` - 495 lines)

Opportunities:
- Create `useRevenueData` hook
- Use `DataTable` for payments table
- Use `TimeRangeSelector` component
- Use `AdminLayout`

**Estimated reduction: 150-180 lines → ~330 lines**

## Benefits

1. **Consistency**: All admin pages follow the same patterns
2. **Maintainability**: Fix bugs in one place, benefit everywhere
3. **Type Safety**: Shared TypeScript types and interfaces
4. **Reduced Duplication**: No more copy-paste of loading states, tables, etc.
5. **Faster Development**: New admin pages can be built quickly

## Migration Checklist

For each admin page:

- [ ] Create custom hook in `lib/hooks/use{Page}Data.ts`
- [ ] Extract data fetching logic to hook
- [ ] Replace manual loading/error UI with `AdminLayout`
- [ ] Replace manual tables with `DataTable`
- [ ] Use `TimeRangeSelector` if page has time ranges
- [ ] Replace stat cards with shared `MetricCard` or `StatCard`
- [ ] Test all functionality (loading, error, refresh, actions)
- [ ] Verify pagination, search, and sorting work
- [ ] Check mobile responsiveness

## Notes

- Admin pages are internal tools (lower risk)
- Focus on maintainability over perfection
- Keep page-specific components if they're unique
- Don't over-abstract - balance between DRY and readability
