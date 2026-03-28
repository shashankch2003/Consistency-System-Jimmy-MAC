import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListViewConfig {
  visiblePropertyIds?: number[];
  sortPropertyId?: number | null;
  sortDir?: "asc" | "desc";
  filters?: any[];
}

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

interface Props {
  databaseId: number;
  viewConfig: ListViewConfig;
}

export default function DatabaseListView({ databaseId, viewConfig }: Props) {
  const [, navigate] = useLocation();

  const { data: database } = useQuery<any>({
    queryKey: ["pm-database", databaseId],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}`).then(r => r.json()),
  });

  const { data: rows = [] } = useQuery<any[]>({
    queryKey: ["pm-database-rows", databaseId, ""],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}/rows`).then(r => r.json()),
  });

  const createRow = useMutation({
    mutationFn: () => apiRequest("POST", `/api/pm-databases/${databaseId}/rows`, {}).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database-rows", databaseId] }),
  });

  const upsertCell = useMutation({
    mutationFn: (body: any) => apiRequest("PUT", `/api/pm-database-cells`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database-rows", databaseId] }),
  });

  const props = database?.properties || [];
  const firstTextProp = props.find((p: any) => p.type === "text");
  const checkboxProp = props.find((p: any) => p.type === "checkbox");
  const visibleProps = props.filter((p: any) =>
    p.isVisible && p.id !== firstTextProp?.id && p.id !== checkboxProp?.id &&
    (!viewConfig.visiblePropertyIds?.length || viewConfig.visiblePropertyIds.includes(p.id))
  ).slice(0, 3);

  const getCellValue = (row: any, propertyId: number) => {
    return row.cells?.find((c: any) => c.propertyId === propertyId)?.value || {};
  };

  const getRowTitle = (row: any) => {
    if (!firstTextProp) return "Untitled";
    return getCellValue(row, firstTextProp.id)?.text || "Untitled";
  };

  const renderPropValue = (row: any, prop: any) => {
    const val = getCellValue(row, prop.id);
    if (prop.type === "text") return val.text ? <span key={prop.id} className="text-xs text-muted-foreground">{val.text}</span> : null;
    if (prop.type === "number") return val.number != null ? <span key={prop.id} className="text-xs text-muted-foreground">{val.number}</span> : null;
    if (prop.type === "select" || prop.type === "status") {
      const opts = prop.config?.options || [];
      const opt = opts.find((o: any) => o.id === val.selectedId);
      if (!opt) return null;
      return <span key={prop.id} className={cn("text-[10px] px-1.5 py-0.5 rounded-full", BADGE_BG[opt.color] || BADGE_BG.gray)}>{opt.name}</span>;
    }
    if (prop.type === "date") return val.start ? <span key={prop.id} className="text-xs text-muted-foreground">{val.start}</span> : null;
    return null;
  };

  return (
    <div className="divide-y divide-border">
      {(rows as any[]).map((row: any) => {
        const isChecked = checkboxProp ? !!getCellValue(row, checkboxProp.id)?.checked : false;
        return (
          <div
            key={row.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 cursor-pointer group/list-row"
            onClick={() => { if (row.linkedPageId) navigate(`/dashboard/pm-editor/${row.linkedPageId}`); }}
            data-testid={`list-row-${row.id}`}
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover/list-row:opacity-100 shrink-0 cursor-grab" />
            {checkboxProp && (
              <input
                type="checkbox"
                checked={isChecked}
                onChange={e => { e.stopPropagation(); upsertCell.mutate({ rowId: row.id, propertyId: checkboxProp.id, value: { checked: e.target.checked } }); }}
                className="cursor-pointer shrink-0"
                data-testid={`list-checkbox-${row.id}`}
              />
            )}
            <span className={cn("flex-1 text-sm truncate", isChecked && "line-through text-muted-foreground")}>
              {getRowTitle(row)}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {visibleProps.map((p: any) => renderPropValue(row, p))}
            </div>
          </div>
        );
      })}
      <div className="px-3 py-2">
        <button
          onClick={() => createRow.mutate()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="list-add-row-btn"
        >
          <Plus className="w-3.5 h-3.5" /> New row
        </button>
      </div>
    </div>
  );
}
