import { useState } from "react";
import { ExecutiveDashboard } from "@/components/reports/ExecutiveDashboard";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { ReportLibrary } from "@/components/reports/ReportLibrary";
import { FileBarChart } from "lucide-react";

type Tab = "executive" | "builder" | "library";

const TABS: { id: Tab; label: string }[] = [
  { id: "executive", label: "Executive Dashboard" },
  { id: "builder", label: "Custom Reports" },
  { id: "library", label: "Report Library" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("executive");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="reports-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-primary" />Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-0.5">Company-wide insights, custom reports, and templates</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "executive" && <ExecutiveDashboard />}
      {activeTab === "builder" && <ReportBuilder />}
      {activeTab === "library" && <ReportLibrary />}
    </div>
  );
}
