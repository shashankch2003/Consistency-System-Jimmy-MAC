import { useState } from "react";
import { FileText, CheckCircle, Loader2 } from "lucide-react";
import { gatherData, type DocGenConfig } from "@/lib/docgen/dataGatherer";
import { assembleDocument, sectionsToMarkdown, type DocumentTemplate } from "@/lib/docgen/documentAssembler";

const TEMPLATE_SECTIONS: Array<{
  label: string;
  templates: Array<{ id: string; icon: string; title: string; desc: string; sections: DocumentTemplate["sections"] }>;
}> = [
  {
    label: "REPORTS",
    templates: [
      {
        id: "weekly_status", icon: "📊", title: "Weekly Status Report",
        desc: "Summarizes weekly task completion, blockers, and next steps.",
        sections: [
          { id: "s1", title: "Executive Summary", type: "ai_generated", aiPrompt: "Write an executive summary for this week's status report." },
          { id: "s2", title: "Task Completion", type: "data_query", dataQuery: "tasks" },
          { id: "s3", title: "Key Highlights", type: "ai_generated", aiPrompt: "What were the key highlights this week?" },
          { id: "s4", title: "Blockers & Risks", type: "user_input" },
          { id: "s5", title: "Next Week Plan", type: "ai_generated", aiPrompt: "Based on incomplete tasks, what should be prioritized next week?" },
          { id: "s6", title: "Notes", type: "data_query", dataQuery: "notes" },
          { id: "s7", title: "Team Messages", type: "data_query", dataQuery: "messages" },
          { id: "s8", title: "Recommendations", type: "ai_generated", aiPrompt: "Provide 2-3 actionable recommendations." },
        ],
      },
      {
        id: "sprint_retro", icon: "🔁", title: "Sprint Retrospective",
        desc: "Documents what went well, what didn't, and action items.",
        sections: [
          { id: "s1", title: "What Went Well", type: "ai_generated", aiPrompt: "Based on completed tasks, what went well?" },
          { id: "s2", title: "What Needs Improvement", type: "user_input" },
          { id: "s3", title: "Task Summary", type: "data_query", dataQuery: "tasks" },
          { id: "s4", title: "Action Items", type: "user_input" },
          { id: "s5", title: "Team Shoutouts", type: "ai_generated", aiPrompt: "Write positive team recognition based on performance." },
        ],
      },
    ],
  },
  {
    label: "PLANNING",
    templates: [
      {
        id: "project_brief", icon: "🎯", title: "Project Brief",
        desc: "Defines project goals, scope, timeline, and stakeholders.",
        sections: [
          { id: "s1", title: "Project Overview", type: "ai_generated", aiPrompt: "Write a project overview based on the provided context." },
          { id: "s2", title: "Goals & Objectives", type: "user_input" },
          { id: "s3", title: "Scope", type: "user_input" },
          { id: "s4", title: "Timeline", type: "data_query", dataQuery: "tasks" },
          { id: "s5", title: "Stakeholders", type: "user_input" },
          { id: "s6", title: "Risks", type: "ai_generated", aiPrompt: "Identify potential risks for this project." },
          { id: "s7", title: "Success Metrics", type: "user_input" },
          { id: "s8", title: "Resources", type: "user_input" },
        ],
      },
    ],
  },
  {
    label: "HANDOFFS",
    templates: [
      {
        id: "handoff_doc", icon: "🤝", title: "Handoff Document",
        desc: "Captures all context needed for a smooth project handoff.",
        sections: [
          { id: "s1", title: "Project Context", type: "ai_generated", aiPrompt: "Summarize the project context for handoff." },
          { id: "s2", title: "Current Status", type: "data_query", dataQuery: "tasks" },
          { id: "s3", title: "Pending Tasks", type: "data_query", dataQuery: "tasks" },
          { id: "s4", title: "Key Notes", type: "data_query", dataQuery: "notes" },
          { id: "s5", title: "Access & Credentials", type: "user_input" },
          { id: "s6", title: "Known Issues", type: "user_input" },
          { id: "s7", title: "Recommended Next Steps", type: "ai_generated", aiPrompt: "What should the new owner do first?" },
        ],
      },
      {
        id: "onboarding_guide", icon: "📖", title: "Onboarding Guide",
        desc: "Step-by-step guide for onboarding a new team member.",
        sections: [
          { id: "s1", title: "Welcome", type: "static_text", content: "Welcome to the team! This guide will help you get started." },
          { id: "s2", title: "First Week Tasks", type: "data_query", dataQuery: "tasks" },
          { id: "s3", title: "Tools & Access", type: "user_input" },
          { id: "s4", title: "Team Overview", type: "user_input" },
          { id: "s5", title: "Key Resources", type: "data_query", dataQuery: "notes" },
        ],
      },
    ],
  },
  {
    label: "CUSTOM",
    templates: [
      {
        id: "custom", icon: "✏️", title: "Describe what you need",
        desc: "Tell AI what kind of document you need and it will generate a template.",
        sections: [
          { id: "s1", title: "AI Generated Content", type: "ai_generated", aiPrompt: "Generate a document as described." },
        ],
      },
    ],
  },
];

type DateRange = "this_week" | "last_week" | "this_month" | "last_month" | "custom";

interface TemplateSelectorProps {
  onClose?: () => void;
  onDocumentCreated?: (content: string, title: string) => void;
  onCreateCustom?: () => void;
}

type Phase = "select" | "config" | "generating" | "done";

interface ProgressStep { label: string; done: boolean; spinning: boolean; }

