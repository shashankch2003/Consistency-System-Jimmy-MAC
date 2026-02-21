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
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Copy, XCircle, Trash2, Plus, GripVertical, Table2, Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Highlighter } from "lucide-react";

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

function TableContextMenu({
  state,
  editor,
  onClose,
}: {
  state: ContextMenuState;
  editor: Editor;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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
    action: () => {
      editor.chain().focus().deleteTable().run();
    },
  };

  const items = state.type === "row"
    ? [
        {
          label: "Insert above",
          icon: <ArrowUp className="w-4 h-4" />,
          action: () => {
            focusCellAt(state.index, 0);
            setTimeout(() => editor.chain().focus().addRowBefore().run(), 10);
          },
        },
        {
          label: "Insert below",
          icon: <ArrowDown className="w-4 h-4" />,
          action: () => {
            focusCellAt(state.index, 0);
            setTimeout(() => editor.chain().focus().addRowAfter().run(), 10);
          },
        },
        {
          label: "Duplicate",
          icon: <Copy className="w-4 h-4" />,
          action: () => {
            focusCellAt(state.index, 0);
            setTimeout(() => {
              const row = tableEl?.querySelectorAll("tr")[state.index];
              editor.chain().focus().addRowAfter().run();
              if (row && tableEl) {
                setTimeout(() => {
                  const newRows = tableEl.querySelectorAll("tr");
                  const newRow = newRows[state.index + 1];
                  if (newRow) {
                    const srcCells = row.querySelectorAll("th, td");
                    const dstCells = newRow.querySelectorAll("th, td");
                    srcCells.forEach((srcCell, ci) => {
                      const dstCell = dstCells[ci];
                      if (dstCell && srcCell.textContent) {
                        const pos = editor.view.posAtDOM(dstCell, 0);
                        editor.chain().setTextSelection(pos).insertContent(srcCell.textContent).run();
                      }
                    });
                  }
                }, 50);
              }
            }, 10);
          },
        },
        { type: "separator" as const },
        {
          label: "Clear contents",
          icon: <XCircle className="w-4 h-4" />,
          action: () => {
            if (!tableEl) return;
            const rows = tableEl.querySelectorAll("tr");
            const row = rows[state.index];
            if (!row) return;
            const cells = row.querySelectorAll("th, td");
            cells.forEach(cell => {
              const pos = editor.view.posAtDOM(cell, 0);
              const resolvedPos = editor.state.doc.resolve(pos);
              const cellNode = resolvedPos.parent;
              if (cellNode) {
                editor.chain().setTextSelection(pos).deleteNode("paragraph").insertContentAt(pos, { type: "paragraph" }).run();
              }
            });
          },
        },
        {
          label: "Delete",
          icon: <Trash2 className="w-4 h-4" />,
          danger: true,
          action: () => {
            focusCellAt(state.index, 0);
            setTimeout(() => editor.chain().focus().deleteRow().run(), 10);
          },
        },
        { type: "separator" as const },
        deleteTableAction,
      ]
    : [
        {
          label: "Insert left",
          icon: <ArrowLeft className="w-4 h-4" />,
          action: () => {
            focusCellAt(0, state.index);
            setTimeout(() => editor.chain().focus().addColumnBefore().run(), 10);
          },
        },
        {
          label: "Insert right",
          icon: <ArrowRight className="w-4 h-4" />,
          action: () => {
            focusCellAt(0, state.index);
            setTimeout(() => editor.chain().focus().addColumnAfter().run(), 10);
          },
        },
        {
          label: "Duplicate",
          icon: <Copy className="w-4 h-4" />,
          action: () => {
            focusCellAt(0, state.index);
            setTimeout(() => {
              editor.chain().focus().addColumnAfter().run();
              if (tableEl) {
                setTimeout(() => {
                  const rows = tableEl.querySelectorAll("tr");
                  rows.forEach(row => {
                    const cells = row.querySelectorAll("th, td");
                    const srcCell = cells[state.index];
                    const dstCell = cells[state.index + 1];
                    if (srcCell && dstCell && srcCell.textContent) {
                      const pos = editor.view.posAtDOM(dstCell, 0);
                      editor.chain().setTextSelection(pos).insertContent(srcCell.textContent).run();
                    }
                  });
                }, 50);
              }
            }, 10);
          },
        },
        { type: "separator" as const },
        {
          label: "Clear contents",
          icon: <XCircle className="w-4 h-4" />,
          action: () => {
            if (!tableEl) return;
            const rows = tableEl.querySelectorAll("tr");
            rows.forEach(row => {
              const cells = row.querySelectorAll("th, td");
              const cell = cells[state.index];
              if (cell) {
                const pos = editor.view.posAtDOM(cell, 0);
                editor.chain().setTextSelection(pos).selectNodeBackward().insertContent({ type: "paragraph" }).run();
              }
            });
          },
        },
        {
          label: "Delete",
          icon: <Trash2 className="w-4 h-4" />,
          danger: true,
          action: () => {
            focusCellAt(0, state.index);
            setTimeout(() => editor.chain().focus().deleteColumn().run(), 10);
          },
        },
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
        if ("type" in item && item.type === "separator") {
          return <div key={`sep-${i}`} className="h-px bg-white/10 my-1" />;
        }
        const menuItem = item as { label: string; icon: JSX.Element; action: () => void; danger?: boolean };
        return (
          <button
            key={menuItem.label}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left",
              menuItem.danger
                ? "text-red-400 hover:bg-red-500/10"
                : "text-white/80 hover:bg-white/10"
            )}
            onClick={() => {
              menuItem.action();
              onClose();
            }}
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
    rows: number;
    cols: number;
    tableRect: DOMRect;
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
    if (!tableEl) {
      setTableInfo(null);
      return;
    }

    const tableRect = tableEl.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const rows = tableEl.querySelectorAll("tr");
    const firstRow = rows[0];
    const headerCells = firstRow ? firstRow.querySelectorAll("th, td") : [];

    const rowPositions: { top: number; height: number }[] = [];
    rows.forEach(row => {
      const rect = row.getBoundingClientRect();
      rowPositions.push({
        top: rect.top - containerRect.top + containerRef.current!.scrollTop,
        height: rect.height,
      });
    });

    const colPositions: { left: number; width: number }[] = [];
    headerCells.forEach(cell => {
      const rect = cell.getBoundingClientRect();
      colPositions.push({
        left: rect.left - containerRect.left,
        width: rect.width,
      });
    });

    setTableInfo({
      rows: rows.length,
      cols: headerCells.length,
      tableRect: new DOMRect(
        tableRect.left - containerRect.left,
        tableRect.top - containerRect.top + containerRef.current!.scrollTop,
        tableRect.width,
        tableRect.height
      ),
      rowPositions,
      colPositions,
    });
  }, [editor, containerRef]);

  useEffect(() => {
    updateTableInfo();
    editor.on("selectionUpdate", updateTableInfo);
    editor.on("update", updateTableInfo);

    const observer = new MutationObserver(updateTableInfo);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true });
    }

    return () => {
      editor.off("selectionUpdate", updateTableInfo);
      editor.off("update", updateTableInfo);
      observer.disconnect();
    };
  }, [editor, updateTableInfo, containerRef]);

  if (!tableInfo || !isTableActive) return null;

  const handleRowGripClick = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      type: "row",
      index: rowIndex,
      x: e.clientX,
      y: e.clientY,
      tableEl: activeTableRef.current || undefined,
    });
  };

  const handleColGripClick = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      type: "column",
      index: colIndex,
      x: e.clientX,
      y: e.clientY,
      tableEl: activeTableRef.current || undefined,
    });
  };

  const addRowAtEnd = () => {
    const tbl = activeTableRef.current;
    if (!tbl) return;
    const rows = tbl.querySelectorAll("tr");
    const lastRow = rows[rows.length - 1];
    if (!lastRow) return;
    const lastCell = lastRow.querySelector("td, th");
    if (!lastCell) return;
    const pos = editor.view.posAtDOM(lastCell, 0);
    editor.chain().focus().setTextSelection(pos).addRowAfter().run();
  };

  const addColAtEnd = () => {
    const tbl = activeTableRef.current;
    if (!tbl) return;
    const firstRow = tbl.querySelector("tr");
    if (!firstRow) return;
    const cells = firstRow.querySelectorAll("th, td");
    const lastCell = cells[cells.length - 1];
    if (!lastCell) return;
    const pos = editor.view.posAtDOM(lastCell, 0);
    editor.chain().focus().setTextSelection(pos).addColumnAfter().run();
  };

  return (
    <>
      {tableInfo.rowPositions.map((pos, i) => (
        <button
          key={`row-grip-${i}`}
          className="table-grip table-grip-row"
          style={{
            top: pos.top,
            left: tableInfo.tableRect.x - 24,
            height: pos.height,
          }}
          onClick={(e) => handleRowGripClick(e, i)}
          data-testid={`table-row-grip-${i}`}
        >
          <GripVertical className="w-3 h-3" />
        </button>
      ))}

      {tableInfo.colPositions.map((pos, i) => (
        <button
          key={`col-grip-${i}`}
          className="table-grip table-grip-col"
          style={{
            left: pos.left,
            top: tableInfo.tableRect.y - 24,
            width: pos.width,
          }}
          onClick={(e) => handleColGripClick(e, i)}
          data-testid={`table-col-grip-${i}`}
        >
          <GripVertical className="w-3 h-3 rotate-90" />
        </button>
      ))}

      <button
        className="table-add-btn table-add-row-btn"
        style={{
          top: tableInfo.tableRect.y + tableInfo.tableRect.height + 2,
          left: tableInfo.tableRect.x,
          width: tableInfo.tableRect.width,
        }}
        onClick={addRowAtEnd}
        data-testid="button-add-row-bottom"
        title="Add row"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      <button
        className="table-add-btn table-add-col-btn"
        style={{
          left: tableInfo.tableRect.x + tableInfo.tableRect.width + 2,
          top: tableInfo.tableRect.y,
          height: tableInfo.tableRect.height,
        }}
        onClick={addColAtEnd}
        data-testid="button-add-col-right"
        title="Add column"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {contextMenu && (
        <TableContextMenu
          state={contextMenu}
          editor={editor}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

function FloatingToolbar({ editor, containerRef }: { editor: Editor; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
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
      const toolbarWidth = 240;
      const maxLeft = containerRect.width - toolbarWidth - 8;

      setPosition({
        top: Math.max(0, top),
        left: Math.max(8, Math.min(midX - toolbarWidth / 2, maxLeft)),
      });
    };

    editor.on("selectionUpdate", updatePosition);
    return () => { editor.off("selectionUpdate", updatePosition); };
  }, [editor, containerRef]);

  if (!position) return null;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50"
      style={{ top: position.top, left: position.left }}
      data-testid="floating-toolbar"
    >
      <div className="flex items-center bg-[#1e1e1e] border border-white/15 rounded-lg shadow-2xl overflow-hidden">
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
        <div className="w-px h-5 bg-white/15" />
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
          className={cn("bubble-btn", editor.isActive("code") && "bubble-btn-active")}
          data-testid="bubble-code"
          title="Code"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight().run(); }}
          className={cn("bubble-btn", editor.isActive("highlight") && "bubble-btn-active")}
          data-testid="bubble-highlight"
          title="Highlight"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </button>
      </div>
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
      Highlight,
      Underline,
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
      <FloatingToolbar editor={editor} containerRef={editorContainerRef} />
      {editor.isActive("table") && (
        <NotionTableControls editor={editor} containerRef={editorContainerRef} />
      )}
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
