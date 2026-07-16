import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  Bold,
  Code,
  Heading,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react"
import { LexicalComposer, type InitialConfigType } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin"
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text"
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list"
import { $setBlocksType } from "@lexical/selection"
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils"
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type EditorState,
  type TextFormatType,
} from "lexical"
import { cn } from "@/lib/utils"

const EDITOR_THEME = {
  paragraph: "editor-paragraph",
  heading: {
    h1: "editor-h1",
    h2: "editor-h2",
    h3: "editor-h3",
  },
  quote: "editor-quote",
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    underlineStrikethrough: "[text-decoration:underline_line-through]",
    code: "editor-code-inline",
  },
  list: {
    ul: "editor-ul",
    ol: "editor-ol",
    listitem: "editor-li",
    listitemChecked: "editor-li-checked",
    listitemUnchecked: "editor-li-unchecked",
    nested: {
      listitem: "editor-nested-li",
    },
  },
}

type BlockType = "paragraph" | "heading" | "quote" | "bullet" | "number" | "check"

function looksLikeLexicalState(value: string) {
  if (!value.startsWith("{")) return false
  try {
    const parsed = JSON.parse(value) as { root?: unknown }
    return !!parsed.root
  } catch {
    return false
  }
}

function plainTextInitializer(value: string) {
  return () => {
    const root = $getRoot()
    if (root.getFirstChild()) return
    for (const line of value.split("\n")) {
      const paragraph = $createParagraphNode()
      if (line) paragraph.append($createTextNode(line))
      root.append(paragraph)
    }
  }
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground",
        active && "bg-primary/30 text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function Toolbar() {
  const [editor] = useLexicalComposerContext()
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
  })
  const [blockType, setBlockType] = useState<BlockType>("paragraph")

  const refreshToolbar = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    setFormats({
      bold: selection.hasFormat("bold"),
      italic: selection.hasFormat("italic"),
      underline: selection.hasFormat("underline"),
      strikethrough: selection.hasFormat("strikethrough"),
      code: selection.hasFormat("code"),
    })
    const anchorNode = selection.anchor.getNode()
    const element =
      anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow()
    if ($isListNode(element)) {
      const nearestList = $getNearestNodeOfType(anchorNode, ListNode)
      setBlockType((nearestList ?? element).getListType() as BlockType)
    } else if ($isHeadingNode(element)) {
      setBlockType("heading")
    } else if ($isQuoteNode(element)) {
      setBlockType("quote")
    } else {
      setBlockType("paragraph")
    }
  }, [])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(refreshToolbar)
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          refreshToolbar()
          return false
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, refreshToolbar])

  const formatText = (format: TextFormatType) =>
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)

  const toggleBlock = (type: "heading" | "quote") =>
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      $setBlocksType(selection, () =>
        blockType === type
          ? $createParagraphNode()
          : type === "heading"
            ? $createHeadingNode("h2")
            : $createQuoteNode()
      )
    })

  const toggleList = (type: "bullet" | "number" | "check") => {
    if (blockType === type) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      return
    }
    const command =
      type === "bullet"
        ? INSERT_UNORDERED_LIST_COMMAND
        : type === "number"
          ? INSERT_ORDERED_LIST_COMMAND
          : INSERT_CHECK_LIST_COMMAND
    editor.dispatchCommand(command, undefined)
  }

  return (
    <div className="mx-auto mb-2 flex w-fit max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card px-1.5 py-1 shadow-lg shadow-black/30">
      <ToolbarButton
        label="Heading"
        active={blockType === "heading"}
        onClick={() => toggleBlock("heading")}
      >
        <Heading size={14} />
      </ToolbarButton>
      <ToolbarButton label="Bold" active={formats.bold} onClick={() => formatText("bold")}>
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={formats.italic} onClick={() => formatText("italic")}>
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={formats.underline}
        onClick={() => formatText("underline")}
      >
        <Underline size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={formats.strikethrough}
        onClick={() => formatText("strikethrough")}
      >
        <Strikethrough size={14} />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Checklist"
        active={blockType === "check"}
        onClick={() => toggleList("check")}
      >
        <ListChecks size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={blockType === "bullet"}
        onClick={() => toggleList("bullet")}
      >
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={blockType === "number"}
        onClick={() => toggleList("number")}
      >
        <ListOrdered size={14} />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Quote"
        active={blockType === "quote"}
        onClick={() => toggleBlock("quote")}
      >
        <Quote size={14} />
      </ToolbarButton>
      <ToolbarButton label="Code" active={formats.code} onClick={() => formatText("code")}>
        <Code size={14} />
      </ToolbarButton>
    </div>
  )
}

interface RichTextEditorProps {
  /** Serialized Lexical document or plain text. Read once on mount — re-key the component to load another document. */
  value?: string
  /** Called with the serialized document, or "" when the editor is empty. */
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Add notes…",
  className,
}: RichTextEditorProps) {
  const initialConfig: InitialConfigType = {
    namespace: "task-notes",
    theme: EDITOR_THEME,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    editorState: value ? (looksLikeLexicalState(value) ? value : plainTextInitializer(value)) : null,
    onError: (error: Error) => {
      console.error(error)
    },
  }

  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      const isEmpty = $getRoot().getTextContent().trim() === ""
      onChange(isEmpty ? "" : JSON.stringify(editorState.toJSON()))
    })
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input"
                aria-placeholder={placeholder}
                placeholder={<div className="editor-placeholder">{placeholder}</div>}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <Toolbar />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <TabIndentationPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  )
}
