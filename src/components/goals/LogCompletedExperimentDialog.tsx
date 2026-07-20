import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Emoji } from "@/components/ui/emoji";
import { Input } from "@/components/ui/input";
import { formatMetricValue } from "@/components/ui/metric-range";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  Attempt,
  AttemptResult,
  AttemptTask,
  Retrospective,
} from "@/data/attempts";
import { metricAggregation, type Goal } from "@/data/goals";
import { formatShortDate, startOfDay } from "@/lib/date";
import { useGoals } from "@/lib/goals-store";
import { metricColor } from "@/lib/metric-colors";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

const ICONS = ["🧪", "🚀", "🎬", "✍️", "📣", "🔧"];

const RETRO_FIELDS: {
  key: keyof Retrospective;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "happened",
    label: "What happened?",
    placeholder: "How did this experiment actually go?",
  },
  {
    key: "learned",
    label: "What did you learn & will try next time?",
    placeholder:
      "Insights from this try, and what you'll change on the next one",
  },
  {
    key: "futureNote",
    label: "One line for future you",
    placeholder: "The one thing future you should remember",
  },
];

interface LogCompletedExperimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  onCreated?: (attempt: Attempt) => void;
}

export function LogCompletedExperimentDialog({
  open,
  onOpenChange,
  goal,
  onCreated,
}: LogCompletedExperimentDialogProps) {
  const { logCompletedExperiment } = useGoals();

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [finishedOn, setFinishedOn] = useState<Date>();
  const [dateOpen, setDateOpen] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const [actionInput, setActionInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [addValue, setAddValue] = useState("");
  const [happened, setHappened] = useState("");
  const [learned, setLearned] = useState("");
  const [futureNote, setFutureNote] = useState("");

  const available = goal.metrics.filter((m) => !selectedIds.includes(m.id));

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setIcon(ICONS[0]);
    setFinishedOn(startOfDay(new Date()));
    setDateOpen(false);
    setActions([]);
    setActionInput("");
    const first = goal.metrics[0];
    setSelectedIds(first ? [first.id] : []);
    setResults(first ? { [first.id]: "" } : {});
    setAddValue("");
    setHappened("");
    setLearned("");
    setFutureNote("");
  }, [open, goal.metrics]);

  function addMetric(metricId: string | null) {
    if (!metricId || selectedIds.includes(metricId)) return;
    if (!goal.metrics.some((m) => m.id === metricId)) return;
    setSelectedIds((prev) => [...prev, metricId]);
    setResults((prev) => ({ ...prev, [metricId]: "" }));
    setAddValue("");
  }

  function removeMetric(metricId: string) {
    setSelectedIds((prev) => prev.filter((id) => id !== metricId));
    setResults((prev) => {
      const next = { ...prev };
      delete next[metricId];
      return next;
    });
  }

  function addAction() {
    const value = actionInput.trim();
    if (!value) return;
    setActions((prev) => [...prev, value]);
    setActionInput("");
  }

  // Actions are optional — people logging a past experiment rarely remember them.
  const isValid = !!title.trim() && !!finishedOn;

  function handleSave() {
    if (!isValid || !finishedOn) return;

    const finishedAt = startOfDay(finishedOn);
    const tasks: AttemptTask[] = actions.map((actionTitle) => ({
      id: crypto.randomUUID(),
      title: actionTitle,
      done: true,
      completedAt: finishedAt,
      date: finishedAt,
    }));

    const attemptResults: AttemptResult[] = selectedIds
      .map((id) => {
        const raw = results[id]?.trim();
        if (!raw) return null;
        const value = Number(raw);
        if (!Number.isFinite(value)) return null;
        return { metricId: id, value };
      })
      .filter((r): r is AttemptResult => r !== null);

    const attempt = logCompletedExperiment({
      goalId: goal.id,
      title: title.trim(),
      icon,
      finishedAt,
      tasks,
      results: attemptResults,
      retrospective: {
        happened: happened.trim() || undefined,
        learned: learned.trim() || undefined,
        futureNote: futureNote.trim() || undefined,
      },
    });

    onOpenChange(false);
    onCreated?.(attempt);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a past experiment</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Already tried something? Capture it here — what came of it matters
            more than the exact steps you took.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch referral campaign"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Icon
              </label>
              <div className="flex flex-wrap items-center gap-1">
                {ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md hover:bg-white/5",
                      icon === emoji && "bg-white/10 ring-1 ring-primary",
                    )}
                  >
                    <Emoji value={emoji} className="size-5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Finished on <span className="text-destructive">*</span>
              </label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2 font-normal"
                    />
                  }
                >
                  <CalendarIcon size={14} className="text-muted-foreground" />
                  {finishedOn ? formatShortDate(finishedOn) : "Pick a date"}
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={finishedOn}
                    onSelect={(date) => {
                      setFinishedOn(date);
                      setDateOpen(false);
                    }}
                    defaultMonth={finishedOn}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              What you did{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <p className="text-[11px] text-muted-foreground">
              Don&apos;t remember the details? Skip this — it&apos;ll be saved
              as a tiny experiment.
            </p>
            <div className="flex items-center gap-1.5">
              <Input
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAction();
                  }
                }}
                placeholder="Add an action and press Enter"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={addAction}
              >
                <Plus size={13} />
              </Button>
            </div>
            {actions.length > 0 && (
              <div className="flex flex-col gap-1">
                {actions.map((action, index) => (
                  <div
                    key={`${action}-${index}`}
                    className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5 text-sm text-foreground"
                  >
                    <span className="size-3.5 shrink-0 rounded-[4px] border border-primary bg-primary" />
                    <span className="min-w-0 flex-1 truncate">{action}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        setActions((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {goal.metrics.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Results
              </label>
              <p className="text-[11px] text-muted-foreground">
                Optional — add the metrics this experiment moved (up to{" "}
                {goal.metrics.length}).
              </p>
              <div className="flex flex-col gap-2">
                {selectedIds.map((id) => {
                  const metric = goal.metrics.find((m) => m.id === id);
                  if (!metric) return null;
                  const index = goal.metrics.findIndex((m) => m.id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-white/[0.02] px-3 py-2"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          background: metricColor(Math.max(index, 0)),
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {metric.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {metricAggregation(metric) === "sum"
                          ? "this run"
                          : "best"}
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={results[id] ?? ""}
                        onChange={(e) =>
                          setResults((prev) => ({
                            ...prev,
                            [id]: e.target.value,
                          }))
                        }
                        placeholder={formatMetricValue(metric.currentValue)}
                        className="h-8 w-24"
                      />
                      {metric.unit && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {metric.unit}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeMetric(id)}
                        aria-label={`Remove ${metric.name}`}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  );
                })}
              </div>
              {available.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={addValue || undefined}
                    onValueChange={addMetric}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Add another metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (available[0]) addMetric(available[0].id);
                    }}
                    aria-label="Add metric"
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <label className="text-xs font-medium text-foreground">
              Retrospective
            </label>
            {RETRO_FIELDS.map((field) => {
              const value =
                field.key === "happened"
                  ? happened
                  : field.key === "learned"
                    ? learned
                    : futureNote;
              const setValue =
                field.key === "happened"
                  ? setHappened
                  : field.key === "learned"
                    ? setLearned
                    : setFutureNote;
              return (
                <div key={field.key} className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">
                    {field.label}
                  </span>
                  <Textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={field.placeholder}
                    className="min-h-16 text-sm"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save experiment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
