import testTube from "emoji-datasource-apple/img/apple/64/1f9ea.png"
import rocket from "emoji-datasource-apple/img/apple/64/1f680.png"
import clapperBoard from "emoji-datasource-apple/img/apple/64/1f3ac.png"
import writingHand from "emoji-datasource-apple/img/apple/64/270d-fe0f.png"
import megaphone from "emoji-datasource-apple/img/apple/64/1f4e3.png"
import wrench from "emoji-datasource-apple/img/apple/64/1f527.png"
import directHit from "emoji-datasource-apple/img/apple/64/1f3af.png"
import chartIncreasing from "emoji-datasource-apple/img/apple/64/1f4c8.png"
import lightBulb from "emoji-datasource-apple/img/apple/64/1f4a1.png"
import trophy from "emoji-datasource-apple/img/apple/64/1f3c6.png"
import fire from "emoji-datasource-apple/img/apple/64/1f525.png"
import memo from "emoji-datasource-apple/img/apple/64/1f4dd.png"
import calendar from "emoji-datasource-apple/img/apple/64/1f4c5.png"
import sunrise from "emoji-datasource-apple/img/apple/64/1f305.png"
import spiralCalendar from "emoji-datasource-apple/img/apple/64/1f5d3-fe0f.png"
import inboxTray from "emoji-datasource-apple/img/apple/64/1f4e5.png"
import closedBook from "emoji-datasource-apple/img/apple/64/1f4d5.png"
import checkMarkButton from "emoji-datasource-apple/img/apple/64/2705.png"
import wastebasket from "emoji-datasource-apple/img/apple/64/1f5d1-fe0f.png"
import wearyFace from "emoji-datasource-apple/img/apple/64/1f629.png"
import smilingFaceWithSunglasses from "emoji-datasource-apple/img/apple/64/1f60e.png"
import { cn } from "@/lib/utils"

/** Unicode emoji -> Apple artwork (emoji-datasource-apple), keyed by the literal glyph. */
const EMOJI_IMAGES: Record<string, string> = {
  "🧪": testTube,
  "🚀": rocket,
  "🎬": clapperBoard,
  "✍️": writingHand,
  "📣": megaphone,
  "🔧": wrench,
  "🎯": directHit,
  "📈": chartIncreasing,
  "💡": lightBulb,
  "🏆": trophy,
  "🔥": fire,
  "📝": memo,
  "📅": calendar,
  "🌅": sunrise,
  "🗓️": spiralCalendar,
  "📥": inboxTray,
  "📕": closedBook,
  "✅": checkMarkButton,
  "🗑️": wastebasket,
  "😩": wearyFace,
  "😎": smilingFaceWithSunglasses,
}

interface EmojiProps {
  value: string
  className?: string
}

/** Renders a known emoji as Apple artwork; falls back to the native glyph otherwise. */
export function Emoji({ value, className }: EmojiProps) {
  const src = EMOJI_IMAGES[value]
  if (!src) return <span className={className}>{value}</span>

  return (
    <img
      src={src}
      alt={value}
      draggable={false}
      className={cn("inline-block shrink-0 select-none object-contain", className)}
    />
  )
}
