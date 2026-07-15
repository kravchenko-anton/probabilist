import { Bell, ChevronDown } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function UserRow() {
  return (
    <div className="flex h-14 items-center justify-between px-2 mb-2">
      <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-black/5">
        <Avatar size="sm">
          <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
            A
          </AvatarFallback>
        </Avatar>
        <span className="text-[13px] font-semibold">Anton</span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground" />
            }
          >
            <Bell size={15} />
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
