import { useState, useRef, useCallback } from "react";
import { Filter, ArrowUpDown, Layers, Plus, ChevronLeft, ChevronRight, GripVertical, X, Check } from "lucide-react";

type PropertyType = "text" | "number" | "select" | "multi_select" | "status" | "date" | "person" | "checkbox" | "url" | "email" | "phone" | "files" | "formula" | "relation" | "rollup" | "created_time" | "last_edited" | "created_by" | "last_edited_by";
type ViewType = "Table" | "Board" | "Calendar" | "Timeline" | "Gallery" | "List";

interface DBProperty { id: string; name: string; type: PropertyType; options?: string[]; width?: number; }
interface DBRow { id: string; values: Record<string, any>; }
interface FilterRule { id: string; propId: string; operator: string; value: string; }
interface SortRule { id: string; propId: string; dir: "asc" | "desc"; }
interface DBView { id: string; name: ViewType; groupBy?: string; }

const INITIAL_PROPERTIES: DBProperty[] = [
  { id: "name", name: "Name", type: "text", width: 200 },
  { id: "status", name: "Status", type: "status", options: ["To Do", "In Progress", "Review", "Done"], width: 130 },
  { id: "priority", name: "Priority", type: "select", options: ["🔴 High", "🟡 Medium", "🟢 Low"], width: 120 },
  { id: "assignee", name: "Assignee", type: "person", width: 120 },
  { id: "due", name: "Due Date", type: "date", width: 120 },
  { id: "done", name: "Done", type: "checkbox", width: 80 },
  { id: "url", name: "URL", type: "url", width: 160 },
];

const INITIAL_ROWS: DBRow[] = [
  { id: "r1", values: { name: "Design System Audit", status: "In Progress", priority: "🔴 High", assignee: "Alice Kim", due: "2026-03-28", done: false, url: "" } },
  { id: "r2", values: { name: "API Documentation", status: "Review", priority: "🟡 Medium", assignee: "Bob Lee", due: "2026-04-02", done: false, url: "" } },
  { id: "r3", values: { name: "User Testing", status: "To Do", priority: "🟡 Medium", assignee: "Carol M.", due: "2026-04-05", done: false, url: "" } },
  { id: "r4", values: { name: "Performance Audit", status: "Done", priority: "🟢 Low", assignee: "Dana N.", due: "2026-03-20", done: true, url: "" } },
  { id: "r5", values: { name: "Security Review", status: "To Do", priority: "🔴 High", assignee: "Eve O.", due: "2026-04-10", done: false, url: "" } },
];

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "text", label: "📝 Text" }, { value: "number", label: "🔢 Number" },
  { value: "select", label: "⬇️ Select" }, { value: "multi_select", label: "🏷️ Multi-select" },
  { value: "status", label: "🔵 Status" }, { value: "date", label: "📅 Date" },
  { value: "person", label: "👤 Person" }, { value: "checkbox", label: "☑️ Checkbox" },
  { value: "url", label: "🔗 URL" }, { value: "email", label: "📧 Email" },
  { value: "phone", label: "📞 Phone" }, { value: "files", label: "📁 Files" },
  { value: "formula", label: "∑ Formula" }, { value: "relation", label: "↔️ Relation" },
  { value: "rollup", label: "📊 Rollup" }, { value: "created_time", label: "🕒 Created time" },
  { value: "last_edited", label: "✏️ Last edited" }, { value: "created_by", label: "👤 Created by" },
  { value: "last_edited_by", label: "👤 Last edited by" },
];

