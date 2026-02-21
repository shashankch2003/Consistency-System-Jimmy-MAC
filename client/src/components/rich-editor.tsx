import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const SLASH_ITEMS = [
  { section: "Suggested", items: [
    { label: "Image", icon: "🖼️", shortcut: "", action: "image" },
    { label: "Heading 3", icon: "H3", shortcut: "###", action: "h3" },
    { label: "Page", icon: "📄", shortcut: "", action: "page" },
    { label: "Numbered list", icon: "1.", shortcut: "1.", action: "orderedList" },
  ]},
  { section: "Basic blocks", items: [
    { label: "Text", icon: "T", shortcut: "", action: "paragraph" },
    { label: "Heading 1", icon: "H1", shortcut: "#", action: "h1" },
    { label: "Heading 2", icon: "H2", shortcut: "##", action: "h2" },
    { label: "Heading 3", icon: "H3", shortcut: "###", action: "h3_2" },
    { label: "Bulleted list", icon: "•", shortcut: "-", action: "bulletList" },
    { label: "Numbered list", icon: "1.", shortcut: "1.", action: "orderedList_2" },
    { label: "To-do list", icon: "☐", shortcut: "[]", action: "taskList" },
    { label: "Page", icon: "📄", shortcut: "", action: "page_2" },
    { label: "Callout", icon: "💡", shortcut: "", action: "callout" },
    { label: "Quote", icon: "❝", shortcut: "\"", action: "blockquote" },
    { label: "Table", icon: "⊞", shortcut: "", action: "table" },
  ]},
];

interface SlashMenuProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
  onAddPage?: () => void;
}

function SlashMenu({ editor, position, onClose, onAddPage }: SlashMenuProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allItems = SLASH_ITEMS.flatMap(s => s.items);
  const filtered = search
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  const displayItems = filtered || allItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const executeAction = useCallback((action: string) => {
    const { state, dispatch } = editor.view;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from);
    const slashPos = textBefore.lastIndexOf("/");
    if (slashPos !== -1) {
      const deleteFrom = from - (textBefore.length - slashPos);
      const tr = state.tr.delete(deleteFrom, from);
      dispatch(tr);
    }

    switch (action) {
      case "paragraph":
        editor.chain().focus().setParagraph().run();
        break;
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
      case "h3_2":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
      case "orderedList_2":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "taskList":
        editor.chain().focus().toggleTaskList().run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "callout":
        editor.chain().focus().insertContent(
          '<blockquote><p>💡 </p></blockquote>'
        ).run();
        break;
      case "table":
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case "image":
        fileInputRef.current?.click();
        return;
      case "page":
      case "page_2":
        if (onAddPage) onAddPage();
        break;
    }
    onClose();
  }, [editor, onClose, onAddPage]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % displayItems.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + displayItems.length) % displayItems.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (displayItems[selectedIndex]) executeAction(displayItems[selectedIndex].action);
    }
  }, [displayItems, selectedIndex, executeAction, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Upload failed");
        return;
      }
      const { url } = await res.json();

      const { state, dispatch } = editor.view;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 50), from);
      const slashPos = textBefore.lastIndexOf("/");
      if (slashPos !== -1) {
        const deleteFrom = from - (textBefore.length - slashPos);
        const tr = state.tr.delete(deleteFrom, from);
        dispatch(tr);
      }

      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      alert("Failed to upload image");
    }
    onClose();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
        data-testid="input-image-upload"
      />
      <div
        ref={menuRef}
        className="absolute bg-card border border-border rounded-lg shadow-2xl overflow-hidden z-50 w-72"
        style={{ top: position.top, left: position.left }}
        data-testid="slash-menu"
      >
        <div className="p-2 border-b border-border/50">
          <div className="text-sm text-muted-foreground flex items-center px-2">
            <span className="text-white mr-1">/</span>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type to search"
              className="bg-transparent outline-none text-sm text-white flex-1"
              data-testid="input-slash-search"
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered ? (
            filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
            ) : (
              filtered.map((item, idx) => (
                <button
                  key={item.action}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
                    idx === selectedIndex ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5"
                  )}
                  onClick={() => executeAction(item.action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  data-testid={`slash-item-${item.action}`}
                >
                  <span className="w-6 text-center shrink-0 text-base font-semibold">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && <span className="text-xs text-muted-foreground/60">{item.shortcut}</span>}
                </button>
              ))
            )
          ) : (
            SLASH_ITEMS.map(section => (
              <div key={section.section}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {section.section}
                </div>
                {section.items.map(item => {
                  const globalIdx = allItems.indexOf(item);
                  return (
                    <button
                      key={item.action}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
                        globalIdx === selectedIndex ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5"
                      )}
                      onClick={() => executeAction(item.action)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      data-testid={`slash-item-${item.action}`}
                    >
                      <span className="w-6 text-center shrink-0 text-base font-semibold">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && <span className="text-xs text-muted-foreground/60">{item.shortcut}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
          <div className="border-t border-border/50 mt-1">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 transition-colors"
              onClick={onClose}
              data-testid="slash-item-close"
            >
              <span>Close menu</span>
              <span className="text-xs text-muted-foreground/60">esc</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  onAddPage?: () => void;
}

export default function RichEditor({ content, onChange, onAddPage }: RichEditorProps) {
  const [slashMenu, setSlashMenu] = useState<{ top: number; left: number } | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight,
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());

      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 1), from);

      if (textBefore === "/") {
        const coords = editor.view.coordsAtPos(from);
        const containerRect = editorContainerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setSlashMenu({
            top: coords.bottom - containerRect.top + (editorContainerRef.current?.scrollTop || 0) + 4,
            left: coords.left - containerRect.left,
          });
        }
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[60vh]",
        "data-testid": "rich-editor-content",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Escape" && slashMenu) {
          setSlashMenu(null);
          return true;
        }
        if (slashMenu && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")) {
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content]);

  const handleSlashKeyDetection = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const { from } = state.selection;
    const text = state.doc.textBetween(Math.max(0, from - 50), from);
    if (!text.includes("/")) {
      setSlashMenu(null);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", handleSlashKeyDetection);
    return () => { editor.off("selectionUpdate", handleSlashKeyDetection); };
  }, [editor, handleSlashKeyDetection]);

  if (!editor) return null;

  return (
    <div ref={editorContainerRef} className="relative" data-testid="rich-editor">
      <EditorContent editor={editor} />
      {slashMenu && (
        <SlashMenu
          editor={editor}
          position={slashMenu}
          onClose={() => setSlashMenu(null)}
          onAddPage={onAddPage}
        />
      )}
    </div>
  );
}
