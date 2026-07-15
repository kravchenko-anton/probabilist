import { useState } from "react"
import { Collapsible } from "@base-ui/react/collapsible"
import { ChevronDown, Hash } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export type Project = { name: string; color: string }

type ProjectSectionProps = {
  title: string
  badge: string
  badgeClassName?: string
  projects: Project[]
  defaultOpen?: boolean
}

export function ProjectSection({
  title,
  badge,
  badgeClassName = "bg-secondary text-secondary-foreground",
  projects,
  defaultOpen = true,
}: ProjectSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="px-2">
      <Collapsible.Trigger className="group mb-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/5">
        <Avatar size="sm" className="rounded-md">
          <AvatarFallback className={`rounded-md text-[9px] font-bold ${badgeClassName}`}>
            {badge}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 text-left text-[13px] font-semibold">{title}</span>
        <ChevronDown
          size={13}
          className={`text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </Collapsible.Trigger>
      <Collapsible.Panel>
        <div className="space-y-0.5">
          {projects.map((p) => (
            <button
              key={p.name}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
            >
              <Hash size={14} style={{ color: p.color }} />
              {p.name}
            </button>
          ))}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
