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
import { Building2, Plus, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Education", "Retail & E-commerce",
  "Manufacturing", "Media & Entertainment", "Real Estate", "Consulting", "Other",
];

const COMPANY_SIZES = [
  "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+",
];

interface Workspace {
  id: number;
  name: string;
  industry?: string;
  companySize?: string;
  createdAt?: string;
}

export default function WorkspaceSetupPage() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; industry: string; companySize: string }) =>
      apiRequest("POST", "/api/workspaces", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setActiveWorkspace(created);
      setShowForm(false);
      setName("");
      setIndustry("");
      setCompanySize("");
      toast({ title: "Workspace created successfully" });
    },
    onError: () => toast({ title: "Failed to create workspace", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast({ title: "Workspace name is required", variant: "destructive" });
    if (!companySize) return toast({ title: "Please select a company size", variant: "destructive" });
    createMutation.mutate({ name: name.trim(), industry, companySize });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Workspace Setup
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage your team workspaces</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} data-testid="button-new-workspace">
          <Plus className="h-4 w-4 mr-2" />
          New Workspace
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Create Workspace</CardTitle>
            <CardDescription>Set up a new workspace for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Workspace Name *</Label>
                <Input
                  id="ws-name"
                  data-testid="input-workspace-name"
                  placeholder="e.g. Acme Corp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger data-testid="select-industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Company Size *</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger data-testid="select-company-size">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s} employees</SelectItem>
                      ))}
                    </SelectContent>
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse h-32" />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No workspaces yet</p>
            <p className="text-muted-foreground mb-4">Create your first workspace to get started</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${activeWorkspace?.id === ws.id ? "border-primary bg-primary/5" : ""}`}
              onClick={() => setActiveWorkspace(ws)}
              data-testid={`card-workspace-${ws.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{ws.name}</div>
                      {ws.industry && <div className="text-sm text-muted-foreground">{ws.industry}</div>}
                    </div>
                  </div>
                  {activeWorkspace?.id === ws.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {ws.companySize && (
                    <Badge variant="secondary" data-testid={`badge-size-${ws.id}`}>
                      {ws.companySize} employees
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
