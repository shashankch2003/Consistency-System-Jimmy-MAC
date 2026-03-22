import { ReactNode } from "react";

interface TaskPropertiesProps {
  label: string;
  children: ReactNode;
}

export function TaskProperties({ label, children }: TaskPropertiesProps) {
  return (
    <div className="flex items-center min-h-[40px] border-b border-border/40 py-1">
      <div className="w-[140px] shrink-0 text-sm text-muted-foreground">{label}</div>
      <div className="flex-1 flex items-center">{children}</div>
    </div>
  );
}
