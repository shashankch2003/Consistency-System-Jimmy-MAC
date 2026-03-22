import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold, Italic, UnderlineIcon, Code, List, ListOrdered,
  Heading1, Heading2, Link as LinkIcon, Undo, Redo, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: number;
  title: string;
  content: string;
  workspaceId: number;
  isWiki: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DocumentEditorProps {
  documentId: number;
}

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-muted/50 ${active ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

export function DocumentEditor({ documentId }: DocumentEditorProps) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data: doc } = useQuery<Document>({
    queryKey: ["/api/documents", documentId],
    queryFn: () => fetch(`/api/documents/${documentId}`).then((r) => r.json()),
    enabled: !!documentId,
  });

  const mutation = useMutation({
    mutationFn: (data: { title?: string; content?: string }) =>
      apiRequest("PATCH", `/api/documents/${documentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId] });
      setSaving(false);
      toast({ title: "Document saved" });
    },
    onError: () => { setSaving(false); toast({ title: "Save failed", variant: "destructive" }); },
  });

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
    content: "",
    editorProps: {
      attributes: { class: "prose prose-invert prose-sm max-w-none focus:outline-none min-h-[400px] px-2 py-1" },
    },
  });

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      if (editor && doc.content) editor.commands.setContent(doc.content);
    }
  }, [doc, editor]);

  const handleSave = () => {
    setSaving(true);
    mutation.mutate({ title, content: editor?.getHTML() ?? "" });
  };

  if (!doc) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading document...</div>;

  return (
    <div className="flex flex-col h-full" data-testid="document-editor">
      {/* Title */}
      <div className="px-8 pt-8 pb-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold border-none bg-transparent px-0 focus-visible:ring-0 h-auto py-1"
          placeholder="Document title..."
          data-testid="input-doc-title"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-6 py-1.5 border-y border-border flex-wrap bg-muted/20">
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive("code")} title="Inline code">
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Bullet list">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Ordered list">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Button
          size="sm"
          variant="outline"
          className="ml-auto gap-1"
          onClick={handleSave}
          disabled={saving || mutation.isPending}
          data-testid="button-save-doc"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <EditorContent editor={editor} data-testid="editor-content" />
      </div>
    </div>
  );
}
