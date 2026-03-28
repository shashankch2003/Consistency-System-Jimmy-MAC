import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table2, Columns, Calendar, GanttChart, List, Plus, Filter, ArrowUpDown, Trash2,
  GripVertical, ExternalLink, ChevronDown, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const COLOR_CLASSES: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  gray: "bg-gray-400",
};

const BADGE_BG: Record<string, string> = {
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  pink: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  gray: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const PROPERTY_TYPES = [
  "text", "number", "select", "multiSelect", "date", "checkbox",
  "url", "email", "phone", "status", "createdTime", "lastEditedTime",
];

const VIEW_ICONS = [
  { id: "table", Icon: Table2 },
  { id: "board", Icon: Columns },
  { id: "calendar", Icon: Calendar },
  { id: "timeline", Icon: GanttChart },
  { id: "list", Icon: List },
];

interface Props {
  databaseId: number;
}

export default function DatabaseTableView({ databaseId }: Props) {
  const [title, setTitle] = useState("");
  const titleTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [filterPropertyId, setFilterPropertyId] = useState<string>("");
  const [filterOperator, setFilterOperator] = useState<string>("equals");
  const [filterValue, setFilterValue] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<{ propertyId: string; operator: string; value: string } | null>(null);

  const [sortBy, setSortBy] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeSort, setActiveSort] = useState<{ propertyId: string; dir: "asc" | "desc" } | null>(null);

  const [newPropName, setNewPropName] = useState("");
  const [newPropType, setNewPropType] = useState("text");
  const [newPropOpen, setNewPropOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const [editingProp, setEditingProp] = useState<number | null>(null);
  const [editingPropName, setEditingPropName] = useState("");
  const [columnMenuOpen, setColumnMenuOpen] = useState<number | null>(null);

  const [openCellDropdown, setOpenCellDropdown] = useState<string | null>(null);
  const [newOptionName, setNewOptionName] = useState("");

  const { data: database, isLoading } = useQuery<any>({
    queryKey: ["pm-database", databaseId],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}`).then(r => r.json()),
  });

  const rowQueryParams = new URLSearchParams();
  if (activeSort) { rowQueryParams.set("sortBy", activeSort.propertyId); rowQueryParams.set("sortDir", activeSort.dir); }
  if (activeFilter) { rowQueryParams.set("filterPropertyId", activeFilter.propertyId); rowQueryParams.set("filterOperator", activeFilter.operator); rowQueryParams.set("filterValue", activeFilter.value); }
  const rowQueryString = rowQueryParams.toString();

  const { data: rows = [] } = useQuery<any[]>({
    queryKey: ["pm-database-rows", databaseId, rowQueryString],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}/rows${rowQueryString ? "?" + rowQueryString : ""}`).then(r => r.json()),
  });

  useEffect(() => {
    if (database?.title && !title) setTitle(database.title);
  }, [database?.title]);

  const updateDatabase = useMutation({
    mutationFn: (body: any) => apiRequest("PATCH", `/api/pm-databases/${databaseId}`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database", databaseId] }),
  });

  const createProperty = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/pm-databases/${databaseId}/properties`, body).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pm-database", databaseId] }); queryClient.invalidateQueries({ queryKey: ["pm-database-rows", databaseId] }); },
  });

  const updateProperty = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest("PATCH", `/api/pm-database-properties/${id}`, body).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pm-database", databaseId] }); queryClient.invalidateQueries({ queryKey: ["pm-database-rows", databaseId] }); },
  });

  const deleteProperty = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pm-database-properties/${id}`).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pm-database", databaseId] }); queryClient.invalidateQueries({ queryKey: ["pm-database-rows", databaseId] }); },
  });

  const createRow = useMutation({
    mutationFn: (body?: any) => apiRequest("POST", `/api/pm-databases/${databaseId}/rows`, body || {}).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pm-database-rows", databaseId] }); },
  });

  const deleteRow = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pm-database-rows/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database-rows", databaseId] }),
  });

  const upsertCell = useMutation({
    mutationFn: (body: any) => apiRequest("PUT", `/api/pm-database-cells`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database-rows", databaseId] }),
  });

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val);
    clearTimeout(titleTimeout.current);
    titleTimeout.current = setTimeout(() => {
      updateDatabase.mutate({ title: val });
    }, 500);
  }, []);

  const getCellValue = (row: any, propertyId: number) => {
    const cell = row.cells?.find((c: any) => c.propertyId === propertyId);
    return cell?.value || {};
  };

  const handleCellUpdate = (rowId: number, propertyId: number, value: any) => {
    upsertCell.mutate({ rowId, propertyId, value });
  };

  const addSelectOption = (prop: any, name: string) => {
    if (!name.trim()) return;
    const colors = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "gray"];
    const newOption = { id: Math.random().toString(36).slice(2), name: name.trim(), color: colors[Math.floor(Math.random() * colors.length)] };
    const opts = prop.config?.options || [];
    updateProperty.mutate({ id: prop.id, config: { ...prop.config, options: [...opts, newOption] } });
    setNewOptionName("");
  };

  const visibleProps = (database?.properties || []).filter((p: any) => p.isVisible);

  if (isLoading) return <div className="p-4 text-muted-foreground text-sm">Loading database...</div>;
  if (!database) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border flex-wrap">
        <span className="text-lg">{database.icon || "🗃️"}</span>
        <input
          className="flex-1 min-w-0 bg-transparent font-semibold text-sm outline-none"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          data-testid="db-title-input"
        />
        <div className="flex items-center gap-1">
          {VIEW_ICONS.map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => updateDatabase.mutate({ defaultView: id })}
              data-testid={`view-btn-${id}`}
              className={cn("p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors", database.defaultView === id && "bg-primary text-primary-foreground hover:text-primary-foreground")}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" data-testid="filter-btn">
              <Filter className="w-3 h-3" /> Filter {activeFilter && <span className="ml-0.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center">1</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3">
            <p className="text-xs font-medium mb-2">Filter by</p>
            <select className="w-full border border-border rounded px-2 py-1 text-xs bg-background mb-2" value={filterPropertyId} onChange={e => setFilterPropertyId(e.target.value)}>
              <option value="">Select property...</option>
              {(database?.properties || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="w-full border border-border rounded px-2 py-1 text-xs bg-background mb-2" value={filterOperator} onChange={e => setFilterOperator(e.target.value)}>
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
              <option value="isEmpty">Is empty</option>
              <option value="isNotEmpty">Is not empty</option>
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
            </select>
            {!["isEmpty", "isNotEmpty"].includes(filterOperator) && (
              <Input className="h-7 text-xs mb-2" placeholder="Value..." value={filterValue} onChange={e => setFilterValue(e.target.value)} />
            )}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => { setActiveFilter({ propertyId: filterPropertyId, operator: filterOperator, value: filterValue }); setFilterOpen(false); }}>Apply</Button>
              {activeFilter && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActiveFilter(null); setFilterOpen(false); }}>Clear</Button>}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" data-testid="sort-btn">
              <ArrowUpDown className="w-3 h-3" /> Sort {activeSort && <span className="ml-0.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center">1</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-3">
            <p className="text-xs font-medium mb-2">Sort by</p>
            <select className="w-full border border-border rounded px-2 py-1 text-xs bg-background mb-2" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="">Select property...</option>
              {(database?.properties || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-2 mb-2">
              {(["asc", "desc"] as const).map(d => (
                <button key={d} onClick={() => setSortDir(d)} className={cn("flex-1 border border-border rounded px-2 py-1 text-xs", sortDir === d && "bg-primary text-primary-foreground border-primary")}>{d === "asc" ? "A → Z" : "Z → A"}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => { setActiveSort({ propertyId: sortBy, dir: sortDir }); setSortOpen(false); }}>Apply</Button>
              {activeSort && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActiveSort(null); setSortOpen(false); }}>Clear</Button>}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={newPropOpen} onOpenChange={setNewPropOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" data-testid="new-property-btn">
              <Plus className="w-3 h-3" /> New Property
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-3">
            <p className="text-xs font-medium mb-2">New property</p>
            <Input className="h-7 text-xs mb-2" placeholder="Property name" value={newPropName} onChange={e => setNewPropName(e.target.value)} />
            <select className="w-full border border-border rounded px-2 py-1 text-xs bg-background mb-2" value={newPropType} onChange={e => setNewPropType(e.target.value)}>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button size="sm" className="w-full h-7 text-xs" onClick={() => { if (!newPropName.trim()) return; createProperty.mutate({ name: newPropName.trim(), type: newPropType, config: {} }); setNewPropName(""); setNewPropOpen(false); }}>Add</Button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="w-8 border-r border-border" />
              {visibleProps.map((prop: any) => (
                <th key={prop.id} className="border-r border-border text-left px-3 py-2 font-medium text-xs text-muted-foreground min-w-[140px] relative">
                  <div className="flex items-center justify-between gap-1">
                    {editingProp === prop.id ? (
                      <input
                        autoFocus
                        className="bg-transparent outline-none w-full text-xs font-medium"
                        value={editingPropName}
                        onChange={e => setEditingPropName(e.target.value)}
                        onBlur={() => { if (editingPropName.trim()) updateProperty.mutate({ id: prop.id, name: editingPropName.trim() }); setEditingProp(null); }}
                        onKeyDown={e => { if (e.key === "Enter") { if (editingPropName.trim()) updateProperty.mutate({ id: prop.id, name: editingPropName.trim() }); setEditingProp(null); } }}
                      />
                    ) : (
                      <span className="truncate">{prop.name}</span>
                    )}
                    <Popover open={columnMenuOpen === prop.id} onOpenChange={o => setColumnMenuOpen(o ? prop.id : null)}>
                      <PopoverTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground" data-testid={`col-menu-${prop.id}`}>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1">
                        <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded" onClick={() => { setEditingProp(prop.id); setEditingPropName(prop.name); setColumnMenuOpen(null); }}>Rename</button>
                        <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded" onClick={() => { updateProperty.mutate({ id: prop.id, isVisible: false }); setColumnMenuOpen(null); }}>Hide</button>
                        <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted rounded text-destructive" onClick={() => { deleteProperty.mutate(prop.id); setColumnMenuOpen(null); }}>Delete</button>
                      </PopoverContent>
                    </Popover>
                  </div>
                </th>
              ))}
              <th className="w-10 border-r border-border">
                <button onClick={() => setNewPropOpen(true)} className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" data-testid="add-col-btn">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <TableRow
                key={row.id}
                row={row}
                properties={visibleProps}
                onCellUpdate={handleCellUpdate}
                onDeleteRow={() => deleteRow.mutate(row.id)}
                onUpdateProperty={(id: number, data: any) => updateProperty.mutate({ id, ...data })}
                openCellDropdown={openCellDropdown}
                setOpenCellDropdown={setOpenCellDropdown}
                newOptionName={newOptionName}
                setNewOptionName={setNewOptionName}
                addSelectOption={addSelectOption}
              />
            ))}
            <tr className="border-t border-border">
              <td colSpan={visibleProps.length + 2} className="px-3 py-1.5">
                <button
                  onClick={() => createRow.mutate()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="add-row-btn"
                >
                  <Plus className="w-3.5 h-3.5" /> New row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RowProps {
  row: any;
  properties: any[];
  onCellUpdate: (rowId: number, propertyId: number, value: any) => void;
  onDeleteRow: () => void;
  onUpdateProperty: (id: number, data: any) => void;
  openCellDropdown: string | null;
  setOpenCellDropdown: (key: string | null) => void;
  newOptionName: string;
  setNewOptionName: (v: string) => void;
  addSelectOption: (prop: any, name: string) => void;
}

function TableRow({ row, properties, onCellUpdate, onDeleteRow, openCellDropdown, setOpenCellDropdown, newOptionName, setNewOptionName, addSelectOption }: RowProps) {
  const [hovered, setHovered] = useState(false);

  const getCellValue = (propertyId: number) => {
    const cell = row.cells?.find((c: any) => c.propertyId === propertyId);
    return cell?.value || {};
  };

  return (
    <tr
      className="border-b border-border hover:bg-muted/20 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`row-${row.id}`}
    >
      <td className="w-8 border-r border-border px-1">
        <div className="flex items-center justify-center gap-0.5">
          {hovered && <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab" />}
        </div>
      </td>
      {properties.map((prop: any) => {
        const cellKey = `${row.id}-${prop.id}`;
        const value = getCellValue(prop.id);
        return (
          <td key={prop.id} className="border-r border-border px-2 py-1 align-middle">
            <CellEditor
              prop={prop}
              value={value}
              cellKey={cellKey}
              row={row}
              onUpdate={(v) => onCellUpdate(row.id, prop.id, v)}
              openCellDropdown={openCellDropdown}
              setOpenCellDropdown={setOpenCellDropdown}
              newOptionName={newOptionName}
              setNewOptionName={setNewOptionName}
              addSelectOption={addSelectOption}
              onUpdateProperty={(_id: number, _data: any) => {}}
            />
          </td>
        );
      })}
      <td className="w-10 px-1">
        {hovered && (
          <button onClick={onDeleteRow} className="text-muted-foreground hover:text-destructive transition-colors" data-testid={`delete-row-${row.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

interface CellEditorProps {
  prop: any;
  value: any;
  cellKey: string;
  row: any;
  onUpdate: (value: any) => void;
  onUpdateProperty: (id: number, data: any) => void;
  openCellDropdown: string | null;
  setOpenCellDropdown: (key: string | null) => void;
  newOptionName: string;
  setNewOptionName: (v: string) => void;
  addSelectOption: (prop: any, name: string) => void;
}

function CellEditor({ prop, value, cellKey, row, onUpdate, openCellDropdown, setOpenCellDropdown, newOptionName, setNewOptionName, addSelectOption }: CellEditorProps) {
  const [localText, setLocalText] = useState(value?.text ?? "");
  const [localNumber, setLocalNumber] = useState(value?.number ?? "");
  const [localUrl, setLocalUrl] = useState(value?.url ?? "");
  const [localEmail, setLocalEmail] = useState(value?.email ?? "");
  const [localPhone, setLocalPhone] = useState(value?.phone ?? "");
  const [localDate, setLocalDate] = useState(value?.start ?? "");

  useEffect(() => { setLocalText(value?.text ?? ""); }, [value?.text]);
  useEffect(() => { setLocalNumber(value?.number ?? ""); }, [value?.number]);
  useEffect(() => { setLocalUrl(value?.url ?? ""); }, [value?.url]);
  useEffect(() => { setLocalEmail(value?.email ?? ""); }, [value?.email]);
  useEffect(() => { setLocalPhone(value?.phone ?? ""); }, [value?.phone]);
  useEffect(() => { setLocalDate(value?.start ?? ""); }, [value?.start]);

  const opts: any[] = prop.config?.options || [];
  const isOpen = openCellDropdown === cellKey;

  switch (prop.type) {
    case "text":
      return (
        <div
          contentEditable
          suppressContentEditableWarning
          className="min-w-[120px] outline-none text-xs py-0.5 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40"
          data-placeholder="Empty"
          onBlur={e => onUpdate({ text: e.currentTarget.textContent || "" })}
          dangerouslySetInnerHTML={{ __html: localText }}
          data-testid={`cell-text-${cellKey}`}
        />
      );

    case "number":
      return (
        <input
          type="number"
          className="w-full bg-transparent outline-none text-xs py-0.5"
          value={localNumber}
          onChange={e => setLocalNumber(e.target.value)}
          onBlur={() => onUpdate({ number: localNumber === "" ? null : Number(localNumber) })}
          data-testid={`cell-number-${cellKey}`}
        />
      );

    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={!!value?.checked}
          onChange={e => onUpdate({ checked: e.target.checked })}
          className="cursor-pointer"
          data-testid={`cell-checkbox-${cellKey}`}
        />
      );

    case "date":
      return (
        <input
          type="date"
          className="bg-transparent outline-none text-xs py-0.5 w-full"
          value={localDate}
          onChange={e => { setLocalDate(e.target.value); onUpdate({ start: e.target.value }); }}
          data-testid={`cell-date-${cellKey}`}
        />
      );

    case "url":
      return (
        <div className="flex items-center gap-1 min-w-[120px]">
          <input
            className="flex-1 bg-transparent outline-none text-xs py-0.5"
            value={localUrl}
            onChange={e => setLocalUrl(e.target.value)}
            onBlur={() => onUpdate({ url: localUrl })}
            placeholder="https://..."
            data-testid={`cell-url-${cellKey}`}
          />
          {localUrl && (
            <a href={localUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      );

    case "email":
      return (
        <div className="flex items-center gap-1 min-w-[120px]">
          <input
            className="flex-1 bg-transparent outline-none text-xs py-0.5"
            value={localEmail}
            onChange={e => setLocalEmail(e.target.value)}
            onBlur={() => onUpdate({ email: localEmail })}
            placeholder="email@..."
            data-testid={`cell-email-${cellKey}`}
          />
          {localEmail && <a href={`mailto:${localEmail}`} className="text-muted-foreground hover:text-primary"><ExternalLink className="w-3 h-3" /></a>}
        </div>
      );

    case "phone":
      return (
        <div className="flex items-center gap-1 min-w-[120px]">
          <input
            className="flex-1 bg-transparent outline-none text-xs py-0.5"
            value={localPhone}
            onChange={e => setLocalPhone(e.target.value)}
            onBlur={() => onUpdate({ phone: localPhone })}
            placeholder="+1..."
            data-testid={`cell-phone-${cellKey}`}
          />
          {localPhone && <a href={`tel:${localPhone}`} className="text-muted-foreground hover:text-primary"><ExternalLink className="w-3 h-3" /></a>}
        </div>
      );

    case "select":
    case "status": {
      const selectedId = value?.selectedId;
      const selectedOpt = opts.find((o: any) => o.id === selectedId);
      return (
        <Popover open={isOpen} onOpenChange={o => setOpenCellDropdown(o ? cellKey : null)}>
          <PopoverTrigger asChild>
            <button className="min-w-[80px] text-left" data-testid={`cell-select-${cellKey}`}>
              {selectedOpt ? (
                <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full", BADGE_BG[selectedOpt.color] || BADGE_BG.gray)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", COLOR_CLASSES[selectedOpt.color] || COLOR_CLASSES.gray)} />
                  {selectedOpt.name}
                </span>
              ) : <span className="text-muted-foreground/40 text-xs">Empty</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1">
            {opts.map((o: any) => (
              <button
                key={o.id}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                onClick={() => { onUpdate({ selectedId: o.id }); setOpenCellDropdown(null); }}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", COLOR_CLASSES[o.color] || COLOR_CLASSES.gray)} />
                <span className="text-xs">{o.name}</span>
                {selectedId === o.id && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
            {selectedId && (
              <button className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs text-muted-foreground" onClick={() => { onUpdate({}); setOpenCellDropdown(null); }}>Clear</button>
            )}
            <div className="mt-1 border-t border-border pt-1 px-1 flex gap-1">
              <input className="flex-1 text-xs outline-none bg-transparent" placeholder="Add option..." value={newOptionName} onChange={e => setNewOptionName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addSelectOption(prop, newOptionName); } }} />
              <button onClick={() => addSelectOption(prop, newOptionName)} className="text-xs text-muted-foreground hover:text-foreground"><Plus className="w-3 h-3" /></button>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    case "multiSelect": {
      const selectedIds: string[] = value?.selectedIds || [];
      const selectedOpts = opts.filter((o: any) => selectedIds.includes(o.id));
      return (
        <Popover open={isOpen} onOpenChange={o => setOpenCellDropdown(o ? cellKey : null)}>
          <PopoverTrigger asChild>
            <button className="min-w-[80px] text-left flex flex-wrap gap-1" data-testid={`cell-multiselect-${cellKey}`}>
              {selectedOpts.length ? selectedOpts.map((o: any) => (
                <span key={o.id} className={cn("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full", BADGE_BG[o.color] || BADGE_BG.gray)}>
                  {o.name}
                </span>
              )) : <span className="text-muted-foreground/40 text-xs">Empty</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1">
            {opts.map((o: any) => {
              const checked = selectedIds.includes(o.id);
              return (
                <button
                  key={o.id}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    const newIds = checked ? selectedIds.filter(id => id !== o.id) : [...selectedIds, o.id];
                    onUpdate({ selectedIds: newIds });
                  }}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", COLOR_CLASSES[o.color] || COLOR_CLASSES.gray)} />
                  <span className="text-xs">{o.name}</span>
                  {checked && <Check className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
            <div className="mt-1 border-t border-border pt-1 px-1 flex gap-1">
              <input className="flex-1 text-xs outline-none bg-transparent" placeholder="Add option..." value={newOptionName} onChange={e => setNewOptionName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addSelectOption(prop, newOptionName); } }} />
              <button onClick={() => addSelectOption(prop, newOptionName)} className="text-xs text-muted-foreground hover:text-foreground"><Plus className="w-3 h-3" /></button>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    case "person":
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
            {(value?.userIds?.length || 0) > 0 ? value.userIds[0].slice(0, 2).toUpperCase() : "—"}
          </div>
        </div>
      );

    case "createdTime":
      return <span className="text-xs text-muted-foreground">{row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy") : "—"}</span>;

    case "lastEditedTime":
      return <span className="text-xs text-muted-foreground">{row.updatedAt ? format(new Date(row.updatedAt), "MMM d, yyyy") : "—"}</span>;

    default:
      return <span className="text-xs text-muted-foreground/40">—</span>;
  }
}
