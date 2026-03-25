import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, CheckCircle2, Users, FolderKanban, Layers, Sparkles, Globe, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Education", "Retail & E-commerce",
  "Manufacturing", "Media & Entertainment", "Real Estate", "Consulting", "Other",
];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const INDUSTRY_ICONS: Record<string, string> = {
  Technology: "💻", "Finance & Banking": "🏦", Healthcare: "🏥", Education: "🎓",
  "Retail & E-commerce": "🛍️", Manufacturing: "🏭", "Media & Entertainment": "🎬",
  "Real Estate": "🏢", Consulting: "💼", Other: "🌐",
};

interface Workspace { id: number; name: string; industry?: string; companySize?: string; createdAt?: string; }

export default function WorkspaceSetupPage() {
  const { activeWorkspace, setActiveWorkspace, isSeeding } = useWorkspace();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [manualSeeding, setManualSeeding] = useState(false);

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({ queryKey: ["/api/workspaces"] });
  const seeding = isSeeding || manualSeeding;

  const createMutation = useMutation({
    mutationFn: (data: { name: string; industry: string; companySize: string }) =>
      apiRequest("POST", "/api/workspaces", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setActiveWorkspace(created);
      setShowForm(false); setName(""); setIndustry(""); setCompanySize("");
      toast({ title: "✓ Workspace created" });
    },
    onError: () => toast({ title: "Failed to create workspace", variant: "destructive" }),
  });

  const seedDemo = async () => {
    setManualSeeding(true);
    try {
      const res = await apiRequest("POST", "/api/seed-team-demo", {});
      const data = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/workspace-members"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      const wsList = await fetch("/api/workspaces").then(r => r.json());
      const found = wsList.find((w: Workspace) => w.id === data.workspaceId);
      if (found) setActiveWorkspace(found);
      toast({ title: "✓ TechNova Solutions loaded — 50 people, 7 teams, 12 projects" });
    } catch {
      toast({ title: "Failed to load demo data", variant: "destructive" });
    } finally { setManualSeeding(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast({ title: "Workspace name is required", variant: "destructive" });
    if (!companySize) return toast({ title: "Please select a company size", variant: "destructive" });
    createMutation.mutate({ name: name.trim(), industry, companySize });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Workspace Setup
          </h1>
          <p className="text-muted-foreground mt-1">Your organisation's home — teams, projects, and people all live here</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} data-testid="button-new-workspace">
          <Plus className="h-4 w-4 mr-2" /> New Workspace
        </Button>
      </div>

      {/* Quick-start demo banner */}
      {workspaces.length === 0 && !isLoading && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">See it in action instantly</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Load <strong>TechNova Solutions</strong> — a realistic 50-person technology company with 7 departments, 50 employees,
                and 12 active projects. Everything is pre-filled so you can explore every feature right away.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  { icon: Users, label: "50 employees" },
                  { icon: Layers, label: "7 teams" },
                  { icon: FolderKanban, label: "12 projects" },
                  { icon: Globe, label: "Technology industry" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 text-primary" /> {label}
                  </div>
                ))}
              </div>
            </div>
            <Button size="lg" onClick={seedDemo} disabled={seeding} className="shrink-0" data-testid="button-seed-demo">
              {seeding ? "Loading…" : "Load Demo Company"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Create Workspace</CardTitle>
            <CardDescription>Set up a new workspace for your organisation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Workspace Name *</Label>
                <Input id="ws-name" data-testid="input-workspace-name" placeholder="e.g. Acme Corp" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger data-testid="select-industry"><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{INDUSTRY_ICONS[i]} {i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Company Size *</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger data-testid="select-company-size"><SelectValue placeholder="Select company size" /></SelectTrigger>
                    <SelectContent>{COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-workspace">
                  {createMutation.isPending ? "Creating…" : "Create Workspace"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Workspaces grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Card key={i} className="animate-pulse h-40" />)}
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            {seeding ? (
              <>
                <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium">Setting up TechNova Solutions…</p>
                <p className="text-muted-foreground">Creating 50 employees, 7 teams, and 12 projects. Just a moment.</p>
              </>
            ) : (
              <>
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No workspaces yet</p>
                <p className="text-muted-foreground mb-4">Create a workspace or load the demo company above</p>
                <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> Create Workspace</Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {workspaces.map(ws => (
            <Card
              key={ws.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${activeWorkspace?.id === ws.id ? "border-primary bg-primary/5 shadow-md" : ""}`}
              onClick={() => setActiveWorkspace(ws)}
              data-testid={`card-workspace-${ws.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                      {INDUSTRY_ICONS[ws.industry ?? ""] ?? "🏢"}
                    </div>
                    <div>
                      <div className="font-bold text-base">{ws.name}</div>
                      {ws.industry && <div className="text-sm text-muted-foreground">{ws.industry}</div>}
                    </div>
                  </div>
                  {activeWorkspace?.id === ws.id && (
                    <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Active
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {ws.companySize && <Badge variant="secondary" data-testid={`badge-size-${ws.id}`}>{ws.companySize} employees</Badge>}
                  {ws.industry && <Badge variant="outline" className="text-xs">{ws.industry}</Badge>}
                </div>
                {ws.createdAt && (
                  <p className="text-xs text-muted-foreground mt-3">Created {new Date(ws.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* What is a workspace info section */}
      <Card className="bg-muted/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> What is a Workspace?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">🏠 Your organisation's home</p>
              <p>A workspace is the top-level container for your entire company. Everything — teams, people, and projects — lives inside it.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">👥 Teams inside</p>
              <p>Inside a workspace you can create departments and teams — like Engineering, Design, and Sales — each with their own members.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">🔒 Access control</p>
              <p>You decide who joins. Assign roles like Admin, Manager, Member, or Guest to control what each person can see and do.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
