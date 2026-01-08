"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { BookOpen, RefreshCw, Plus, Edit, Trash2, Search, BarChart3, Star, Tag } from "lucide-react"
import { logger } from "@/lib/logger"

interface Problem {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  category: string
  tags: string[]
  pattern: string
  hints: string[]
  active: boolean
  usageCount: number
  avgScore: number
  createdAt: string
}

const difficultyConfig = {
  easy: { color: "bg-green-500/20 text-green-400", label: "Easy" },
  medium: { color: "bg-yellow-500/20 text-yellow-400", label: "Medium" },
  hard: { color: "bg-red-500/20 text-red-400", label: "Hard" },
}

const defaultProblem: {
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  category: string
  tags: string[]
  pattern: string
  hints: string[]
  active: boolean
} = {
  title: "",
  description: "",
  difficulty: "medium",
  category: "algorithms",
  tags: [],
  pattern: "",
  hints: [],
  active: true,
}

export default function ContentPage() {
  const { firebaseUser } = useAuth()
  const [problems, setProblems] = useState<Problem[]>([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    avgUsage: 0,
  })
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
  const [formData, setFormData] = useState(defaultProblem)
  const [tagsInput, setTagsInput] = useState("")
  const [hintsInput, setHintsInput] = useState("")

  const loadProblems = useCallback(
    async (showRefreshing = false) => {
      if (!firebaseUser) return
      if (showRefreshing) setRefreshing(true)

      try {
        const token = await firebaseUser.getIdToken()
        const params = new URLSearchParams()
        if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter)
        if (categoryFilter !== "all") params.set("category", categoryFilter)

        const response = await fetch(`/api/admin/content?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setProblems(data.problems)
            setStats(data.stats)
            setCategories(data.filters?.categories || [])
          }
        }
      } catch (error) {
        logger.error("Error loading content", { error })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser, difficultyFilter, categoryFilter]
  )

  useEffect(() => {
    loadProblems()
  }, [loadProblems])

  const handleOpenCreate = () => {
    setEditingProblem(null)
    setFormData(defaultProblem)
    setTagsInput("")
    setHintsInput("")
    setDialogOpen(true)
  }

  const handleOpenEdit = (problem: Problem) => {
    setEditingProblem(problem)
    setFormData({
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      category: problem.category,
      tags: problem.tags,
      pattern: problem.pattern,
      hints: problem.hints,
      active: problem.active,
    })
    setTagsInput(problem.tags.join(", "))
    setHintsInput(problem.hints.join("\n"))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!firebaseUser) return
    setSaving(true)

    try {
      const token = await firebaseUser.getIdToken()
      const method = editingProblem ? "PUT" : "POST"

      const body = {
        ...(editingProblem ? { id: editingProblem.id } : {}),
        ...formData,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        hints: hintsInput
          .split("\n")
          .map((h) => h.trim())
          .filter(Boolean),
      }

      const response = await fetch("/api/admin/content", {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setDialogOpen(false)
        loadProblems(true)
      }
    } catch (error) {
      logger.error("Error saving problem", { error })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!firebaseUser || !confirm("Delete this problem?")) return

    try {
      const token = await firebaseUser.getIdToken()
      await fetch(`/api/admin/content?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      loadProblems(true)
    } catch (error) {
      logger.error("Error deleting problem", { error })
    }
  }

  const handleToggleActive = async (problem: Problem) => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      await fetch("/api/admin/content", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: problem.id, active: !problem.active }),
      })
      loadProblems(true)
    } catch (error) {
      logger.error("Error toggling problem", { error })
    }
  }

  const filteredProblems = problems.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Content Management</h1>
          <p className="mt-1 text-gray-400">Manage interview problems and scenarios</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadProblems(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Problem
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Total</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-xs text-gray-400">Active</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.easy}</p>
            <p className="text-xs text-gray-400">Easy</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.medium}</p>
            <p className="text-xs text-gray-400">Medium</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.hard}</p>
            <p className="text-xs text-gray-400">Hard</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#00d9ff]">{stats.avgUsage}</p>
            <p className="text-xs text-gray-400">Avg Usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-gray-700 bg-gray-800 pl-10 text-white"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[140px] border-gray-700 bg-gray-800 text-white">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-800">
            <SelectItem value="all" className="text-white">
              All Difficulty
            </SelectItem>
            <SelectItem value="easy" className="text-white">
              Easy
            </SelectItem>
            <SelectItem value="medium" className="text-white">
              Medium
            </SelectItem>
            <SelectItem value="hard" className="text-white">
              Hard
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px] border-gray-700 bg-gray-800 text-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-800">
            <SelectItem value="all" className="text-white">
              All Categories
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-white">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Problems List */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BookOpen className="h-5 w-5 text-[#00d9ff]" />
            Problems ({filteredProblems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProblems.length === 0 ? (
            <p className="py-8 text-center text-gray-400">No problems found</p>
          ) : (
            <div className="space-y-3">
              {filteredProblems.map((problem) => (
                <div
                  key={problem.id}
                  className={`rounded-lg border bg-gray-800/50 p-4 ${
                    problem.active ? "border-gray-700" : "border-gray-800 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-white">{problem.title}</h3>
                        <Badge className={difficultyConfig[problem.difficulty].color}>
                          {difficultyConfig[problem.difficulty].label}
                        </Badge>
                        <Badge className="bg-purple-500/20 text-purple-400">
                          {problem.category}
                        </Badge>
                        {problem.pattern && (
                          <Badge className="bg-blue-500/20 text-blue-400">{problem.pattern}</Badge>
                        )}
                      </div>
                      <p className="mb-2 line-clamp-2 text-sm text-gray-400">
                        {problem.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" /> {problem.usageCount} uses
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" /> {problem.avgScore.toFixed(1)} avg
                        </span>
                        {problem.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {problem.tags.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Switch
                        checked={problem.active}
                        onCheckedChange={() => handleToggleActive(problem)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(problem)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(problem.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-gray-800 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>{editingProblem ? "Edit Problem" : "Add Problem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Problem title"
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Problem description..."
                className="min-h-[100px] border-gray-700 bg-gray-800 text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v: any) => setFormData({ ...formData, difficulty: v })}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800">
                    <SelectItem value="easy" className="text-white">
                      Easy
                    </SelectItem>
                    <SelectItem value="medium" className="text-white">
                      Medium
                    </SelectItem>
                    <SelectItem value="hard" className="text-white">
                      Hard
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="algorithms"
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Pattern</Label>
                <Input
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  placeholder="two-pointers"
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="array, sorting, dp"
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Hints (one per line)</Label>
              <Textarea
                value={hintsInput}
                onChange={(e) => setHintsInput(e.target.value)}
                placeholder="Think about edge cases...&#10;Consider using a hash map..."
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.title || !formData.description}
              className="bg-[#00d9ff] text-black"
            >
              {saving ? "Saving..." : editingProblem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
