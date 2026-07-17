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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  isTinyAttempt,
  type Attempt,
  type AttemptKind,
  type AttemptTask,
} from "@/data/attempts";
import { formatShortDate } from "@/lib/date";
import { useGoals } from "@/lib/goals-store";
import { cn } from "@/lib/utils";
import { CalendarIcon, Footprints, Plus, StickyNote, X } from "lucide-react";
import { useEffect, useState } from "react";

const EXPERIMENT_ICONS = ["🧪", "🚀", "🎬", "✍️", "📣", "🔧"];

const KIND_OPTIONS: {
  value: AttemptKind;
  label: string;
  description: string;
}[] = [
  {
    value: "standard",
    label: "Experiment",
    description: "Plan the tasks, check them off, then measure the outcome.",
  },
  {
    value: "tiny",
    label: "Tiny experiment",
    description:
      "One small bet — no tasks to plan, just do it and record what happened.",
  },
];

interface AttemptFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  attempt?: Attempt;
  onCreated?: (attempt: Attempt) => void;
}

export function AttemptFormDialog({
  open,
  onOpenChange,
  goalId,
  attempt,
  onCreated,
}: AttemptFormDialogProps) {
  const { addAttempt, updateAttempt } = useGoals();
  const isEditing = !!attempt;

  const [kind, setKind] = useState<AttemptKind>("standard");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(EXPERIMENT_ICONS[0]);
  const [deadline, setDeadline] = useState<Date>();
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);
  const [tasks, setTasks] = useState<AttemptTask[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [noteOpenId, setNoteOpenId] = useState<string>();

  const isTiny = kind === "tiny";

  useEffect(() => {
    if (!open) return;
    setKind(
      attempt ? (isTinyAttempt(attempt) ? "tiny" : "standard") : "standard",
    );
    setTitle(attempt?.title ?? "");
    setIcon(attempt?.icon ?? EXPERIMENT_ICONS[0]);
    setDeadline(attempt?.deadline);
    setTasks(attempt?.tasks ?? []);
    setTaskInput("");
    setFirstStep("");
    setNoteOpenId(undefined);
  }, [open, attempt]);

  function addTask() {
    const value = taskInput.trim();
    if (!value) return;
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: value, done: false },
    ]);
    setTaskInput("");
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function setTaskNote(id: string, note: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, description: note || undefined } : task,
      ),
    );
  }

  const isValid = isTiny
    ? !!title.trim()
    : !!title.trim() &&
      !!deadline &&
      (isEditing ? tasks.length > 0 : !!firstStep.trim());

  function handleSave() {
    if (!isValid) return;
    const trimmedTitle = title.trim();

    if (attempt) {
      updateAttempt({
        ...attempt,
        title: trimmedTitle,
        icon,
        deadline,
        tasks,
      });
      onOpenChange(false);
      return;
    }

    const newAttempt: Attempt = {
      id: crypto.randomUUID(),
      goalId,
      title: trimmedTitle,
      icon,
      kind,
      deadline,
      tasks: isTiny
        ? []
        : [{ id: crypto.randomUUID(), title: firstStep.trim(), done: false }],
      status: "planned",
      createdAt: new Date(),
      predictions: [],
      results: [],
    };
    addAttempt(newAttempt);
    onOpenChange(false);
    onCreated?.(newAttempt);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? isTiny
                ? "Edit tiny experiment"
                : "Edit experiment"
              : "New experiment"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!isEditing && (
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Experiment type"
            >
              {KIND_OPTIONS.map((option) => {
                const selected = kind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setKind(option.value)}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.98]",
                      selected
                        ? "border-primary/60 bg-primary/[0.08]"
                        : "border-border bg-white/[0.02] hover:bg-white/5",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="text-[11px] leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              Experiment title <span className="text-destructive">*</span>
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isTiny
                  ? "e.g. Post at 9am instead of noon"
                  : "e.g. Launch a referral campaign"
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Icon
              </label>
              <div className="flex items-center gap-1">
                {EXPERIMENT_ICONS.map((emoji) => (
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
                Deadline{" "}
                {isTiny ? (
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                ) : (
                  <span className="text-destructive">*</span>
                )}
              </label>
              <Popover
                open={deadlinePickerOpen}
                onOpenChange={setDeadlinePickerOpen}
              >
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
                  {deadline ? formatShortDate(deadline) : "Pick a date"}
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={(date) => {
                      setDeadline(date);
                      setDeadlinePickerOpen(false);
                    }}
                    defaultMonth={deadline}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {!isEditing && !isTiny && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                First step <span className="text-destructive">*</span>
              </label>
              <div className="rounded-lg border border-primary/25 bg-primary/[0.06] p-3 transition-colors focus-within:border-primary/50">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Footprints size={14} color={"#fff"} />
                  </span>
                  <input
                    value={firstStep}
                    onChange={(e) => setFirstStep(e.target.value)}
                    placeholder="What's the very first thing you'll do?"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  One small action is enough to start. The next steps will
                  reveal themselves once you take this one.
                </p>
              </div>
            </div>
          )}

          {isEditing && !isTiny && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">
                Tasks <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTask();
                    }
                  }}
                  placeholder="Add a task and press Enter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={addTask}
                >
                  <Plus size={13} />
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-1 rounded-md bg-white/5 px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <span className="size-3.5 shrink-0 rounded-[4px] border border-muted-foreground/50" />
                      <span className="flex-1 truncate">{task.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setNoteOpenId((prev) =>
                            prev === task.id ? undefined : task.id,
                          )
                        }
                        className={cn(
                          task.description && "text-primary-foreground",
                        )}
                      >
                        <StickyNote size={12} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeTask(task.id)}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                    {noteOpenId === task.id && (
                      <Textarea
                        value={task.description ?? ""}
                        onChange={(e) => setTaskNote(task.id, e.target.value)}
                        placeholder="Note for this task — context, links, what to look for…"
                        className="min-h-12 text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
              {tasks.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  An experiment needs at least one task. You will check these
                  off as you work.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {isEditing ? "Save changes" : "Create experiment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
