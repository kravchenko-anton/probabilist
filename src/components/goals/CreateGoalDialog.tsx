import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useGoals } from "@/lib/goals-store"
import { slugify, type Goal, type GoalMetric } from "@/data/goals"
import { quarterOptions } from "@/lib/date"

const OWNER_EMAIL = "antonkzavcenco300@gmail.com"
const EMOJI_OPTIONS = ["🎯", "🚀", "📈", "💡", "🏆", "🔥"]

interface DraftMetric {
  id: string
  name: string
  unit: string
  startValue: string
  targetValue: string
}

function emptyMetric(): DraftMetric {
  return { id: crypto.randomUUID(), name: "", unit: "", startValue: "0", targetValue: "100" }
}

interface CreateGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGoalDialog({ open, onOpenChange }: CreateGoalDialogProps) {
  const { goals, addGoal } = useGoals()
  const navigate = useNavigate()
  const periods = quarterOptions()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [memberInput, setMemberInput] = useState("")
  const [members, setMembers] = useState<string[]>([])
  const [notifyMembers, setNotifyMembers] = useState(true)
  const [periodIndex, setPeriodIndex] = useState(0)
  const [privacy, setPrivacy] = useState<"Public" | "Private">("Public")
  const [metrics, setMetrics] = useState<DraftMetric[]>([emptyMetric()])

  function reset() {
    setTitle("")
    setDescription("")
    setMemberInput("")
    setMembers([])
    setNotifyMembers(true)
    setPeriodIndex(0)
    setPrivacy("Public")
    setMetrics([emptyMetric()])
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function addMember() {
    const value = memberInput.trim()
    if (!value) return
    setMembers((prev) => [...prev, value])
    setMemberInput("")
  }

  function updateMetric(id: string, patch: Partial<DraftMetric>) {
    setMetrics((prev) => prev.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric)))
  }

  function removeMetric(id: string) {
    setMetrics((prev) => prev.filter((metric) => metric.id !== id))
  }

  function uniqueSlug(base: string) {
    let slug = base
    let n = 2
    while (goals.some((goal) => goal.slug === slug)) {
      slug = `${base}-${n}`
      n += 1
    }
    return slug
  }

  function handleSave() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const period = periods[periodIndex]
    const resolvedMetrics: GoalMetric[] = metrics
      .filter((metric) => metric.name.trim())
      .map((metric) => {
        const startValue = Number(metric.startValue) || 0
        const targetValue = Number(metric.targetValue) || 0
        return {
          id: metric.id,
          name: metric.name.trim(),
          unit: metric.unit.trim() || undefined,
          startValue,
          targetValue,
          currentValue: startValue,
        }
      })

    const goal: Goal = {
      id: crypto.randomUUID(),
      slug: uniqueSlug(slugify(trimmedTitle)),
      title: trimmedTitle,
      emoji: EMOJI_OPTIONS[goals.length % EMOJI_OPTIONS.length],
      description: description.trim() || undefined,
      owner: OWNER_EMAIL,
      members,
      notifyMembers,
      timePeriodLabel: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      privacy,
      metrics: resolvedMetrics,
    }

    addGoal(goal)
    handleOpenChange(false)
    navigate(`/goal/${goal.slug}`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new goal</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              Goal title <span className="text-destructive">*</span>
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grow monthly active users"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this goal about?"
              className="min-h-14"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Goal owner</label>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-field px-2.5 py-1.5">
              <Avatar size="sm">
                <AvatarFallback>AN</AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{OWNER_EMAIL}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Members</label>
            <Input
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addMember()
                }
              }}
              placeholder="Name or email"
            />
            {members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {members.map((member) => (
                  <span
                    key={member}
                    className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-foreground"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => setMembers((prev) => prev.filter((m) => m !== member))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={notifyMembers} onCheckedChange={(v) => setNotifyMembers(!!v)} />
              Notify new members about joining this goal
            </label>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Time period</label>
              <Select
                value={String(periodIndex)}
                onValueChange={(v) => setPeriodIndex(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{periods[periodIndex].label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period, index) => (
                    <SelectItem key={period.label} value={String(index)}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Privacy</label>
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as "Public" | "Private")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{privacy}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Metrics</label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setMetrics((prev) => [...prev, emptyMetric()])}
              >
                <Plus size={12} />
                Add metric
              </Button>
            </div>

            {metrics.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No metrics yet. Add one to track progress toward this goal.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {metrics.map((metric) => (
                <div key={metric.id} className="flex items-center gap-1.5">
                  <Input
                    value={metric.name}
                    onChange={(e) => updateMetric(metric.id, { name: e.target.value })}
                    placeholder="Metric name"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={metric.startValue}
                    onChange={(e) => updateMetric(metric.id, { startValue: e.target.value })}
                    placeholder="Start"
                    className="w-16"
                  />
                  <Input
                    type="number"
                    value={metric.targetValue}
                    onChange={(e) => updateMetric(metric.id, { targetValue: e.target.value })}
                    placeholder="Target"
                    className="w-16"
                  />
                  <Input
                    value={metric.unit}
                    onChange={(e) => updateMetric(metric.id, { unit: e.target.value })}
                    placeholder="Unit"
                    className="w-14"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeMetric(metric.id)}
                  >
                    <X size={13} />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Progress is tracked from each metric's start value up to its target value.
            </p>
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Save goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
