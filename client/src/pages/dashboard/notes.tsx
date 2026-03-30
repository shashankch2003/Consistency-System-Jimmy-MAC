import { FileText } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen text-center">
      <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
      <h2 className="text-lg font-semibold text-muted-foreground/40">No notes yet</h2>
    </div>
  );
}
