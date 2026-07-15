import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { projects } from "@/data/projects"
import { TaskListHeader } from "@/components/tasks/TaskListHeader"
import { AddTaskBar } from "@/components/tasks/AddTaskBar"
import { TaskSection } from "@/components/tasks/TaskSection"
import { TaskRow } from "@/components/tasks/TaskRow"
import { TaskDetailPane } from "@/components/tasks/TaskDetailPane"

export function ProjectView() {
  const { slug } = useParams<{ slug: string }>()
  const project = projects.find((p) => p.slug === slug)

  const allTasks = useMemo(
    () => project?.sections.flatMap((section) => section.tasks) ?? [],
    [project]
  )
  const [selectedId, setSelectedId] = useState(allTasks[0]?.id)
  const selectedTask = allTasks.find((task) => task.id === selectedId) ?? allTasks[0]

  if (!project) {
    return (
      <div className="flex h-screen flex-1 items-center justify-center text-muted-foreground">
        List not found
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-1">
      <div className="flex w-[60%] flex-col border-r border-border">
        <TaskListHeader title={project.label} emoji={project.emoji} />
        <AddTaskBar />
        <div className="flex flex-1 flex-col overflow-y-auto pb-4">
          {project.sections.map((section) => (
            <TaskSection key={section.title} title={section.title} count={section.tasks.length}>
              {section.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  title={task.title}
                  emoji={task.emoji}
                  hasNote={!!task.description}
                  selected={task.id === selectedTask?.id}
                  onSelect={() => setSelectedId(task.id)}
                />
              ))}
            </TaskSection>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {selectedTask ? (
          <TaskDetailPane
            emoji={selectedTask.emoji}
            title={selectedTask.title}
            description={selectedTask.description}
            dueLabel="Due Date"
            footerEmoji={project.emoji}
            footerLabel={project.label}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No tasks in this list yet
          </div>
        )}
      </div>
    </div>
  )
}
