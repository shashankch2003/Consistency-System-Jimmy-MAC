import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, ChevronDown, GripVertical, Copy, Trash2, MoreHorizontal } from "lucide-react";
import { useNotes, Block, BlockType, makeBlock, uid } from "./NotesContext";
import SlashCommandGrid from "./SlashCommandGrid";
import BlockToolbar from "./BlockToolbar";

const TEXT_COLORS = ["#1a1a1a","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#6b7280","#ffffff"];
const BG_COLORS  = ["transparent","#fef2f2","#fff7ed","#fefce8","#f0fdf4","#eff6ff","#faf5ff","#fdf4ff","#f9fafb","#111827"];

const LANGUAGES = ["javascript","typescript","python","rust","go","java","c","cpp","csharp","html","css","sql","bash","json","yaml","markdown","plaintext"];

interface SlashState { blockId: string; query: string; }
interface ToolbarState { x: number; y: number; blockId: string; }
interface BlockMenuState { x: number; y: number; blockId: string; }
interface ColorPickerState { x: number; y: number; mode: "text" | "bg"; blockId: string; }

export default function BlockEditor() {
  const { selectedPage, updatePage, uid: ctxUid } = useNotes();
  const blocks = selectedPage?.blocks ?? [];
  const locked = selectedPage?.locked ?? false;

  const [history, setHistory] = useState<Block[][]>([blocks]);
  const [histIdx, setHistIdx] = useState(0);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [blockMenu, setBlockMenu] = useState<BlockMenuState | null>(null);
  const [colorPicker, setColorPicker] = useState<ColorPickerState | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [turnIntoOpen, setTurnIntoOpen] = useState(false);

  const elRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingFocusId = useRef<string | null>(null);

  const prevPageId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedPage && selectedPage.id !== prevPageId.current) {
      prevPageId.current = selectedPage.id;
      setHistory([selectedPage.blocks]);
      setHistIdx(0);
    }
  }, [selectedPage?.id]);

  useEffect(() => {
    if (pendingFocusId.current) {
      const el = elRefs.current.get(pendingFocusId.current);
      if (el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      pendingFocusId.current = null;
    }
  });

  const pushHistory = useCallback((newBlocks: Block[]) => {
    setHistory(h => [...h.slice(0, histIdx + 1), newBlocks].slice(-50));
    setHistIdx(i => Math.min(i + 1, 49));
  }, [histIdx]);

  const setBlocks = useCallback((newBlocks: Block[] | ((prev: Block[]) => Block[]), addToHistory = true) => {
    const resolved = typeof newBlocks === "function" ? newBlocks(selectedPage?.blocks ?? []) : newBlocks;
    updatePage(selectedPage!.id, { blocks: resolved });
    if (addToHistory) pushHistory(resolved);
  }, [selectedPage, updatePage, pushHistory]);

  const undo = useCallback(() => {
    if (histIdx > 0) {
      const newIdx = histIdx - 1;
      setHistIdx(newIdx);
      updatePage(selectedPage!.id, { blocks: history[newIdx] });
    }
  }, [histIdx, history, selectedPage, updatePage]);

  const redo = useCallback(() => {
    if (histIdx < history.length - 1) {
      const newIdx = histIdx + 1;
      setHistIdx(newIdx);
      updatePage(selectedPage!.id, { blocks: history[newIdx] });
    }
  }, [histIdx, history, selectedPage, updatePage]);

  const updateBlockContent = useCallback((id: string, content: string, addHist = false) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b), addHist);
  }, [setBlocks]);

  const updateBlockProps = useCallback((id: string, props: Partial<Block["properties"]>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, properties: { ...b.properties, ...props } } : b));
  }, [setBlocks]);

  const insertBlockAfter = useCallback((afterId: string, type: BlockType = "text", content = "") => {
    const newBlock = makeBlock(type, content);
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    pendingFocusId.current = newBlock.id;
    return newBlock.id;
  }, [setBlocks]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev.map(b => b.id === id ? { ...b, content: "" } : b);
      const idx = prev.findIndex(b => b.id === id);
      const prevEl = prev[Math.max(0, idx - 1)];
      pendingFocusId.current = prevEl.id;
      return prev.filter(b => b.id !== id);
    });
  }, [setBlocks]);

  const changeBlockType = useCallback((id: string, type: BlockType) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, type, properties: type === "callout" ? { color: "blue", icon: "💡" } : type === "code" ? { language: "javascript" } : type === "todo" ? { checked: false } : type === "toggle" ? { expanded: true } : {} } : b));
    setSlash(null);
    setTimeout(() => {
      const el = elRefs.current.get(id);
      if (el) { el.focus(); }
    }, 50);
  }, [setBlocks]);

  const duplicateBlock = useCallback((id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const copy = { ...block, id: uid() };
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, [blocks, setBlocks]);

  const moveBlock = useCallback((id: string, dir: "up" | "down") => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (dir === "up" && idx === 0) return prev;
      if (dir === "down" && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, [setBlocks]);

  const applyMarkdownShortcut = useCallback((id: string, rawText: string): boolean => {
    const map: [RegExp, BlockType][] = [
      [/^# $/, "heading1"], [/^## $/, "heading2"], [/^### $/, "heading3"],
      [/^[-*] $/, "bullet_list"], [/^1\. $/, "numbered_list"],
      [/^(\[\] |\[ \] )/, "todo"], [/^> $/, "quote"],
      [/^---$/, "divider"],
    ];
    for (const [re, type] of map) {
      if (re.test(rawText)) {
        const el = elRefs.current.get(id);
        const newContent = el ? el.innerText.replace(re, "") : "";
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, type, content: newContent, properties: type === "todo" ? { checked: false } : type === "callout" ? { color: "blue", icon: "💡" } : {} } : b));
        if (el) el.innerText = newContent;
        return true;
      }
    }
    if (rawText.startsWith("```")) {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, type: "code", content: "", properties: { language: "javascript" } } : b));
      const el = elRefs.current.get(id);
      if (el) el.innerText = "";
      return true;
    }
    return false;
  }, [setBlocks]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>, block: Block) => {
    if (locked) return;

    const el = e.currentTarget as HTMLElement;
    const content = el.innerText;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.key === "y") || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); return; }
      if (e.key === "b") { e.preventDefault(); document.execCommand("bold"); return; }
      if (e.key === "i") { e.preventDefault(); document.execCommand("italic"); return; }
      if (e.key === "u") { e.preventDefault(); document.execCommand("underline"); return; }
      if (e.key === "e") { e.preventDefault(); document.execCommand("insertHTML", false, `<code>${window.getSelection()?.toString()}</code>`); return; }
      if (e.key === "d") { e.preventDefault(); duplicateBlock(block.id); return; }
      if (e.key === "/" ) { e.preventDefault(); setBlockMenu({ x: el.getBoundingClientRect().left, y: el.getBoundingClientRect().bottom, blockId: block.id }); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); moveBlock(block.id, "up"); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); moveBlock(block.id, "down"); return; }
      if (e.key === "Delete") { e.preventDefault(); deleteBlock(block.id); return; }
      const shiftMap: Record<string, BlockType> = { "0": "text", "1": "heading1", "2": "heading2", "3": "heading3", "4": "todo", "5": "bullet_list", "6": "numbered_list" };
      if (e.shiftKey && shiftMap[e.key]) { e.preventDefault(); changeBlockType(block.id, shiftMap[e.key]); return; }
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const newIndent = e.shiftKey ? Math.max(0, block.indent - 1) : Math.min(3, block.indent + 1);
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, indent: newIndent } : b), false);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const currentContent = el.innerText;
      if (block.type === "divider") { insertBlockAfter(block.id); return; }
      if (["bullet_list", "numbered_list", "todo"].includes(block.type) && currentContent.trim() === "") {
        changeBlockType(block.id, "text");
        return;
      }
      const nextType: BlockType = ["bullet_list", "numbered_list"].includes(block.type)
        ? block.type
        : block.type === "todo" ? "todo"
        : "text";
      insertBlockAfter(block.id, nextType);
      return;
    }

    if (e.key === "Backspace" && content === "" && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
      return;
    }

    if (e.key === " ") {
      const text = content + " ";
      applyMarkdownShortcut(block.id, text);
    }
  }, [locked, blocks, undo, redo, duplicateBlock, deleteBlock, insertBlockAfter, changeBlockType, moveBlock, applyMarkdownShortcut, setBlocks]);

  const handleInput = useCallback((e: React.FormEvent<HTMLElement>, block: Block) => {
    const el = e.currentTarget as HTMLElement;
    const text = el.innerText;
    if (text.startsWith("/") && !slash) {
      setSlash({ blockId: block.id, query: text.slice(1) });
    } else if (slash && slash.blockId === block.id) {
      if (text.startsWith("/")) setSlash({ blockId: block.id, query: text.slice(1) });
      else setSlash(null);
    }
    updateBlockContent(block.id, text, false);
  }, [slash, updateBlockContent]);

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim() === "") { setToolbar(null); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      let blockId = "";
      let node: Node | null = range.commonAncestorContainer;
      while (node) {
        const el = node as HTMLElement;
        if (el.dataset?.blockId) { blockId = el.dataset.blockId; break; }
        node = node.parentNode;
      }
      if (blockId) setToolbar({ x: rect.left + rect.width / 2, y: rect.top - 8, blockId });
    }, 10);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSlash(null); setBlockMenu(null); setColorPicker(null); setToolbar(null); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (!selectedPage) return null;

  const numberedCounters: Record<number, number> = {};

  return (
    <div className="w-full min-h-[400px] pb-32" onMouseUp={handleMouseUp}>
      {blocks.map((block, index) => {
        if (block.type === "numbered_list") {
          const indent = block.indent;
          numberedCounters[indent] = (numberedCounters[indent] ?? 0) + 1;
          for (let k = indent + 1; k <= 3; k++) numberedCounters[k] = 0;
        } else if (!["bullet_list","todo"].includes(block.type)) {
          for (let k = 0; k <= 3; k++) numberedCounters[k] = 0;
        }
        const counter = numberedCounters[block.indent] ?? 1;

        return (
          <BlockRow
            key={block.id}
            block={block}
            blocks={blocks}
            index={index}
            counter={counter}
            locked={locked}
            elRefs={elRefs}
            dragId={dragId}
            dragOver={dragOver}
            slash={slash}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onSetDragId={setDragId}
            onSetDragOver={setDragOver}
            onSetSlash={setSlash}
            onSetBlocks={setBlocks}
            onInsertAfter={insertBlockAfter}
            onDelete={deleteBlock}
            onDuplicate={duplicateBlock}
            onChangeType={changeBlockType}
            onUpdateProps={updateBlockProps}
            onBlockMenu={(x, y, id) => setBlockMenu({ x, y, blockId: id })}
          />
        );
      })}

      <div className="py-4 px-1 text-gray-300 text-sm cursor-text min-h-[40px]" onClick={() => {
        if (!locked) {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock?.content === "" && lastBlock?.type === "text") {
            elRefs.current.get(lastBlock.id)?.focus();
          } else {
            insertBlockAfter(blocks[blocks.length - 1]?.id ?? "", "text");
          }
        }
      }}>
        {blocks.length === 0 && "Click to start writing..."}
      </div>

      {slash && (
        <SlashCommandGrid
          query={slash.query}
          onSelect={type => { changeBlockType(slash.blockId, type); const el = elRefs.current.get(slash.blockId); if (el) el.innerText = ""; updateBlockContent(slash.blockId, "", false); }}
          onClose={() => setSlash(null)}
        />
      )}

      {toolbar && (
        <BlockToolbar
          x={toolbar.x}
          y={toolbar.y}
          onClose={() => setToolbar(null)}
          onColorPicker={(mode) => setColorPicker({ x: toolbar.x, y: toolbar.y - 40, mode, blockId: toolbar.blockId })}
        />
      )}

      {colorPicker && (
        <div className="fixed z-[200] bg-gray-900 rounded-lg shadow-xl p-2" style={{ left: colorPicker.x - 80, top: colorPicker.y - 50 }}>
          <div className="flex gap-1 mb-1">
            {(colorPicker.mode === "text" ? TEXT_COLORS : BG_COLORS).map(c => (
              <button
                key={c}
                className="w-5 h-5 rounded cursor-pointer border border-white/20 hover:scale-110 transition-transform"
                style={{ background: c === "transparent" ? "url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAJUlEQVQYV2NkYGBg+M9AAGRgYGD4z8BQDwAAAP//AwAI/AL+hc2rNAAAAABJRU5ErkJggg==\")" : c }}
                onClick={() => {
                  document.execCommand(colorPicker.mode === "text" ? "foreColor" : "backColor", false, c);
                  setColorPicker(null);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {blockMenu && (
        <div className="fixed z-[200] bg-white rounded-lg shadow-xl border py-1 min-w-[180px]" style={{ left: blockMenu.x, top: blockMenu.y }} onClick={() => setBlockMenu(null)}>
          {[
            { label: "Delete", action: () => deleteBlock(blockMenu.blockId), danger: true },
            { label: "Duplicate", action: () => duplicateBlock(blockMenu.blockId) },
            { label: "Move up", action: () => moveBlock(blockMenu.blockId, "up") },
            { label: "Move down", action: () => moveBlock(blockMenu.blockId, "down") },
            { label: "Copy link to block", action: () => {} },
          ].map(item => (
            <button key={item.label} className={`w-full text-left px-4 py-1.5 hover:bg-gray-50 text-sm ${(item as any).danger ? "text-red-500" : "text-gray-700"}`} onClick={item.action}>
              {item.label}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1 px-2 pb-1">
            <div className="text-xs text-gray-400 mb-1 px-2">Turn into</div>
            {(["text","heading1","heading2","heading3","bullet_list","numbered_list","todo","quote","callout","code","divider"] as BlockType[]).map(t => (
              <button key={t} className="w-full text-left px-2 py-1 hover:bg-gray-50 text-sm text-gray-700 rounded" onClick={() => changeBlockType(blockMenu.blockId, t)}>
                {t.replace(/_/g," ")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface BlockRowProps {
  block: Block;
  blocks: Block[];
  index: number;
  counter: number;
  locked: boolean;
  elRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  dragId: string | null;
  dragOver: string | null;
  slash: { blockId: string; query: string } | null;
  onInput: (e: React.FormEvent<HTMLElement>, b: Block) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, b: Block) => void;
  onSetDragId: (id: string | null) => void;
  onSetDragOver: (id: string | null) => void;
  onSetSlash: (s: { blockId: string; query: string } | null) => void;
  onSetBlocks: (fn: Block[] | ((prev: Block[]) => Block[]), hist?: boolean) => void;
  onInsertAfter: (afterId: string, type?: BlockType, content?: string) => string;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onChangeType: (id: string, type: BlockType) => void;
  onUpdateProps: (id: string, props: Partial<Block["properties"]>) => void;
  onBlockMenu: (x: number, y: number, id: string) => void;
}

function BlockRow({ block, blocks, index, counter, locked, elRefs, dragId, dragOver, slash, onInput, onKeyDown, onSetDragId, onSetDragOver, onSetBlocks, onInsertAfter, onDelete, onDuplicate, onChangeType, onUpdateProps, onBlockMenu }: BlockRowProps) {
  const [hovered, setHovered] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(true);
  const indentPx = block.indent * 24;

  const setRef = (el: HTMLElement | null) => {
    if (el) elRefs.current.set(block.id, el);
    else elRefs.current.delete(block.id);
  };

  const baseEditable = {
    "data-block-id": block.id,
    contentEditable: !locked as any,
    suppressContentEditableWarning: true,
    onInput: (e: React.FormEvent<HTMLElement>) => onInput(e, block),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => onKeyDown(e, block),
    dangerouslySetInnerHTML: { __html: block.content },
  };

  const renderContent = () => {
    switch (block.type) {
      case "text": return <div ref={setRef} className="text-base text-gray-700 py-1 px-1 outline-none min-h-[1.75rem] cursor-text" {...baseEditable} />;
      case "heading1": return <div ref={setRef} className="text-3xl font-bold text-gray-900 py-2 px-1 outline-none min-h-[3rem] cursor-text" {...baseEditable} />;
      case "heading2": return <div ref={setRef} className="text-2xl font-semibold text-gray-900 py-2 px-1 outline-none min-h-[2.5rem] cursor-text" {...baseEditable} />;
      case "heading3": return <div ref={setRef} className="text-xl font-medium text-gray-900 py-1 px-1 outline-none min-h-[2rem] cursor-text" {...baseEditable} />;
      case "bullet_list": return (
        <div className="flex items-start gap-2 py-0.5" style={{ paddingLeft: `${indentPx}px` }}>
          <span className="text-gray-400 mt-1 shrink-0 select-none">•</span>
          <div ref={setRef} className="flex-1 text-base text-gray-700 outline-none min-h-[1.75rem] cursor-text" {...baseEditable} />
        </div>
      );
      case "numbered_list": return (
        <div className="flex items-start gap-2 py-0.5" style={{ paddingLeft: `${indentPx}px` }}>
          <span className="text-gray-400 mt-0.5 shrink-0 select-none text-sm w-5 text-right">{counter}.</span>
          <div ref={setRef} className="flex-1 text-base text-gray-700 outline-none min-h-[1.75rem] cursor-text" {...baseEditable} />
        </div>
      );
      case "todo": return (
        <div className="flex items-start gap-2 py-0.5" style={{ paddingLeft: `${indentPx}px` }}>
          <div
            className={`w-4 h-4 rounded border-2 mt-1 shrink-0 cursor-pointer flex items-center justify-center ${block.properties.checked ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}
            onClick={() => onUpdateProps(block.id, { checked: !block.properties.checked })}
          >
            {block.properties.checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
          </div>
          <div ref={setRef} className={`flex-1 text-base outline-none min-h-[1.75rem] cursor-text ${block.properties.checked ? "line-through text-gray-400" : "text-gray-700"}`} {...baseEditable} />
        </div>
      );
      case "toggle": case "toggle_heading1": case "toggle_heading2": case "toggle_heading3": {
        const headingClass = block.type === "toggle_heading1" ? "text-3xl font-bold" : block.type === "toggle_heading2" ? "text-2xl font-semibold" : block.type === "toggle_heading3" ? "text-xl font-medium" : "text-base";
        return (
          <div>
            <div className="flex items-start gap-1 py-0.5">
              <button className="mt-1 text-gray-400 shrink-0 hover:text-gray-700 transition-transform" style={{ transform: block.properties.expanded ? "rotate(90deg)" : "none" }} onClick={() => onUpdateProps(block.id, { expanded: !block.properties.expanded })}>
                <ChevronRight className="w-4 h-4" />
              </button>
              <div ref={setRef} className={`flex-1 ${headingClass} text-gray-900 outline-none min-h-[1.75rem] cursor-text`} {...baseEditable} />
            </div>
            {block.properties.expanded && (
              <div className="pl-6 border-l border-gray-100 ml-2 mt-0.5">
                {block.children.length === 0 && <div className="text-sm text-gray-400 py-1 px-2 italic">Empty — press Enter inside to add content</div>}
                {block.children.map(child => (
                  <div key={child.id} className="text-base text-gray-700 py-0.5 px-1">{child.content}</div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case "quote": return (
        <div className="border-l-4 border-gray-300 pl-4 py-1 my-1">
          <div ref={setRef} className="italic text-gray-600 text-base outline-none min-h-[1.75rem] cursor-text" {...baseEditable} />
        </div>
      );
      case "callout": {
        const colorMap: Record<string, { bg: string; border: string }> = {
          blue: { bg: "bg-blue-50", border: "border-blue-400" },
          amber: { bg: "bg-amber-50", border: "border-amber-400" },
          green: { bg: "bg-green-50", border: "border-green-400" },
          red: { bg: "bg-red-50", border: "border-red-400" },
          purple: { bg: "bg-purple-50", border: "border-purple-400" },
        };
        const c = colorMap[block.properties.color ?? "blue"] ?? colorMap.blue;
        return (
          <div className={`${c.bg} border-l-4 ${c.border} p-3 rounded-r-lg flex gap-3 my-1`}>
            <span className="text-xl shrink-0 cursor-pointer">{block.properties.icon ?? "💡"}</span>
            <div ref={setRef} className="flex-1 text-sm text-gray-700 outline-none min-h-[1.5rem] cursor-text" {...baseEditable} />
          </div>
        );
      }
      case "divider": return <div className="border-t border-gray-200 my-4" />;
      case "code": return (
        <div className="bg-gray-900 rounded-lg my-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <select
              className="bg-transparent text-gray-400 text-xs outline-none"
              value={block.properties.language ?? "javascript"}
              onChange={e => onUpdateProps(block.id, { language: e.target.value })}
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button className="text-gray-400 hover:text-white text-xs flex items-center gap-1" onClick={() => navigator.clipboard.writeText(block.content)}>
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
          <div ref={setRef} className="text-green-400 p-4 font-mono text-sm overflow-x-auto outline-none min-h-[3rem] whitespace-pre cursor-text" {...baseEditable} />
        </div>
      );
      case "table": {
        const rows = block.properties.rows ?? [["", "", ""]];
        return (
          <div className="border border-gray-200 rounded-lg overflow-auto my-1">
            <table className="text-sm w-full">
              <tbody>
                {rows.map((row: string[], ri: number) => (
                  <tr key={ri} className={ri === 0 && block.properties.headerRow ? "bg-gray-50 font-medium" : "hover:bg-gray-50"}>
                    {row.map((cell: string, ci: number) => (
                      <td key={ci} className="border border-gray-200 px-3 py-2">
                        <div
                          contentEditable={!locked}
                          suppressContentEditableWarning
                          className="outline-none min-w-[60px]"
                          dangerouslySetInnerHTML={{ __html: cell }}
                          onInput={e => {
                            const newRows = rows.map((r: string[], ri2: number) => ri2 === ri ? r.map((c: string, ci2: number) => ci2 === ci ? (e.target as HTMLElement).innerText : c) : r);
                            onUpdateProps(block.id, { rows: newRows });
                          }}
                          onKeyDown={e => {
                            if (e.key === "Tab") {
                              e.preventDefault();
                              if (ri === rows.length - 1 && ci === row.length - 1) {
                                const newRow = Array(row.length).fill("");
                                onUpdateProps(block.id, { rows: [...rows, newRow] });
                              }
                            }
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case "image": return (
        <div className="my-2 rounded-lg overflow-hidden border border-gray-200">
          {block.properties.url ? (
            <img src={block.properties.url} alt={block.properties.caption ?? ""} className="w-full object-cover" />
          ) : (
            <div
              className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
              onClick={() => { const u = prompt("Image URL:"); if (u) onUpdateProps(block.id, { url: u }); }}
            >
              <div className="text-3xl mb-2">🖼️</div>
              <p className="text-sm text-gray-400">Click to add image URL</p>
            </div>
          )}
          {block.properties.caption !== undefined && (
            <div className="px-2 py-1 text-xs text-gray-400 text-center" contentEditable suppressContentEditableWarning onInput={e => onUpdateProps(block.id, { caption: (e.target as HTMLElement).innerText })}>{block.properties.caption}</div>
          )}
        </div>
      );
      case "video": return (
        <div className="my-2">
          {block.properties.url ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-gray-900">
              <iframe src={block.properties.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")} className="w-full h-full" allowFullScreen />
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-300 transition-colors" onClick={() => { const u = prompt("Video URL (YouTube/Vimeo):"); if (u) onUpdateProps(block.id, { url: u }); }}>
              <div className="text-3xl mb-2">🎬</div>
              <p className="text-sm text-gray-400">Paste YouTube or Vimeo URL</p>
            </div>
          )}
        </div>
      );
      case "file": return (
        <div className="my-1 flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <span className="text-2xl">📎</span>
          <div>
            <div className="text-sm text-gray-700 font-medium">{block.properties.filename ?? "Click to attach file"}</div>
            {block.properties.size && <div className="text-xs text-gray-400">{block.properties.size}</div>}
          </div>
        </div>
      );
      case "bookmark": return (
        <div className="my-1 border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
          {block.properties.url ? (
            <div className="flex items-start gap-3 p-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{block.properties.title ?? block.properties.url}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{block.properties.url}</div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm cursor-pointer" onClick={() => { const u = prompt("URL:"); if (u) onUpdateProps(block.id, { url: u, title: u }); }}>
              🔖 Paste a URL to create a bookmark
            </div>
          )}
        </div>
      );
      case "embed": return (
        <div className="my-2 rounded-lg overflow-hidden border border-gray-200">
          {block.properties.url ? (
            <iframe src={block.properties.url} className="w-full h-64" />
          ) : (
            <div className="p-8 text-center text-gray-400 text-sm cursor-pointer border-2 border-dashed border-gray-200 rounded-lg" onClick={() => { const u = prompt("Embed URL:"); if (u) onUpdateProps(block.id, { url: u }); }}>
              🔗 Paste URL to embed
            </div>
          )}
        </div>
      );
      default: return <div ref={setRef} className="text-base text-gray-700 py-1 px-1 outline-none cursor-text" {...baseEditable} />;
    }
  };

  const isDropTarget = dragOver === block.id && dragId !== block.id;

  return (
    <div
      className={`group relative py-0.5 ${isDropTarget ? "border-t-2 border-blue-400" : ""}`}
      style={{ paddingLeft: !["bullet_list","numbered_list","todo"].includes(block.type) ? `${indentPx}px` : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={e => { e.preventDefault(); onSetDragOver(block.id); }}
      onDrop={e => {
        e.preventDefault();
        const fromId = e.dataTransfer.getData("blockId");
        if (!fromId || fromId === block.id) { onSetDragOver(null); onSetDragId(null); return; }
        onSetBlocks(prev => {
          const fromIdx = prev.findIndex(b => b.id === fromId);
          const toIdx = prev.findIndex(b => b.id === block.id);
          if (fromIdx === -1 || toIdx === -1) return prev;
          const next = [...prev];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return next;
        });
        onSetDragOver(null);
        onSetDragId(null);
      }}
    >
      {hovered && block.type !== "divider" && (
        <div
          className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab z-10"
          draggable
          onDragStart={e => { e.dataTransfer.setData("blockId", block.id); onSetDragId(block.id); }}
          onDragEnd={() => { onSetDragId(null); onSetDragOver(null); }}
          onContextMenu={e => { e.preventDefault(); onBlockMenu(e.clientX, e.clientY, block.id); }}
          onClick={e => { e.stopPropagation(); onBlockMenu(e.clientX, e.clientY, block.id); }}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <div onContextMenu={e => { e.preventDefault(); onBlockMenu(e.clientX, e.clientY, block.id); }}>
        {renderContent()}
      </div>
    </div>
  );
}

