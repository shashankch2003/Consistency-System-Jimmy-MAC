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
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Copy, XCircle, Trash2, Plus,
  GripVertical, Table2, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Highlighter, Link as LinkIcon, Type, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Minus, AlignLeft, Palette, ChevronDown,
  ExternalLink, Unlink, ImageIcon, ToggleRight, MessageSquare, FileText
} from "lucide-react";

const NOTION_COLORS = [
  { name: "Default", color: null, bg: null },
  { name: "Gray", color: "rgb(155,154,151)", bg: "rgb(47,47,47)" },
  { name: "Brown", color: "rgb(147,114,100)", bg: "rgb(74,50,40)" },
  { name: "Orange", color: "rgb(217,133,56)", bg: "rgb(92,59,35)" },
  { name: "Yellow", color: "rgb(201,170,56)", bg: "rgb(86,67,40)" },
  { name: "Green", color: "rgb(68,162,96)", bg: "rgb(36,61,48)" },
  { name: "Blue", color: "rgb(51,126,169)", bg: "rgb(20,58,78)" },
  { name: "Purple", color: "rgb(144,101,176)", bg: "rgb(60,45,73)" },
  { name: "Pink", color: "rgb(193,76,138)", bg: "rgb(78,44,66)" },
  { name: "Red", color: "rgb(212,76,71)", bg: "rgb(82,46,42)" },
];

const TURN_INTO_OPTIONS = [
  { label: "Text", icon: Type, action: "paragraph" },
  { label: "Heading 1", icon: Heading1, action: "h1" },
  { label: "Heading 2", icon: Heading2, action: "h2" },
  { label: "Heading 3", icon: Heading3, action: "h3" },
  { label: "Bullet list", icon: List, action: "bulletList" },
  { label: "Numbered list", icon: ListOrdered, action: "orderedList" },
  { label: "To-do list", icon: CheckSquare, action: "taskList" },
  { label: "Quote", icon: Quote, action: "blockquote" },
  { label: "Code", icon: Code, action: "codeBlock" },
];

