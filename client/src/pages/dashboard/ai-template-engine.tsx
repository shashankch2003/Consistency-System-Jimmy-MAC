import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Plus, Copy, Star, Search, Layout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AiTemplate = { id: number; name: string; description?: string; category: string; type: string; usageCount: number; isPublic: boolean; content: any };

const CATEGORY_COLORS: Record<string, string> = {
  project_management: "bg-blue-500/20 text-blue-400",
  personal: "bg-purple-500/20 text-purple-400",
  marketing: "bg-pink-500/20 text-pink-400",
  engineering: "bg-green-500/20 text-green-400",
  hr: "bg-orange-500/20 text-orange-400",
  sales: "bg-yellow-500/20 text-yellow-400",
  design: "bg-cyan-500/20 text-cyan-400",
  custom: "bg-gray-500/20 text-gray-400",
};

export default function AiTemplateEnginePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [generateForm, setGenerateForm] = useState({ description: "", type: "database" });
  const [generating, setGenerating] = useState(false);

  const { data: templates = [], isLoading } = useQuery<AiTemplate[]>({
    queryKey: ["/api/ai-templates"],
    queryFn: () => fetch("/api/ai-templates").then(r => r.json()),
  });

  const { data: recommendations = [] } = useQuery<AiTemplate[]>({
    queryKey: ["/api/ai-templates/recommendations"],
  });

  const useTemplate = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/ai-templates/${id}/use`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ai-templates"] }); toast({ title: "Template applied!" }); }
  });

  const generateTemplate = async () => {
    if (!generateForm.description) return;
    setGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/ai-templates/generate", generateForm);
      await res.json();
      qc.invalidateQueries({ queryKey: ["/api/ai-templates"] });
      setGenerateOpen(false);
      toast({ title: "Template generated successfully!" });
    } catch { toast({ title: "Failed to generate template", variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layout className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">AI Template Engine</h1>
            <p className="text-sm text-gray-400">Generate and use AI-powered templates</p>
          </div>
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700" data-testid="button-generate-template"><Sparkles className="w-4 h-4 mr-2" />Generate Template</Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-400" />AI Template Generator</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><label className="text-xs text-gray-400 mb-1 block">Describe the template you need</label>
                <Input placeholder="e.g. Product roadmap database with status tracking" value={generateForm.description} onChange={e => setGenerateForm(f => ({ ...f, description: e.target.value }))} className="bg-gray-800 border-gray-700" data-testid="input-template-description" /></div>
              <Select value={generateForm.type} onValueChange={v => setGenerateForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-template-type"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="page">Page</SelectItem>
                  <SelectItem value="workspace">Workspace</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generateTemplate} disabled={!generateForm.description || generating} className="w-full bg-cyan-600 hover:bg-cyan-700" data-testid="button-submit-generate">{generating ? "Generating..." : "Generate with AI"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {recommendations.length > 0 && (
        <Card className="bg-gray-900 border-cyan-700/30">
          <CardHeader><CardTitle className="text-white text-base flex items-center gap-2"><Star className="w-4 h-4 text-cyan-400" />Most Used Templates</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {recommendations.slice(0, 6).map(t => (
                <div key={t.id} className="bg-gray-800/50 rounded-lg p-3 flex flex-col gap-2" data-testid={`card-rec-${t.id}`}>
                  <p className="text-sm text-white font-medium truncate">{t.name}</p>
                  <Badge className={CATEGORY_COLORS[t.category] || "bg-gray-700 text-gray-300"} data-testid={`badge-cat-${t.id}`}>{t.category?.replace("_", " ")}</Badge>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-400">{t.usageCount} uses</span>
                    <Button size="sm" variant="ghost" onClick={() => useTemplate.mutate(t.id)} className="h-6 text-xs text-cyan-400" data-testid={`button-use-rec-${t.id}`}><Copy className="w-3 h-3 mr-1" />Use</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="bg-gray-800 border-gray-700 pl-9" data-testid="input-search" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 bg-gray-800 border-gray-700 text-white" data-testid="select-category-filter"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c?.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-40 rounded-xl bg-gray-800/50 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800"><CardContent className="py-12 text-center"><Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">No templates found. Generate your first AI template!</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id} className="bg-gray-900 border-gray-800 flex flex-col" data-testid={`card-template-${t.id}`}>
              <CardContent className="pt-4 pb-3 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{t.name}</p>
                    {t.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{t.description}</p>}
                  </div>
                  <Badge className="bg-gray-700 text-gray-300 text-xs shrink-0">{t.type}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={CATEGORY_COLORS[t.category] || "bg-gray-700 text-gray-300"} data-testid={`badge-template-cat-${t.id}`}>{t.category?.replace("_", " ")}</Badge>
                  {t.isPublic && <Badge className="bg-blue-500/20 text-blue-400">Public</Badge>}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-800">
                  <span className="text-xs text-gray-500">{t.usageCount} uses</span>
                  <Button size="sm" onClick={() => useTemplate.mutate(t.id)} disabled={useTemplate.isPending} className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700" data-testid={`button-use-${t.id}`}><Copy className="w-3 h-3 mr-1" />Use Template</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