export default function TemplateSelector({ onClose, onDocumentCreated, onCreateCustom }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATE_SECTIONS[0]["templates"][0] | null>(null);
  const [phase, setPhase] = useState<Phase>("select");

  const [dateRange, setDateRange] = useState<DateRange>("this_week");
  const [projectName, setProjectName] = useState("");
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeMessages, setIncludeMessages] = useState(false);
  const [includeActivity, setIncludeActivity] = useState(false);
  const [extraNotes, setExtraNotes] = useState("");

  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [progressPct, setProgressPct] = useState(0);

  function handleSelectTemplate(tmpl: typeof TEMPLATE_SECTIONS[0]["templates"][0]) {
    setSelectedTemplate(tmpl);
    setPhase("config");
  }

  async function handleGenerate() {
    if (!selectedTemplate) return;
    setPhase("generating");

    const config: DocGenConfig = {
      dateRange,
      projectName: projectName || undefined,
      includeTasks,
      includeNotes,
      includeGroupMessages: includeMessages,
      includeActivity,
    };

    const data = gatherData(config, [], [], []);
    const template: DocumentTemplate = {
      id: selectedTemplate.id,
      name: selectedTemplate.title,
      sections: selectedTemplate.sections,
    };

    const steps: ProgressStep[] = [
      { label: "Fetching task data", done: false, spinning: true },
      { label: "Analyzing patterns", done: false, spinning: false },
      { label: "Generating document", done: false, spinning: false },
      { label: "Formatting output", done: false, spinning: false },
    ];
    setProgressSteps([...steps]);

    setTimeout(() => {
      steps[0] = { ...steps[0], done: true, spinning: false };
      steps[1] = { ...steps[1], spinning: true };
      setProgressSteps([...steps]);
      setProgressPct(25);
    }, 600);

    setTimeout(() => {
      steps[1] = { ...steps[1], done: true, spinning: false };
      steps[2] = { ...steps[2], spinning: true };
      setProgressSteps([...steps]);
      setProgressPct(50);
    }, 1200);

    try {
      await assembleDocument(template, data, (progress) => {
        const pct = Math.round((progress.currentSection / progress.totalSections) * 50) + 50;
        setProgressPct(Math.min(pct, 95));
        if (progress.isDone) {
          steps[2] = { ...steps[2], done: true, spinning: false };
          steps[3] = { ...steps[3], done: true, spinning: false };
          setProgressSteps([...steps]);
          setProgressPct(100);
          const markdown = progress.sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
          setTimeout(() => {
            onDocumentCreated?.(markdown, selectedTemplate.title);
            setPhase("done");
          }, 400);
        }
      });
    } catch {
      steps[2] = { ...steps[2], spinning: false };
      setProgressSteps([...steps]);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="max-w-[560px] w-full rounded-xl shadow-2xl bg-white p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold text-gray-900">Generate Document with AI</h2>
        </div>

        {(phase === "select" || phase === "config") && (
          <>
            {TEMPLATE_SECTIONS.map((section) => (
              <div key={section.label} className="mb-5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{section.label}</div>
                <div className="grid grid-cols-1 gap-2">
                  {section.templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className={`bg-white rounded-lg shadow-sm p-4 border cursor-pointer flex items-start gap-3 transition-all ${
                        selectedTemplate?.id === tmpl.id
                          ? "border-blue-500 shadow-md bg-blue-50"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => handleSelectTemplate(tmpl)}
                    >
                      <span className="text-2xl shrink-0">{tmpl.icon}</span>
                      <div>
                        <div className="font-medium text-sm text-gray-900">{tmpl.title}</div>
                        <p className="text-xs text-gray-500 mt-0.5">{tmpl.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button className="text-sm text-blue-500 hover:underline mb-6" onClick={onCreateCustom}>
              + Create Custom Template
            </button>
          </>
        )}

        {phase === "config" && selectedTemplate && (
          <div className="border-t pt-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Configuration — {selectedTemplate.title}
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Date Range</label>
                  <select
                    className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRange)}
                  >
                    <option value="this_week">This Week</option>
                    <option value="last_week">Last Week</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Project</label>
                  <input
                    className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none"
                    placeholder="All projects"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Include data</label>
                <div className="flex gap-4 flex-wrap">
                  {[
                    { label: "Tasks",    checked: includeTasks,    setter: setIncludeTasks },
                    { label: "Notes",    checked: includeNotes,    setter: setIncludeNotes },
                    { label: "Messages", checked: includeMessages, setter: setIncludeMessages },
                    { label: "Activity", checked: includeActivity, setter: setIncludeActivity },
                  ].map(({ label, checked, setter }) => (
                    <label key={label} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setter(e.target.checked)}
                        className="rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Additional notes</label>
                <textarea
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm h-20 resize-none focus:outline-none"
                  placeholder="Any specific focus areas..."
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                />
              </div>
              <button
                className="w-full bg-blue-600 text-white text-sm py-2 rounded-md"
                onClick={handleGenerate}
              >
                Generate Document
              </button>
            </div>
          </div>
        )}

        {(phase === "generating" || phase === "done") && (
          <div className="border-t pt-5 mt-5">
            <div className="space-y-2 mb-3">
              {progressSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.done ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : step.spinning ? (
                    <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  <span className={`text-sm ${step.done ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-2 bg-gray-100 rounded-full mt-2">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {phase === "done" && (
              <div className="mt-4 text-center">
                <p className="text-sm text-green-600 font-medium mb-2">Document generated!</p>
                <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md" onClick={onClose}>
                  View Document
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