const SLASH_ITEMS = [
  { section: "Basic blocks", items: [
    { label: "Text", icon: Type, desc: "Plain text block", action: "paragraph" },
    { label: "Heading 1", icon: Heading1, desc: "Large heading", action: "h1" },
    { label: "Heading 2", icon: Heading2, desc: "Medium heading", action: "h2" },
    { label: "Heading 3", icon: Heading3, desc: "Small heading", action: "h3" },
    { label: "Bulleted list", icon: List, desc: "Unordered list", action: "bulletList" },
    { label: "Numbered list", icon: ListOrdered, desc: "Ordered list", action: "orderedList" },
    { label: "To-do list", icon: CheckSquare, desc: "Task checklist", action: "taskList" },
    { label: "Quote", icon: Quote, desc: "Capture a quote", action: "blockquote" },
    { label: "Divider", icon: Minus, desc: "Visual separator", action: "divider" },
    { label: "Callout", icon: MessageSquare, desc: "Stand-out text", action: "callout" },
    { label: "Code block", icon: Code, desc: "Code snippet", action: "codeBlock" },
  ]},
  { section: "Media", items: [
    { label: "Image", icon: ImageIcon, desc: "Upload an image", action: "image" },
    { label: "Table", icon: Table2, desc: "Add a table", action: "table" },
  ]},
  { section: "Advanced", items: [
    { label: "Sub-page", icon: FileText, desc: "Embed a sub-page", action: "page" },
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

  useEffect(() => { setSelectedIndex(0); }, [search]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const deleteSlashText = useCallback(() => {
    const { state, dispatch } = editor.view;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from);
    const slashPos = textBefore.lastIndexOf("/");
    if (slashPos !== -1) {
      const deleteFrom = from - (textBefore.length - slashPos);
      dispatch(state.tr.delete(deleteFrom, from));
    }
  }, [editor]);

  const executeAction = useCallback((action: string) => {
    deleteSlashText();

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
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "taskList":
        editor.chain().focus().toggleTaskList().run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "codeBlock":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case "divider":
        editor.chain().focus().setHorizontalRule().run();
        break;
      case "callout":
        editor.chain().focus().insertContent({
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '\u{1F4A1} ' }] }],
        }).run();
        break;
      case "table":
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case "image":
        fileInputRef.current?.click();
        return;
      case "page":
        if (onAddPage) onAddPage();
        break;
    }
    onClose();
  }, [editor, onClose, onAddPage, deleteSlashText]);

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
      const res = await fetch("/api/upload-image", { method: "POST", credentials: "include", body: formData });
      if (!res.ok) { const err = await res.json(); alert(err.message || "Upload failed"); return; }
      const { url } = await res.json();
      deleteSlashText();
      editor.chain().focus().setImage({ src: url }).run();
    } catch { alert("Failed to upload image"); }
    onClose();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} data-testid="input-image-upload" />
      <div
        ref={menuRef}
        className="absolute bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 w-80"
        style={{ top: position.top, left: position.left }}
        data-testid="slash-menu"
      >
        <div className="p-2 border-b border-white/[0.06]">
          <div className="flex items-center px-2 gap-1">
            <span className="text-white/40 text-sm">/</span>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter actions..."
              className="bg-transparent outline-none text-sm text-white flex-1 placeholder:text-white/30"
              data-testid="input-slash-search"
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered ? (
            filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-white/30 text-center">No results</div>
            ) : (
              filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.action}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
                      idx === selectedIndex ? "bg-white/10" : "hover:bg-white/[0.04]"
                    )}
                    onClick={() => executeAction(item.action)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    data-testid={`slash-item-${item.action}`}
                  >
                    <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white/90">{item.label}</div>
                      <div className="text-xs text-white/30 truncate">{item.desc}</div>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            SLASH_ITEMS.map(section => (
              <div key={section.section}>
                <div className="px-3 py-1.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                  {section.section}
                </div>
                {section.items.map(item => {
                  const globalIdx = allItems.indexOf(item);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.action}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
                        globalIdx === selectedIndex ? "bg-white/10" : "hover:bg-white/[0.04]"
                      )}
                      onClick={() => executeAction(item.action)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      data-testid={`slash-item-${item.action}`}
                    >
                      <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white/90">{item.label}</div>
                        <div className="text-xs text-white/30 truncate">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function getActiveTableEl(editor: Editor): HTMLTableElement | null {
  const { selection } = editor.state;
  const domAtPos = editor.view.domAtPos(selection.from);
  let node: Node | null = domAtPos.node;
  while (node) {
    if (node instanceof HTMLTableElement) return node;
    if (node instanceof HTMLElement && node.querySelector("table")) {
      const tableWrapper = node.closest(".tableWrapper");
      if (tableWrapper) {
        const t = tableWrapper.querySelector("table");
        if (t) return t;
      }
    }
    node = node.parentNode;
  }
  const tables = editor.view.dom.querySelectorAll("table");
  if (tables.length === 1) return tables[0] as HTMLTableElement;
  return null;
}

interface ContextMenuState {
  type: "row" | "column";
  index: number;
  x: number;
  y: number;
  tableEl?: HTMLTableElement;
}

function TableContextMenu({ state, editor, onClose }: { state: ContextMenuState; editor: Editor; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const tableEl = state.tableEl || getActiveTableEl(editor);

  const focusCellAt = (rowIdx: number, colIdx: number) => {
    if (!tableEl) return;
    const rows = tableEl.querySelectorAll("tr");
    const targetRow = rows[rowIdx];
    if (!targetRow) return;
    const cells = targetRow.querySelectorAll("th, td");
    const targetCell = cells[colIdx];
    if (!targetCell) return;
    const pos = editor.view.posAtDOM(targetCell, 0);
    editor.chain().focus().setTextSelection(pos).run();
  };

  const deleteTableAction = {
    label: "Delete table",
    icon: <Table2 className="w-4 h-4" />,
    danger: true,
    action: () => { editor.chain().focus().deleteTable().run(); },
  };

  const items = state.type === "row"
    ? [
        { label: "Insert above", icon: <ArrowUp className="w-4 h-4" />, action: () => { focusCellAt(state.index, 0); setTimeout(() => editor.chain().focus().addRowBefore().run(), 10); } },
        { label: "Insert below", icon: <ArrowDown className="w-4 h-4" />, action: () => { focusCellAt(state.index, 0); setTimeout(() => editor.chain().focus().addRowAfter().run(), 10); } },
        { label: "Duplicate", icon: <Copy className="w-4 h-4" />, action: () => { focusCellAt(state.index, 0); setTimeout(() => { editor.chain().focus().addRowAfter().run(); }, 10); } },
        { type: "separator" as const },
        { label: "Clear contents", icon: <XCircle className="w-4 h-4" />, action: () => { if (!tableEl) return; const rows = tableEl.querySelectorAll("tr"); const row = rows[state.index]; if (!row) return; row.querySelectorAll("th, td").forEach(cell => { const pos = editor.view.posAtDOM(cell, 0); editor.chain().setTextSelection(pos).deleteNode("paragraph").insertContentAt(pos, { type: "paragraph" }).run(); }); } },
        { label: "Delete", icon: <Trash2 className="w-4 h-4" />, danger: true, action: () => { focusCellAt(state.index, 0); setTimeout(() => editor.chain().focus().deleteRow().run(), 10); } },
        { type: "separator" as const },
        deleteTableAction,
      ]
    : [
        { label: "Insert left", icon: <ArrowLeft className="w-4 h-4" />, action: () => { focusCellAt(0, state.index); setTimeout(() => editor.chain().focus().addColumnBefore().run(), 10); } },
        { label: "Insert right", icon: <ArrowRight className="w-4 h-4" />, action: () => { focusCellAt(0, state.index); setTimeout(() => editor.chain().focus().addColumnAfter().run(), 10); } },
        { label: "Duplicate", icon: <Copy className="w-4 h-4" />, action: () => { focusCellAt(0, state.index); setTimeout(() => editor.chain().focus().addColumnAfter().run(), 10); } },
        { type: "separator" as const },
        { label: "Clear contents", icon: <XCircle className="w-4 h-4" />, action: () => { if (!tableEl) return; tableEl.querySelectorAll("tr").forEach(row => { const cells = row.querySelectorAll("th, td"); const cell = cells[state.index]; if (cell) { const pos = editor.view.posAtDOM(cell, 0); editor.chain().setTextSelection(pos).selectNodeBackward().insertContent({ type: "paragraph" }).run(); } }); } },
        { label: "Delete", icon: <Trash2 className="w-4 h-4" />, danger: true, action: () => { focusCellAt(0, state.index); setTimeout(() => editor.chain().focus().deleteColumn().run(), 10); } },
        { type: "separator" as const },
        deleteTableAction,
      ];

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#252525] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-[100] min-w-[200px] py-1"
      style={{ top: state.y, left: state.x }}
      data-testid="table-context-menu"
    >
      {items.map((item, i) => {
        if ("type" in item && item.type === "separator") return <div key={`sep-${i}`} className="h-px bg-white/10 my-1" />;
        const menuItem = item as { label: string; icon: JSX.Element; action: () => void; danger?: boolean };
        return (
          <button
            key={menuItem.label}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
              menuItem.danger ? "text-red-400 hover:bg-red-500/10" : "text-white/80 hover:bg-white/10"
            )}
            onClick={() => { menuItem.action(); onClose(); }}
            data-testid={`table-ctx-${menuItem.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {menuItem.icon}
            <span>{menuItem.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NotionTableControls({ editor, containerRef }: { editor: Editor; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [tableInfo, setTableInfo] = useState<{
    rows: number; cols: number; tableRect: DOMRect;
    rowPositions: { top: number; height: number }[];
    colPositions: { left: number; width: number }[];
  } | null>(null);
  const [isTableActive, setIsTableActive] = useState(false);
  const activeTableRef = useRef<HTMLTableElement | null>(null);

  const updateTableInfo = useCallback(() => {
    if (!containerRef.current) return;
    const isActive = editor.isActive("table");
    setIsTableActive(isActive);
    const tableEl = isActive ? getActiveTableEl(editor) : null;
    activeTableRef.current = tableEl;
    if (!tableEl) { setTableInfo(null); return; }
    const tableRect = tableEl.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const rows = tableEl.querySelectorAll("tr");
    const firstRow = rows[0];
    const headerCells = firstRow ? firstRow.querySelectorAll("th, td") : [];
    const rowPositions: { top: number; height: number }[] = [];
    rows.forEach(row => { const rect = row.getBoundingClientRect(); rowPositions.push({ top: rect.top - containerRect.top + containerRef.current!.scrollTop, height: rect.height }); });
    const colPositions: { left: number; width: number }[] = [];
    headerCells.forEach(cell => { const rect = cell.getBoundingClientRect(); colPositions.push({ left: rect.left - containerRect.left, width: rect.width }); });
    setTableInfo({
      rows: rows.length, cols: headerCells.length,
      tableRect: new DOMRect(tableRect.left - containerRect.left, tableRect.top - containerRect.top + containerRef.current!.scrollTop, tableRect.width, tableRect.height),
      rowPositions, colPositions,
    });
  }, [editor, containerRef]);

  useEffect(() => {
    updateTableInfo();
    editor.on("selectionUpdate", updateTableInfo);
    editor.on("update", updateTableInfo);
    const observer = new MutationObserver(updateTableInfo);
    if (containerRef.current) observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true });
    return () => { editor.off("selectionUpdate", updateTableInfo); editor.off("update", updateTableInfo); observer.disconnect(); };
  }, [editor, updateTableInfo, containerRef]);

  if (!tableInfo || !isTableActive) return null;

  const handleRowGripClick = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ type: "row", index: rowIndex, x: e.clientX, y: e.clientY, tableEl: activeTableRef.current || undefined });
  };
  const handleColGripClick = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ type: "column", index: colIndex, x: e.clientX, y: e.clientY, tableEl: activeTableRef.current || undefined });
  };
  const addRowAtEnd = () => {
    const tbl = activeTableRef.current; if (!tbl) return;
    const rows = tbl.querySelectorAll("tr"); const lastRow = rows[rows.length - 1]; if (!lastRow) return;
    const lastCell = lastRow.querySelector("td, th"); if (!lastCell) return;
    editor.chain().focus().setTextSelection(editor.view.posAtDOM(lastCell, 0)).addRowAfter().run();
  };
  const addColAtEnd = () => {
    const tbl = activeTableRef.current; if (!tbl) return;
    const firstRow = tbl.querySelector("tr"); if (!firstRow) return;
    const cells = firstRow.querySelectorAll("th, td"); const lastCell = cells[cells.length - 1]; if (!lastCell) return;
    editor.chain().focus().setTextSelection(editor.view.posAtDOM(lastCell, 0)).addColumnAfter().run();
  };

  return (
    <>
      {tableInfo.rowPositions.map((pos, i) => (
        <button key={`row-grip-${i}`} className="table-grip table-grip-row" style={{ top: pos.top, left: tableInfo.tableRect.x - 24, height: pos.height }} onClick={(e) => handleRowGripClick(e, i)} data-testid={`table-row-grip-${i}`}>
          <GripVertical className="w-3 h-3" />
        </button>
      ))}
      {tableInfo.colPositions.map((pos, i) => (
        <button key={`col-grip-${i}`} className="table-grip table-grip-col" style={{ left: pos.left, top: tableInfo.tableRect.y - 24, width: pos.width }} onClick={(e) => handleColGripClick(e, i)} data-testid={`table-col-grip-${i}`}>
          <GripVertical className="w-3 h-3 rotate-90" />
        </button>
      ))}
      <button className="table-add-btn table-add-row-btn" style={{ top: tableInfo.tableRect.y + tableInfo.tableRect.height + 2, left: tableInfo.tableRect.x, width: tableInfo.tableRect.width }} onClick={addRowAtEnd} data-testid="button-add-row-bottom" title="Add row">
        <Plus className="w-3.5 h-3.5" />
      </button>
      <button className="table-add-btn table-add-col-btn" style={{ left: tableInfo.tableRect.x + tableInfo.tableRect.width + 2, top: tableInfo.tableRect.y, height: tableInfo.tableRect.height }} onClick={addColAtEnd} data-testid="button-add-col-right" title="Add column">
        <Plus className="w-3.5 h-3.5" />
      </button>
      {contextMenu && <TableContextMenu state={contextMenu} editor={editor} onClose={() => setContextMenu(null)} />}
    </>
  );
}

function TurnIntoMenu({ editor, onClose, position }: { editor: Editor; onClose: () => void; position?: { x: number; y: number } }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        const wrapper = (target as Element).closest?.('[data-testid="turn-into-wrapper"]');
        if (!wrapper) onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const applyBlockType = (action: string) => {
    switch (action) {
      case "paragraph": editor.chain().focus().setParagraph().run(); break;
      case "h1": editor.chain().focus().setHeading({ level: 1 }).run(); break;
      case "h2": editor.chain().focus().setHeading({ level: 2 }).run(); break;
      case "h3": editor.chain().focus().setHeading({ level: 3 }).run(); break;
      case "bulletList": editor.chain().focus().toggleBulletList().run(); break;
      case "orderedList": editor.chain().focus().toggleOrderedList().run(); break;
      case "taskList": editor.chain().focus().toggleTaskList().run(); break;
      case "blockquote": editor.chain().focus().toggleBlockquote().run(); break;
      case "codeBlock": editor.chain().focus().toggleCodeBlock().run(); break;
    }
    onClose();
  };

  const getCurrentType = () => {
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    if (editor.isActive("bulletList")) return "bulletList";
    if (editor.isActive("orderedList")) return "orderedList";
    if (editor.isActive("taskList")) return "taskList";
    if (editor.isActive("blockquote")) return "blockquote";
    if (editor.isActive("codeBlock")) return "codeBlock";
    return "paragraph";
  };

  const currentType = getCurrentType();

  return (
    <div
      ref={menuRef}
      className={cn("bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[220px] py-1 max-h-[70vh] overflow-y-auto", position ? "fixed" : "absolute top-full left-0 mt-1")}
      style={position ? { top: position.y, left: position.x } : undefined}
      data-testid="turn-into-menu"
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Turn into</div>
      {TURN_INTO_OPTIONS.map(opt => {
        const Icon = opt.icon;
        const isActive = opt.action === currentType;
        return (
          <button
            key={opt.action}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors text-left",
              isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.06]"
            )}
            onClick={() => applyBlockType(opt.action)}
            data-testid={`turn-into-${opt.action}`}
          >
            <Icon className="w-4 h-4 text-white/50" />
            <span>{opt.label}</span>
            {isActive && <span className="ml-auto text-white/40 text-xs">Current</span>}
          </button>
        );
      })}
    </div>
  );
}

function ColorPicker({ editor, onClose, mode, position }: { editor: Editor; onClose: () => void; mode: "text" | "bg"; position?: { x: number; y: number } }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const applyColor = (color: typeof NOTION_COLORS[0]) => {
    if (mode === "text") {
      if (color.color) {
        editor.chain().focus().setColor(color.color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
    } else {
      if (color.bg) {
        editor.chain().focus().setHighlight({ color: color.bg }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={cn("bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[200px] py-1 max-h-[70vh] overflow-y-auto", position ? "fixed" : "absolute top-full left-0 mt-1")}
      style={position ? { top: position.y, left: position.x } : undefined}
      data-testid="color-picker-menu"
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
        {mode === "text" ? "Text color" : "Background"}
      </div>
      {NOTION_COLORS.map(c => (
        <button
          key={c.name}
          className="w-full flex items-center gap-3 px-3 py-1.5 text-sm text-white/70 hover:bg-white/[0.06] transition-colors text-left"
          onClick={() => applyColor(c)}
          data-testid={`color-${mode}-${c.name.toLowerCase()}`}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold border border-white/10"
            style={{
              backgroundColor: mode === "bg" ? (c.bg || "transparent") : "transparent",
              color: mode === "text" ? (c.color || "white") : "white",
            }}
          >
            A
          </div>
          <span>{c.name}</span>
        </button>
      ))}
    </div>
  );
}

function BlockMenu({ editor, position, onClose }: { editor: Editor; position: { x: number; y: number }; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [subMenu, setSubMenu] = useState<"turnInto" | "color" | null>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (subMenu) setSubMenu(null); else onClose(); } };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); };
  }, [onClose, subMenu]);

  const getBlockTypeLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("bulletList")) return "Bulleted list";
    if (editor.isActive("orderedList")) return "Numbered list";
    if (editor.isActive("taskList")) return "To-do list";
    if (editor.isActive("blockquote")) return "Quote";
    if (editor.isActive("codeBlock")) return "Code";
    if (editor.isActive("table")) return "Table";
    if (editor.isActive("image")) return "Image";
    return "Text";
  };

  const handleDelete = () => {
    const { state } = editor;
    const { $from } = state.selection;
    const blockStart = $from.start($from.depth);
    const blockEnd = $from.end($from.depth);
    editor.chain().focus().deleteRange({ from: blockStart - 1, to: blockEnd + 1 }).run();
    onClose();
  };

  const handleDuplicate = () => {
    const { state } = editor;
    const { $from } = state.selection;
    const node = $from.node($from.depth);
    if (node) {
      const endPos = $from.end($from.depth) + 1;
      editor.chain().focus().insertContentAt(endPos, node.toJSON()).run();
    }
    onClose();
  };

  const handleCopyLink = () => {
    const { state } = editor;
    const { from } = state.selection;
    const blockId = `block-${from}`;
    const url = `${window.location.href}#${blockId}`;
    navigator.clipboard.writeText(url).catch(() => {});
    onClose();
  };

  if (subMenu === "turnInto") {
    return <TurnIntoMenu editor={editor} onClose={onClose} position={position} />;
  }

  if (subMenu === "color") {
    return (
      <div
        ref={menuRef}
        className="fixed bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[200px] py-1 max-h-[70vh] overflow-y-auto"
        style={{ top: position.y, left: position.x }}
        data-testid="block-color-menu"
      >
        <div className="px-3 py-1.5 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Color</div>
        <div className="px-3 py-1 text-[11px] text-white/20 uppercase tracking-wider">Text color</div>
        {NOTION_COLORS.map(c => (
          <button
            key={`text-${c.name}`}
            className="w-full flex items-center gap-3 px-3 py-1 text-sm text-white/70 hover:bg-white/[0.06] transition-colors text-left"
            onClick={() => {
              if (c.color) editor.chain().focus().setColor(c.color).run();
              else editor.chain().focus().unsetColor().run();
              onClose();
            }}
            data-testid={`block-color-text-${c.name.toLowerCase()}`}
          >
            <div className="w-4 h-4 rounded text-xs font-bold flex items-center justify-center" style={{ color: c.color || "white" }}>A</div>
            <span>{c.name}</span>
          </button>
        ))}
        <div className="h-px bg-white/10 my-1" />
        <div className="px-3 py-1 text-[11px] text-white/20 uppercase tracking-wider">Background</div>
        {NOTION_COLORS.map(c => (
          <button
            key={`bg-${c.name}`}
            className="w-full flex items-center gap-3 px-3 py-1 text-sm text-white/70 hover:bg-white/[0.06] transition-colors text-left"
            onClick={() => {
              if (c.bg) editor.chain().focus().setHighlight({ color: c.bg }).run();
              else editor.chain().focus().unsetHighlight().run();
              onClose();
            }}
            data-testid={`block-color-bg-${c.name.toLowerCase()}`}
          >
            <div className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: c.bg || "transparent" }} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    );
  }

  const allActions = [
    { id: "turn-into", label: "Turn into", icon: AlignLeft, shortcut: "", hasArrow: true, action: () => setSubMenu("turnInto") },
    { id: "color", label: "Color", icon: Palette, shortcut: "", hasArrow: true, action: () => setSubMenu("color") },
    { id: "separator-1", type: "separator" as const },
    { id: "copy-link", label: "Copy link to block", icon: LinkIcon, shortcut: "", action: handleCopyLink },
    { id: "duplicate", label: "Duplicate", icon: Copy, shortcut: "Ctrl+D", action: handleDuplicate },
    { id: "separator-2", type: "separator" as const },
    { id: "delete", label: "Delete", icon: Trash2, shortcut: "Del", danger: true, action: handleDelete },
  ];

  const filteredActions = search
    ? allActions.filter(a => "label" in a && a.label.toLowerCase().includes(search.toLowerCase()))
    : allActions;

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#252525] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[260px] py-1"
      style={{ top: position.y, left: position.x }}
      data-testid="block-menu"
    >
      <div className="px-2 py-1.5 border-b border-white/[0.06]">
        <input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search actions..."
          className="w-full bg-white/[0.05] border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
          data-testid="input-block-menu-search"
        />
      </div>
      <div className="px-3 py-1.5 text-[11px] font-medium text-white/30">{getBlockTypeLabel()}</div>
      <div className="max-h-[50vh] overflow-y-auto py-0.5">
        {filteredActions.map((item) => {
          if ("type" in item && item.type === "separator") return <div key={item.id} className="h-px bg-white/10 my-1" />;
          const menuItem = item as { id: string; label: string; icon: any; shortcut?: string; hasArrow?: boolean; danger?: boolean; action: () => void };
          const Icon = menuItem.icon;
          return (
            <button
              key={menuItem.id}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors text-left",
                menuItem.danger ? "text-white/70 hover:bg-white/[0.06]" : "text-white/70 hover:bg-white/[0.06]"
              )}
              onClick={menuItem.action}
              data-testid={`block-menu-${menuItem.id}`}
            >
              <Icon className="w-4 h-4 text-white/50" />
              <span className="flex-1">{menuItem.label}</span>
              {menuItem.hasArrow && <ChevronDown className="w-3 h-3 -rotate-90 text-white/30" />}
              {menuItem.shortcut && <span className="text-xs text-white/25 ml-2">{menuItem.shortcut}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BlockHandle({ editor, containerRef, onOpenSlashAt }: { editor: Editor; containerRef: React.RefObject<HTMLDivElement | null>; onOpenSlashAt?: (pos: number) => void }) {
  const [handlePos, setHandlePos] = useState<{ top: number; left: number; pos: number; blockEl: Element } | null>(null);
  const [blockMenu, setBlockMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartPosRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);

  const getBlockNodes = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    const editorEl = container.querySelector('.tiptap') as HTMLElement;
    if (!editorEl) return [];
    return Array.from(editorEl.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > ul, :scope > ol, :scope > blockquote, :scope > pre, :scope > hr, :scope > .tableWrapper, :scope > ul[data-type="taskList"], :scope > div'));
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const editorEl = container.querySelector('.tiptap') as HTMLElement;
    if (!editorEl) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (blockMenu || isDragging) return;
      const containerRect = container.getBoundingClientRect();
      const mouseY = e.clientY;

      const blockNodes = getBlockNodes();
      let closestEl: Element | null = null;
      let closestRect: DOMRect | null = null;
      let closestDist = Infinity;

      blockNodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const dist = Math.abs(mouseY - centerY);
        if (dist < closestDist) {
          closestEl = node;
          closestRect = rect;
          closestDist = dist;
        }
      });

      if (closestEl && closestRect && closestDist < 60) {
        const pos = editor.view.posAtDOM(closestEl, 0);
        setHandlePos({
          top: closestRect.top - containerRect.top + container.scrollTop,
          left: closestRect.left - containerRect.left - 56,
          pos,
          blockEl: closestEl,
        });
      } else {
        setHandlePos(null);
      }
    };

    const handleMouseLeave = () => {
      if (!blockMenu && !isDragging) setHandlePos(null);
    };

    editorEl.addEventListener("mousemove", handleMouseMove);
    editorEl.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      editorEl.removeEventListener("mousemove", handleMouseMove);
      editorEl.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [editor, containerRef, blockMenu, isDragging, getBlockNodes]);

  const handlePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!handlePos) return;
    const { state } = editor;
    const resolvedPos = state.doc.resolve(handlePos.pos);
    const blockEnd = resolvedPos.end(resolvedPos.depth);
    editor.chain().focus().insertContentAt(blockEnd + 1, { type: "paragraph" }).setTextSelection(blockEnd + 2).run();
    setTimeout(() => {
      const newPos = editor.state.selection.from;
      editor.chain().insertContentAt(newPos, "/").run();
      if (onOpenSlashAt) {
        setTimeout(() => onOpenSlashAt(editor.state.selection.from), 30);
      }
    }, 50);
  };

  const handleDragStart = (e: React.PointerEvent) => {
    if (!handlePos) return;
    e.preventDefault();
    e.stopPropagation();

    const blockNodes = getBlockNodes();
    const blockIndex = blockNodes.indexOf(handlePos.blockEl);
    if (blockIndex === -1) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let hasDragged = false;

    dragStartPosRef.current = blockIndex;

    const blockEl = handlePos.blockEl as HTMLElement;

    const moveHandler = (ev: PointerEvent) => {
      const dx = Math.abs(ev.clientX - startX);
      const dy = Math.abs(ev.clientY - startY);
      if (!hasDragged && (dx > 4 || dy > 4)) {
        hasDragged = true;
        setIsDragging(true);
        blockEl.style.opacity = "0.4";
        const ghost = document.createElement("div");
        ghost.className = "block-drag-ghost";
        ghost.textContent = blockEl.textContent?.slice(0, 60) || "Block";
        document.body.appendChild(ghost);
        dragGhostRef.current = ghost;
      }
      if (!hasDragged) return;
      if (dragGhostRef.current) {
        dragGhostRef.current.style.top = `${ev.clientY - 16}px`;
        dragGhostRef.current.style.left = `${ev.clientX + 12}px`;
      }
      const currentBlocks = getBlockNodes();
      let closestIdx = -1;
      let closestDist = Infinity;
      currentBlocks.forEach((node, idx) => {
        const rect = node.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const dist = Math.abs(ev.clientY - centerY);
        if (dist < closestDist) { closestIdx = idx; closestDist = dist; }
      });
      const newOverIdx = closestIdx !== dragStartPosRef.current ? closestIdx : null;
      dragOverIndexRef.current = newOverIdx;
      setDragOverIndex(newOverIdx);
    };

    const upHandler = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", moveHandler);
      document.removeEventListener("pointerup", upHandler);

      if (!hasDragged) {
        dragStartPosRef.current = null;
        if (handlePos) {
          editor.chain().focus().setTextSelection(handlePos.pos).run();
          setBlockMenu({ x: ev.clientX, y: ev.clientY });
        }
        return;
      }

      blockEl.style.opacity = "";
      if (dragGhostRef.current) {
        dragGhostRef.current.remove();
        dragGhostRef.current = null;
      }

      const fromIndex = dragStartPosRef.current;
      const toIndex = dragOverIndexRef.current;

      setIsDragging(false);
      setDragOverIndex(null);
      dragStartPosRef.current = null;
      dragOverIndexRef.current = null;

      if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
        const { doc, tr } = editor.state;
        const topLevel = doc.content;
        if (fromIndex < topLevel.childCount && toIndex < topLevel.childCount) {
          let fromStart = 0;
          for (let i = 0; i < fromIndex; i++) fromStart += topLevel.child(i).nodeSize;
          const fromNode = topLevel.child(fromIndex);
          const fromEnd = fromStart + fromNode.nodeSize;
          const slice = doc.slice(fromStart, fromEnd);
          const deleteTr = tr.delete(fromStart, fromEnd);
          let insertAt = 0;
          const adjustedTo = toIndex > fromIndex ? toIndex - 1 : toIndex;
          const newDoc = deleteTr.doc;
          for (let i = 0; i < adjustedTo; i++) insertAt += newDoc.content.child(i).nodeSize;
          deleteTr.insert(insertAt, slice.content);
          editor.view.dispatch(deleteTr);
        }
      }
    };

    document.addEventListener("pointermove", moveHandler);
    document.addEventListener("pointerup", upHandler);
  };

  const blockNodes = isDragging ? getBlockNodes() : [];

  return (
    <>
      {handlePos && !blockMenu && !isDragging && (
        <div
          className="block-handle-container"
          style={{ top: handlePos.top, left: Math.max(0, handlePos.left) }}
          data-testid="block-handle-container"
        >
          <button
            className="block-handle-btn block-handle-plus"
            onClick={handlePlusClick}
            data-testid="block-handle-plus"
            title="Click to add below"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            className="block-handle-btn block-handle-grip"
            onPointerDown={handleDragStart}
            data-testid="block-handle-grip"
            title="Drag to move. Click to open menu."
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {isDragging && blockNodes.map((node, idx) => {
        if (dragOverIndex !== idx) return null;
        const container = containerRef.current;
        if (!container) return null;
        const containerRect = container.getBoundingClientRect();
        const rect = node.getBoundingClientRect();
        const isBelow = dragStartPosRef.current !== null && idx > dragStartPosRef.current;
        return (
          <div
            key={`drop-${idx}`}
            className="block-drop-indicator"
            style={{
              top: (isBelow ? rect.bottom : rect.top) - containerRect.top + container.scrollTop,
              left: rect.left - containerRect.left,
              width: rect.width,
            }}
          />
        );
      })}
      {blockMenu && (
        <BlockMenu
          editor={editor}
          position={blockMenu}
          onClose={() => { setBlockMenu(null); setHandlePos(null); }}
        />
      )}
    </>
  );
}

function LinkEditor({ editor, onClose, position }: { editor: Editor; onClose: () => void; position: { top: number; left: number } }) {
  const [url, setUrl] = useState(editor.getAttributes("link").href || "");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (menuRef.current && !menuRef.current.contains(target)) {
        const toolbar = target.closest('[data-testid="floating-toolbar"]');
        if (!toolbar) onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 100);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handleClick); };
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      const href = url.match(/^https?:\/\//) ? url : `https://${url}`;
      editor.chain().focus().setLink({ href }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    onClose();
  };

  const handleRemove = () => {
    editor.chain().focus().unsetLink().run();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute bg-[#252525] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-[60] w-80"
      style={{ top: position.top, left: position.left }}
      data-testid="link-editor"
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2">
        <LinkIcon className="w-4 h-4 text-white/40 shrink-0" />
        <input
          ref={inputRef}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste link or type URL..."
          className="bg-transparent outline-none text-sm text-white flex-1 placeholder:text-white/30"
          data-testid="input-link-url"
        />
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={handleRemove}
            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
            data-testid="button-remove-link"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        )}
        {url && (
          <a
            href={url.match(/^https?:\/\//) ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </form>
    </div>
  );
}

function FloatingToolbar({ editor, containerRef }: { editor: Editor; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [showTurnInto, setShowTurnInto] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<"text" | "bg" | null>(null);
  const [showLink, setShowLink] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to && !editor.state.selection.empty;

      if (!hasSelection || !containerRef.current) {
        setPosition(null);
        return;
      }

      const startCoords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);
      const containerRect = containerRef.current.getBoundingClientRect();
      const scrollTop = containerRef.current.scrollTop || 0;

      const topY = Math.min(startCoords.top, endCoords.top);
      const midX = (startCoords.left + endCoords.right) / 2 - containerRect.left;
      const toolbarHeight = 48;
      const gap = 8;
      const top = topY - containerRect.top + scrollTop - toolbarHeight - gap;
      const toolbarWidth = 380;
      const maxLeft = containerRect.width - toolbarWidth - 8;

      setPosition({
        top: Math.max(0, top),
        left: Math.max(8, Math.min(midX - toolbarWidth / 2, maxLeft)),
      });
    };

    editor.on("selectionUpdate", updatePosition);
    return () => { editor.off("selectionUpdate", updatePosition); };
  }, [editor, containerRef]);

  useEffect(() => {
    if (!position) {
      setShowTurnInto(false);
      setShowColorPicker(null);
      setShowLink(false);
    }
  }, [position]);

  if (!position) return null;

  const getCurrentBlockLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "H1";
    if (editor.isActive("heading", { level: 2 })) return "H2";
    if (editor.isActive("heading", { level: 3 })) return "H3";
    if (editor.isActive("bulletList")) return "Bullet";
    if (editor.isActive("orderedList")) return "Number";
    if (editor.isActive("taskList")) return "Todo";
    if (editor.isActive("blockquote")) return "Quote";
    if (editor.isActive("codeBlock")) return "Code";
    return "Text";
  };

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50"
      style={{ top: position.top, left: position.left }}
      data-testid="floating-toolbar"
    >
      <div className="flex items-center bg-[#1e1e1e] border border-white/15 rounded-lg shadow-2xl overflow-visible">
        <div className="relative" data-testid="turn-into-wrapper">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setShowTurnInto(!showTurnInto); setShowColorPicker(null); setShowLink(false); }}
            className={cn("bubble-btn gap-1 text-xs font-medium min-w-[50px]", showTurnInto && "bubble-btn-active")}
            data-testid="bubble-turn-into"
            title="Turn into"
          >
            <span>{getCurrentBlockLabel()}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showTurnInto && (
            <TurnIntoMenu editor={editor} onClose={() => setShowTurnInto(false)} />
          )}
        </div>

        <div className="w-px h-5 bg-white/15" />

        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={cn("bubble-btn", editor.isActive("bold") && "bubble-btn-active")}
          data-testid="bubble-bold"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={cn("bubble-btn", editor.isActive("italic") && "bubble-btn-active")}
          data-testid="bubble-italic"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
          className={cn("bubble-btn", editor.isActive("underline") && "bubble-btn-active")}
          data-testid="bubble-underline"
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
          className={cn("bubble-btn", editor.isActive("strike") && "bubble-btn-active")}
          data-testid="bubble-strikethrough"
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
          className={cn("bubble-btn", editor.isActive("code") && "bubble-btn-active")}
          data-testid="bubble-code"
          title="Inline code"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-white/15" />

        <div className="relative">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setShowLink(!showLink); setShowTurnInto(false); setShowColorPicker(null); }}
            className={cn("bubble-btn", (editor.isActive("link") || showLink) && "bubble-btn-active")}
            data-testid="bubble-link"
            title="Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowColorPicker(showColorPicker ? null : "text");
              setShowTurnInto(false);
              setShowLink(false);
            }}
            className={cn("bubble-btn", showColorPicker && "bubble-btn-active")}
            data-testid="bubble-color"
            title="Color"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColorPicker && (
            <ColorPicker editor={editor} onClose={() => setShowColorPicker(null)} mode={showColorPicker} />
          )}
        </div>

        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight().run(); }}
          className={cn("bubble-btn", editor.isActive("highlight") && "bubble-btn-active")}
          data-testid="bubble-highlight"
          title="Highlight"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </button>
      </div>

      {showLink && (
        <LinkEditor
          editor={editor}
          onClose={() => setShowLink(false)}
          position={{ top: 48, left: 0 }}
        />
      )}
    </div>
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
      Highlight.configure({ multicolor: true }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "notion-link" },
      }),
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
        if (event.key === "Escape" && slashMenu) { setSlashMenu(null); return true; }
        if (slashMenu && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")) return true;
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
    if (!text.includes("/")) setSlashMenu(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", handleSlashKeyDetection);
    return () => { editor.off("selectionUpdate", handleSlashKeyDetection); };
  }, [editor, handleSlashKeyDetection]);

  if (!editor) return null;

  return (
    <div ref={editorContainerRef} className="relative rich-editor-wrapper" data-testid="rich-editor">
      <EditorContent editor={editor} />
      <BlockHandle editor={editor} containerRef={editorContainerRef} onOpenSlashAt={(pos) => {
        const coords = editor.view.coordsAtPos(pos);
        const containerRect = editorContainerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setSlashMenu({
            top: coords.bottom - containerRect.top + (editorContainerRef.current?.scrollTop || 0) + 4,
            left: coords.left - containerRect.left,
          });
        }
      }} />
      <FloatingToolbar editor={editor} containerRef={editorContainerRef} />
      {editor.isActive("table") && (
        <NotionTableControls editor={editor} containerRef={editorContainerRef} />
      )}
      {slashMenu && (
        <SlashMenu editor={editor} position={slashMenu} onClose={() => setSlashMenu(null)} onAddPage={onAddPage} />
      )}
    </div>
  );
}
