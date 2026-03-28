import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const COLOR_DOT: Record<string, string> = {
  red: "bg-red-500", orange: "bg-orange-500", yellow: "bg-yellow-500",
  green: "bg-green-500", blue: "bg-blue-500", purple: "bg-purple-500",
  pink: "bg-pink-500", gray: "bg-gray-400",
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

export interface BoardViewConfig {
  groupByPropertyId?: number;
  visiblePropertyIds?: number[];
  hideEmptyGroups?: boolean;
  filters?: any[];
}

interface Props {
  databaseId: number;
  viewConfig: BoardViewConfig;
}

export default function DatabaseBoardView({ databaseId, viewConfig }: Props) {
  const [, navigate] = useLocation();
  const [draggedRow, setDraggedRow] = useState<any>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const groupByPropertyId = viewConfig.groupByPropertyId;

  const { data: grouped, isLoading } = useQuery<any>({
    queryKey: ["pm-database-rows-grouped", databaseId, groupByPropertyId],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}/rows/grouped?groupByPropertyId=${groupByPropertyId}`).then(r => r.json()),
    enabled: !!groupByPropertyId,
  });

  const { data: database } = useQuery<any>({
    queryKey: ["pm-database", databaseId],
    queryFn: () => apiRequest("GET", `/api/pm-databases/${databaseId}`).then(r => r.json()),
  });

  const createRow = useMutation({
    mutationFn: (body: any) => apiRequest("POST", `/api/pm-databases/${databaseId}/rows`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database-rows-grouped", databaseId] }),
  });

  const upsertCell = useMutation({
    mutationFn: (body: any) => apiRequest("PUT", `/api/pm-database-cells`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database-rows-grouped", databaseId] }),
  });

  const updateProperty = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest("PATCH", `/api/pm-database-properties/${id}`, body).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm-database", databaseId] }),
  });

  const groupByProp = database?.properties?.find((p: any) => p.id === groupByPropertyId);
  const visibleProps = (database?.properties || []).filter((p: any) =>
    (!viewConfig.visiblePropertyIds?.length || viewConfig.visiblePropertyIds.includes(p.id)) && p.id !== groupByPropertyId && p.isVisible
  ).slice(0, 2);

  const getRowTitle = (row: any) => {
    const firstTextProp = database?.properties?.find((p: any) => p.type === "text");
    if (!firstTextProp) return "Untitled";
    const cell = row.cells?.find((c: any) => c.propertyId === firstTextProp.id);
    return (cell?.value as any)?.text || "Untitled";
  };

  const getRowPropValue = (row: any, prop: any) => {
    const cell = row.cells?.find((c: any) => c.propertyId === prop.id);
    const val = cell?.value;
    if (!val) return null;
    if (prop.type === "text") return (val as any).text;
    if (prop.type === "number") return (val as any).number;
    if (prop.type === "checkbox") return (val as any).checked ? "✓" : null;
    if (prop.type === "select" || prop.type === "status") {
      const opts = prop.config?.options || [];
      const opt = opts.find((o: any) => o.id === (val as any).selectedId);
      return opt ? { name: opt.name, color: opt.color } : null;
    }
    return null;
  };

  const handleDrop = async (targetGroupId: string) => {
    if (!draggedRow || !groupByPropertyId) return;
    if (targetGroupId === "__no_value__") {
      upsertCell.mutate({ rowId: draggedRow.id, propertyId: groupByPropertyId, value: {} });
    } else {
      upsertCell.mutate({ rowId: draggedRow.id, propertyId: groupByPropertyId, value: { selectedId: targetGroupId } });
    }
    setDraggedRow(null);
    setDragOverGroup(null);
  };

  const handleAddToGroup = (group: any) => {
    if (!groupByPropertyId) return;
    const cells = group.groupId !== "__no_value__"
      ? [{ propertyId: groupByPropertyId, value: { selectedId: group.groupId } }]
      : [];
    createRow.mutate({ cells });
  };

  const handleAddGroup = () => {
    if (!groupByProp) return;
    const colors = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "gray"];
    const newOpt = { id: Math.random().toString(36).slice(2), name: "New Group", color: colors[Math.floor(Math.random() * colors.length)] };
    const opts = groupByProp.config?.options || [];
    updateProperty.mutate({ id: groupByProp.id, config: { ...groupByProp.config, options: [...opts, newOpt] } });
  };

  if (!groupByPropertyId) return (
    <div className="p-8 text-center text-muted-foreground text-sm">
      Board view requires a select or status property to group by. Add one in the database properties.
    </div>
  );

  if (isLoading) return <div className="p-4 text-muted-foreground text-sm">Loading board...</div>;

  const groups: any[] = grouped?.groups || [];
  const visibleGroups = viewConfig.hideEmptyGroups ? groups.filter(g => g.rows.length > 0) : groups;

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 p-3 min-w-max">
        {visibleGroups.map((group: any) => (
          <div
            key={group.groupId}
            className={cn("w-64 shrink-0 rounded-xl border border-border bg-muted/20 flex flex-col transition-colors", dragOverGroup === group.groupId && "border-primary/60 bg-primary/5")}
            onDragOver={e => { e.preventDefault(); setDragOverGroup(group.groupId); }}
            onDragLeave={() => setDragOverGroup(null)}
            onDrop={() => handleDrop(group.groupId)}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", COLOR_DOT[group.groupColor] || COLOR_DOT.gray)} />
              <span className="text-xs font-semibold flex-1 truncate">{group.groupName}</span>
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{group.rows.length}</span>
            </div>
            <div className="flex-1 p-2 flex flex-col gap-2 min-h-[80px]">
              <AnimatePresence>
                {group.rows.map((row: any) => {
                  const title = getRowTitle(row);
                  return (
                    <motion.div
                      key={row.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      draggable
                      onDragStart={() => setDraggedRow(row)}
                      onDragEnd={() => { setDraggedRow(null); setDragOverGroup(null); }}
                      className="bg-background border border-border rounded-lg p-2.5 cursor-pointer hover:border-primary/40 transition-colors group/card"
                      onClick={() => { if (row.linkedPageId) navigate(`/dashboard/pm-editor/${row.linkedPageId}`); }}
                      data-testid={`board-card-${row.id}`}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-0.5 opacity-0 group-hover/card:opacity-100 cursor-grab" />
                        <p className="text-xs font-medium leading-snug flex-1 line-clamp-2">{title || "Untitled"}</p>
                      </div>
                      {visibleProps.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {visibleProps.map((prop: any) => {
                            const val = getRowPropValue(row, prop);
                            if (!val) return null;
                            if (typeof val === "object" && val.name) {
                              return (
                                <span key={prop.id} className={cn("text-[10px] px-1.5 py-0.5 rounded-full", BADGE_BG[val.color] || BADGE_BG.gray)}>
                                  {val.name}
                                </span>
                              );
                            }
                            return <span key={prop.id} className="text-[10px] text-muted-foreground">{String(val)}</span>;
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="p-2 border-t border-border">
              <button
                onClick={() => handleAddToGroup(group)}
                className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1"
                data-testid={`board-add-row-${group.groupId}`}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        ))}
        <div className="w-48 shrink-0">
          <button
            onClick={handleAddGroup}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-xl p-3 transition-colors"
            data-testid="board-add-group-btn"
          >
            <Plus className="w-3.5 h-3.5" /> New Group
          </button>
        </div>
      </div>
    </div>
  );
}