const STATUS_COLORS: Record<string, string> = {
  "To Do": "bg-gray-100 text-gray-600",
  "In Progress": "bg-yellow-100 text-yellow-700",
  "Review": "bg-blue-100 text-blue-700",
  "Done": "bg-green-100 text-green-700",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const VIEWS: ViewType[] = ["Table","Board","Calendar","Timeline","Gallery","List"];

function uid() { return Math.random().toString(36).slice(2, 10); }

function CellEditor({ prop, value, onChange, onClose }: { prop: DBProperty; value: any; onChange: (v: any) => void; onClose: () => void }) {
  if (prop.type === "checkbox") {
    return (
      <div className="flex items-center justify-center w-full h-full" onClick={() => { onChange(!value); onClose(); }}>
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${value ? "bg-blue-500 border-blue-500" : "border-gray-400 hover:border-blue-400"}`}>
          {value && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
    );
  }
  if (prop.type === "select" || prop.type === "status") {
    return (
      <div className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px]" style={{ top: "100%", left: 0 }}>
        {(prop.options ?? []).map(opt => (
          <div key={opt} className="px-3 py-1.5 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-sm" onClick={() => { onChange(opt); onClose(); }}>
            {prop.type === "status" && <span className={`w-2 h-2 rounded-full ${opt === "Done" ? "bg-green-500" : opt === "In Progress" ? "bg-yellow-500" : opt === "Review" ? "bg-blue-500" : "bg-gray-400"}`} />}
            {opt}
          </div>
        ))}
        <div className="px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-blue-600 border-t border-gray-100" onClick={() => {
          const name = prompt("New option name:");
          if (name) { onChange(name); onClose(); }
        }}>+ Add option</div>
      </div>
    );
  }
  return (
    <input
      autoFocus
      className="w-full h-full outline-none bg-transparent text-sm text-gray-800 px-1"
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      onBlur={onClose}
      onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") onClose(); }}
    />
  );
}

function CellValue({ prop, value }: { prop: DBProperty; value: any }) {
  if (prop.type === "checkbox") return <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${value ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>{value && <Check className="w-3 h-3 text-white" />}</div>;
  if (prop.type === "status" && value) return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[value] ?? "bg-gray-100 text-gray-600"}`}>{value}</span>;
  if (prop.type === "select" && value) return <span className="text-xs bg-purple-50 text-purple-700 rounded-full px-2 py-0.5">{value}</span>;
  if (prop.type === "date" && value) return <span className="text-xs text-gray-500">{value}</span>;
  if (prop.type === "person" && value) {
    const initials = (value as string).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    return <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white">{initials}</div><span className="text-xs text-gray-600 truncate">{value}</span></div>;
  }
  if (prop.type === "url" && value) return <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline truncate" onClick={e => e.stopPropagation()}>{value}</a>;
  return <span className="text-sm text-gray-700 truncate">{value != null ? String(value) : ""}</span>;
}

export default function DatabaseView({ title = "Task Tracker" }: { title?: string }) {
  const [properties, setProperties] = useState<DBProperty[]>(INITIAL_PROPERTIES);
  const [rows, setRows] = useState<DBRow[]>(INITIAL_ROWS);
  const [views] = useState<DBView[]>([
    { id: "v1", name: "Table" }, { id: "v2", name: "Board" },
    { id: "v3", name: "Calendar" }, { id: "v4", name: "Timeline" },
    { id: "v5", name: "Gallery" }, { id: "v6", name: "List" },
  ]);
  const [activeView, setActiveView] = useState<ViewType>("Table");
  const [editingCell, setEditingCell] = useState<{ rowId: string; propId: string } | null>(null);
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [groupBy, setGroupBy] = useState<string>("status");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showAddProp, setShowAddProp] = useState(false);
  const [newPropName, setNewPropName] = useState("");
  const [newPropType, setNewPropType] = useState<PropertyType>("text");
  const [calMonth, setCalMonth] = useState(new Date());
  const [dragCard, setDragCard] = useState<{ rowId: string; fromCol: string } | null>(null);
  const [openRow, setOpenRow] = useState<DBRow | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1);

  const getCell = (row: DBRow, propId: string) => row.values[propId] ?? "";
  const setCell = (rowId: string, propId: string, value: any) => setRows(rs => rs.map(r => r.id === rowId ? { ...r, values: { ...r.values, [propId]: value } } : r));
  const addRow = () => setRows(rs => [...rs, { id: uid(), values: { name: "New item", status: "To Do", done: false } }]);
  const deleteRow = (rowId: string) => setRows(rs => rs.filter(r => r.id !== rowId));

  const addProperty = () => {
    if (!newPropName.trim()) return;
    setProperties(ps => [...ps, { id: uid(), name: newPropName.trim(), type: newPropType, width: 140, options: newPropType === "select" || newPropType === "status" || newPropType === "multi_select" ? ["Option 1", "Option 2"] : undefined }]);
    setNewPropName(""); setShowAddProp(false);
  };

  const sortedRows = useCallback(() => {
    let out = [...rows];
    filterRules.forEach(f => {
      const prop = properties.find(p => p.id === f.propId);
      if (!prop) return;
      out = out.filter(r => {
        const val = String(getCell(r, f.propId)).toLowerCase();
        const fv = f.value.toLowerCase();
        if (f.operator === "contains") return val.includes(fv);
        if (f.operator === "not_contains") return !val.includes(fv);
        if (f.operator === "equals") return val === fv;
        if (f.operator === "not_equals") return val !== fv;
        if (f.operator === "is_empty") return !val;
        return true;
      });
    });
    sortRules.forEach(s => {
      out.sort((a, b) => {
        const av = String(getCell(a, s.propId)), bv = String(getCell(b, s.propId));
        return s.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    });
    return out;
  }, [rows, filterRules, sortRules, properties]);

  const boardGroups = useCallback(() => {
    const prop = properties.find(p => p.id === groupBy);
    const options = prop?.options ?? [];
    const grouped: Record<string, DBRow[]> = {};
    options.forEach(o => { grouped[o] = []; });
    grouped[""] = [];
    sortedRows().forEach(r => {
      const val = getCell(r, groupBy) ?? "";
      if (grouped[val]) grouped[val].push(r);
      else grouped[""] = [...(grouped[""] || []), r];
    });
    return options.map(o => ({ col: o, rows: grouped[o] ?? [] }));
  }, [sortedRows, groupBy, properties]);

  const calDays = useCallback(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startPad = first.getDay();
    const days: (Date | null)[] = Array(startPad).fill(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calMonth]);

  const handleColumnSort = (propId: string) => {
    setSortRules(rs => {
      const existing = rs.find(r => r.propId === propId);
      if (!existing) return [...rs, { id: uid(), propId, dir: "asc" }];
      if (existing.dir === "asc") return rs.map(r => r.propId === propId ? { ...r, dir: "desc" } : r);
      return rs.filter(r => r.propId !== propId);
    });
  };

  const getSortDir = (propId: string) => sortRules.find(r => r.propId === propId)?.dir;

  const resizeRef = useRef<{ propId: string; startX: number; startW: number } | null>(null);

  const startResize = (e: React.MouseEvent, propId: string, startW: number) => {
    e.preventDefault();
    resizeRef.current = { propId, startX: e.clientX, startW };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientX - resizeRef.current.startX;
      setProperties(ps => ps.map(p => p.id === resizeRef.current!.propId ? { ...p, width: Math.max(80, resizeRef.current!.startW + delta) } : p));
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const rows$ = sortedRows();
  const groups$ = boardGroups();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden my-2">
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="font-medium text-sm text-gray-800">{title}</span>
        <div className="flex gap-0.5">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`text-xs px-2.5 py-1 rounded-md cursor-pointer transition-colors font-medium ${v === activeView ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}>
              {v === "Table" ? "⊞" : v === "Board" ? "⬛" : v === "Calendar" ? "📅" : v === "Timeline" ? "━" : v === "Gallery" ? "⊟" : "☰"} {v}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-1.5 border-b border-gray-100 flex gap-3 text-xs text-gray-500 flex-wrap">
        <button className={`flex items-center gap-1 hover:text-gray-700 ${showFilter ? "text-blue-600" : ""}`} onClick={() => setShowFilter(v => !v)}>
          <Filter className="w-3 h-3" /> Filter {filterRules.length > 0 && <span className="bg-blue-100 text-blue-700 rounded-full px-1">{filterRules.length}</span>}
        </button>
        <button className={`flex items-center gap-1 hover:text-gray-700 ${showSort ? "text-blue-600" : ""}`} onClick={() => setShowSort(v => !v)}>
          <ArrowUpDown className="w-3 h-3" /> Sort {sortRules.length > 0 && <span className="bg-blue-100 text-blue-700 rounded-full px-1">{sortRules.length}</span>}
        </button>
        <button className={`flex items-center gap-1 hover:text-gray-700 ${showGroup ? "text-blue-600" : ""}`} onClick={() => setShowGroup(v => !v)}>
          <Layers className="w-3 h-3" /> Group by: {properties.find(p => p.id === groupBy)?.name ?? "none"}
        </button>
        <button className="flex items-center gap-1 hover:text-gray-700 ml-auto" onClick={() => setShowAddProp(v => !v)}>
          <Plus className="w-3 h-3" /> Property
        </button>
      </div>

      {showFilter && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 mb-2">Filters (AND logic)</div>
          {filterRules.map(f => (
            <div key={f.id} className="flex gap-2 items-center mb-1.5">
              <select className="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none bg-white" value={f.propId} onChange={e => setFilterRules(fs => fs.map(r => r.id === f.id ? { ...r, propId: e.target.value } : r))}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none bg-white" value={f.operator} onChange={e => setFilterRules(fs => fs.map(r => r.id === f.id ? { ...r, operator: e.target.value } : r))}>
                {["contains","not_contains","equals","not_equals","is_empty"].map(op => <option key={op} value={op}>{op.replace(/_/g, " ")}</option>)}
              </select>
              <input className="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none flex-1" value={f.value} onChange={e => setFilterRules(fs => fs.map(r => r.id === f.id ? { ...r, value: e.target.value } : r))} placeholder="value..." />
              <button className="text-gray-400 hover:text-red-500" onClick={() => setFilterRules(fs => fs.filter(r => r.id !== f.id))}><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button className="text-xs text-blue-600 hover:underline" onClick={() => setFilterRules(fs => [...fs, { id: uid(), propId: properties[0]?.id ?? "", operator: "contains", value: "" }])}>+ Add filter</button>
        </div>
      )}

      {showSort && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 mb-2">Sort rules</div>
          {sortRules.map(s => (
            <div key={s.id} className="flex gap-2 items-center mb-1.5">
              <select className="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none bg-white" value={s.propId} onChange={e => setSortRules(rs => rs.map(r => r.id === s.id ? { ...r, propId: e.target.value } : r))}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none bg-white" value={s.dir} onChange={e => setSortRules(rs => rs.map(r => r.id === s.id ? { ...r, dir: e.target.value as "asc"|"desc" } : r))}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <button className="text-gray-400 hover:text-red-500" onClick={() => setSortRules(rs => rs.filter(r => r.id !== s.id))}><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button className="text-xs text-blue-600 hover:underline" onClick={() => setSortRules(rs => [...rs, { id: uid(), propId: properties[0]?.id ?? "", dir: "asc" }])}>+ Add sort</button>
        </div>
      )}

      {showGroup && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 mb-2">Group by</div>
          <div className="flex flex-wrap gap-2">
            {properties.filter(p => p.type === "select" || p.type === "status").map(p => (
              <button key={p.id} onClick={() => { setGroupBy(p.id); setShowGroup(false); }}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${groupBy === p.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAddProp && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 mb-2">New property</div>
          <div className="flex gap-2 items-center">
            <input className="text-sm border border-gray-200 rounded px-2 py-1 outline-none flex-1" placeholder="Property name..." value={newPropName} onChange={e => setNewPropName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addProperty(); }} autoFocus />
            <select className="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none bg-white" value={newPropType} onChange={e => setNewPropType(e.target.value as PropertyType)}>
              {PROPERTY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600" onClick={addProperty}>Add</button>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowAddProp(false)}><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {activeView === "Table" && (
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="text-sm border-collapse" style={{ minWidth: properties.reduce((a, p) => a + (p.width ?? 140), 0) }}>
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="w-8 border-b border-r border-gray-200" />
                {properties.map(prop => (
                  <th key={prop.id} className="border-b border-r border-gray-200 text-left font-medium text-xs text-gray-500 group/th relative" style={{ width: prop.width }}>
                    <div className="flex items-center px-3 py-2 gap-1 cursor-pointer" onClick={() => handleColumnSort(prop.id)}>
                      <span className="truncate">{prop.name}</span>
                      {getSortDir(prop.id) && <span className="text-blue-500">{getSortDir(prop.id) === "asc" ? "↑" : "↓"}</span>}
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover/th:opacity-100 hover:bg-blue-400" onMouseDown={e => startResize(e, prop.id, prop.width ?? 140)} />
                  </th>
                ))}
                <th className="border-b border-gray-200 w-12">
                  <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2" onClick={() => setShowAddProp(true)}><Plus className="w-3 h-3" /></button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows$.map((row, ri) => (
                <tr key={row.id} className="group/row border-b border-gray-100 hover:bg-gray-50">
                  <td className="border-r border-gray-100 px-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-300 group-hover/row:text-gray-500 w-4">{ri + 1}</span>
                      <GripVertical className="w-3 h-3 text-gray-300 opacity-0 group-hover/row:opacity-100 cursor-grab" />
                    </div>
                  </td>
                  {properties.map(prop => (
                    <td key={prop.id} className="border-r border-gray-100 px-3 py-1.5 relative cursor-pointer" style={{ width: prop.width }}
                      onClick={() => { if (prop.type !== "url") setEditingCell({ rowId: row.id, propId: prop.id }); }}>
                      {editingCell?.rowId === row.id && editingCell?.propId === prop.id
                        ? <div className="relative"><CellEditor prop={prop} value={getCell(row, prop.id)} onChange={v => setCell(row.id, prop.id, v)} onClose={() => setEditingCell(null)} /></div>
                        : <CellValue prop={prop} value={getCell(row, prop.id)} />}
                    </td>
                  ))}
                  <td className="px-2">
                    <button className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-400 text-xs" onClick={() => deleteRow(row.id)}>✕</button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={properties.length + 2} className="px-4 py-2">
                  <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600" onClick={addRow}><Plus className="w-3 h-3" /> New row</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeView === "Board" && (
        <div className="flex gap-4 p-4 overflow-x-auto min-h-[320px]">
          {groups$.map(({ col, rows: colRows }) => (
            <div key={col} className="w-52 shrink-0"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                const fromId = e.dataTransfer.getData("rowId");
                if (fromId && dragCard) setCell(fromId, groupBy, col);
                setDragCard(null);
              }}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[col] ?? "bg-gray-100 text-gray-600"}`}>{col || "No group"}</span>
                <span className="text-xs text-gray-400">{colRows.length}</span>
              </div>
              <div className="space-y-2">
                {colRows.map(row => (
                  <div key={row.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab hover:shadow-md transition-shadow"
                    draggable onDragStart={e => { e.dataTransfer.setData("rowId", row.id); setDragCard({ rowId: row.id, fromCol: col }); }}
                    onClick={() => setOpenRow(row)}>
                    <div className="font-medium text-sm text-gray-800 mb-1.5">{row.values.name || "Untitled"}</div>
                    {properties.filter(p => p.id !== "name" && p.id !== groupBy).slice(0, 2).map(p => (
                      <div key={p.id} className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-400 shrink-0">{p.name}:</span>
                        <div className="flex-1 min-w-0"><CellValue prop={p} value={getCell(row, p.id)} /></div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <button className="mt-2 w-full text-xs text-gray-400 hover:bg-gray-50 rounded py-1 flex items-center gap-1 justify-center" onClick={() => { const newRow: DBRow = { id: uid(), values: { name: "New item", [groupBy]: col } }; setRows(rs => [...rs, newRow]); }}><Plus className="w-3 h-3" /> Add</button>
            </div>
          ))}
          <button className="w-40 h-10 shrink-0 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors self-start flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" /> Add group
          </button>
        </div>
      )}

      {activeView === "Calendar" && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
            <span className="font-semibold text-sm text-gray-800">{MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
            <button onClick={() => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className="bg-gray-50 text-center text-xs font-medium text-gray-400 py-1.5">{d}</div>
            ))}
            {calDays().map((day, i) => {
              const dayStr = day ? `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}` : "";
              const dayRows = rows$.filter(r => getCell(r, "due") === dayStr);
              const isToday = day && day.toDateString() === new Date().toDateString();
              return (
                <div key={i} className={`bg-white min-h-[80px] p-1 ${!day ? "bg-gray-50 opacity-50" : "cursor-pointer hover:bg-blue-50/30"}`}
                  onClick={() => { if (day) { const nr: DBRow = { id: uid(), values: { name: "New", due: dayStr, status: "To Do" } }; setRows(rs => [...rs, nr]); } }}>
                  {day && <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-blue-500 text-white" : "text-gray-500"}`}>{day.getDate()}</div>}
                  {dayRows.map(r => (
                    <div key={r.id} className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 truncate mb-0.5 cursor-grab" draggable onDragStart={e => e.dataTransfer.setData("rowId", r.id)}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}>{r.values.name || "Untitled"}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeView === "Timeline" && (
        <div className="p-4 overflow-x-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">Timeline</span>
            <div className="ml-auto flex gap-1">
              {[0.5, 1, 2].map(z => (
                <button key={z} onClick={() => setTimelineZoom(z)} className={`text-xs px-2 py-0.5 rounded ${timelineZoom === z ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {z === 0.5 ? "Month" : z === 1 ? "Week" : "Day"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2" style={{ minWidth: 600 }}>
            {rows$.filter(r => r.values.due).map(row => {
              const dueDate = new Date(row.values.due);
              const today = new Date();
              const start = new Date(today.getFullYear(), today.getMonth(), 1);
              const dayDiff = Math.floor((dueDate.getTime() - start.getTime()) / 86400000);
              const left = Math.max(0, dayDiff * 24 * timelineZoom);
              const width = Math.max(80, 100 * timelineZoom);
              return (
                <div key={row.id} className="relative h-9 flex items-center">
                  <div className="w-40 shrink-0 text-xs text-gray-600 truncate pr-2">{row.values.name || "Untitled"}</div>
                  <div className="flex-1 relative h-6 bg-gray-50 rounded">
                    <div className="absolute h-6 rounded-full flex items-center px-2 text-xs font-medium cursor-grab select-none"
                      style={{ left: `${Math.min(left, 300)}px`, width: `${width}px`, background: row.values.status === "Done" ? "#dcfce7" : row.values.status === "In Progress" ? "#fef9c3" : "#dbeafe", color: row.values.status === "Done" ? "#166534" : row.values.status === "In Progress" ? "#854d0e" : "#1e40af" }}>
                      <span className="truncate">{row.values.status || "To Do"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeView === "Gallery" && (
        <div className="p-4 grid grid-cols-3 gap-3 max-h-[440px] overflow-y-auto">
          {rows$.map(row => (
            <div key={row.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setOpenRow(row)}>
              <div className={`h-24 bg-gradient-to-br ${row.values.status === "Done" ? "from-green-100 to-teal-100" : row.values.status === "In Progress" ? "from-yellow-100 to-orange-100" : row.values.status === "Review" ? "from-blue-100 to-indigo-100" : "from-gray-100 to-gray-200"} flex items-center justify-center text-3xl`}>
                {row.values.done ? "✅" : row.values.priority === "🔴 High" ? "🔴" : row.values.priority === "🟡 Medium" ? "🟡" : "🟢"}
              </div>
              <div className="p-3">
                <div className="font-medium text-sm text-gray-800 mb-1 truncate">{row.values.name || "Untitled"}</div>
                {properties.filter(p => p.id !== "name").slice(0, 2).map(p => (
                  <div key={p.id} className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-400 shrink-0">{p.name}:</span>
                    <div className="min-w-0 flex-1"><CellValue prop={p} value={getCell(row, p.id)} /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="border-2 border-dashed border-gray-200 rounded-xl h-40 flex items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors" onClick={addRow}>
            <span className="text-sm text-gray-400 flex items-center gap-1"><Plus className="w-4 h-4" /> New item</span>
          </div>
        </div>
      )}

      {activeView === "List" && (
        <div className="max-h-[440px] overflow-y-auto">
          {rows$.map(row => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer group/list" onClick={() => setOpenRow(row)}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${row.values.status === "Done" ? "bg-green-500" : row.values.status === "In Progress" ? "bg-yellow-500" : row.values.status === "Review" ? "bg-blue-500" : "bg-gray-400"}`} />
              <span className="flex-1 text-sm text-gray-800 font-medium truncate">{row.values.name || "Untitled"}</span>
              {properties.filter(p => p.id !== "name").slice(0, 3).map(p => (
                <div key={p.id} className="shrink-0"><CellValue prop={p} value={getCell(row, p.id)} /></div>
              ))}
              <button className="opacity-0 group-hover/list:opacity-100 text-gray-300 hover:text-red-400 text-xs" onClick={e => { e.stopPropagation(); deleteRow(row.id); }}>✕</button>
            </div>
          ))}
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-600 w-full" onClick={addRow}><Plus className="w-4 h-4" /> New item</button>
        </div>
      )}

      {openRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setOpenRow(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="font-semibold text-gray-900">{openRow.values.name || "Untitled"}</h3>
              <button onClick={() => setOpenRow(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {properties.map(prop => (
                <div key={prop.id} className="flex items-start gap-3">
                  <span className="text-sm text-gray-400 w-28 shrink-0 pt-0.5">{prop.name}</span>
                  <div className="flex-1 relative">
                    {editingCell?.rowId === openRow.id && editingCell?.propId === prop.id
                      ? <CellEditor prop={prop} value={getCell(openRow, prop.id)} onChange={v => { setCell(openRow.id, prop.id, v); setOpenRow(r => r ? { ...r, values: { ...r.values, [prop.id]: v } } : r); }} onClose={() => setEditingCell(null)} />
                      : <div className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 min-h-[24px]" onClick={() => setEditingCell({ rowId: openRow.id, propId: prop.id })}><CellValue prop={prop} value={getCell(openRow, prop.id)} /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
