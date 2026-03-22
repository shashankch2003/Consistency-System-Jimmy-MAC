import { useState } from "react";
import { X } from "lucide-react";
import { useNotes, FontType, PageStatus } from "./NotesContext";
import { useToast } from "@/hooks/use-toast";

const STATUS_LIST: { value: PageStatus; label: string; cls: string }[] = [
  { value: "draft", label: "Draft", cls: "bg-gray-100 text-gray-600" },
  { value: "in_progress", label: "In Progress", cls: "bg-yellow-100 text-yellow-700" },
  { value: "review", label: "Review", cls: "bg-blue-100 text-blue-700" },
  { value: "final", label: "Final", cls: "bg-green-100 text-green-700" },
  { value: "archived", label: "Archived", cls: "bg-gray-200 text-gray-400" },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${checked ? "bg-blue-500" : "bg-gray-200"}`} onClick={onChange}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all ${checked ? "right-0.5" : "left-0.5"}`} />
    </div>
  );
}

export default function PageSettingsPanel() {
  const {
    selectedPage, updatePage, deletePage, duplicatePage, setSettingsPanelOpen, selectPage,
    aiCoachEnabled, toggleAiCoach,
    pageInsights, generateInsights,
    smartTagSuggestions, generateSmartTags, acceptSmartTag, dismissSmartTag,
  } = useNotes();
  const { toast } = useToast();
  const [showShare, setShowShare] = useState(false);
  const [sharePermission, setSharePermission] = useState("view");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);

  if (!selectedPage) return null;

  const wordCount = selectedPage.blocks.reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const insights = pageInsights[selectedPage.id];
  const tagSuggestions = smartTagSuggestions[selectedPage.id] ?? [];

  const handleExport = () => {
    const lines: string[] = [`# ${selectedPage.title}`, ""];
    selectedPage.blocks.forEach(b => {
      if (b.type === "heading1") lines.push(`# ${b.content}`, "");
      else if (b.type === "heading2") lines.push(`## ${b.content}`, "");
      else if (b.type === "heading3") lines.push(`### ${b.content}`, "");
      else if (b.type === "bullet_list") lines.push(`- ${b.content}`);
      else if (b.type === "numbered_list") lines.push(`1. ${b.content}`);
      else if (b.type === "todo") lines.push(`- [${b.properties.checked ? "x" : " "}] ${b.content}`);
      else if (b.type === "quote") lines.push(`> ${b.content}`, "");
      else if (b.type === "code") lines.push(`\`\`\`${b.properties.language || ""}\n${b.content}\n\`\`\``, "");
      else if (b.type === "divider") lines.push("---", "");
      else if (b.content) lines.push(b.content, "");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedPage.title || "untitled"}.md`;
    a.click();
    toast({ title: "Page exported as Markdown" });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.txt";
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        const newBlocks = text.split("\n").filter(Boolean).map(line => {
          const id = Math.random().toString(36).slice(2);
          if (line.startsWith("# ")) return { id, type: "heading1" as const, content: line.slice(2), properties: {}, children: [], indent: 0 };
          if (line.startsWith("## ")) return { id, type: "heading2" as const, content: line.slice(3), properties: {}, children: [], indent: 0 };
          if (line.startsWith("### ")) return { id, type: "heading3" as const, content: line.slice(4), properties: {}, children: [], indent: 0 };
          if (line.startsWith("- ")) return { id, type: "bullet_list" as const, content: line.slice(2), properties: {}, children: [], indent: 0 };
          if (line.startsWith("> ")) return { id, type: "quote" as const, content: line.slice(2), properties: {}, children: [], indent: 0 };
          if (line === "---") return { id, type: "divider" as const, content: "", properties: {}, children: [], indent: 0 };
          return { id, type: "text" as const, content: line, properties: {}, children: [], indent: 0 };
        });
        updatePage(selectedPage.id, { blocks: newBlocks });
        toast({ title: "Page imported from Markdown" });
        setSettingsPanelOpen(false);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleGenerateInsights = () => {
    setInsightsLoading(true);
    setTimeout(() => {
      generateInsights(selectedPage.id);
      setInsightsLoading(false);
    }, 800);
  };

  const handleGenerateSmartTags = () => {
    if (wordCount < 100) { toast({ title: "Need 100+ words to generate smart tags", variant: "destructive" }); return; }
    setTagsLoading(true);
    setTimeout(() => {
      generateSmartTags(selectedPage.id);
      setTagsLoading(false);
    }, 600);
  };

  const sentimentColor: Record<string, string> = {
    "Positive": "text-green-600 bg-green-50",
    "Neutral": "text-gray-600 bg-gray-50",
    "Negative": "text-red-600 bg-red-50",
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[340px] bg-white shadow-xl border-l z-40 overflow-y-auto">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-semibold text-lg text-gray-900">Page Settings</h2>
        <button onClick={() => setSettingsPanelOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
      </div>

      <div className="px-5 py-4 space-y-6">
        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Appearance</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["default", "serif", "mono"] as FontType[]).map(f => (
              <button key={f} onClick={() => updatePage(selectedPage.id, { font: f })}
                className={`rounded-lg border-2 p-3 text-center transition-colors ${selectedPage.font === f ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className={`text-lg font-medium mb-1 ${f === "serif" ? "font-serif" : f === "mono" ? "font-mono" : ""}`}>Aa</div>
                <div className="text-xs text-gray-500 capitalize">{f}</div>
              </button>
            ))}
          </div>
          {[
            { label: "Small text", key: "smallText" as const },
            { label: "Full width", key: "fullWidth" as const },
            { label: "Lock page", key: "locked" as const },
          ].map(({ label, key }) => (
            <div key={key} className="flex justify-between items-center py-2 text-sm text-gray-700 hover:bg-gray-50 rounded px-2 cursor-pointer" onClick={() => updatePage(selectedPage.id, { [key]: !selectedPage[key] })}>
              <span>{label}</span>
              <Toggle checked={!!selectedPage[key]} onChange={() => updatePage(selectedPage.id, { [key]: !selectedPage[key] })} />
            </div>
          ))}
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">AI Features</div>
          <div className="flex justify-between items-center py-2 text-sm text-gray-700 hover:bg-gray-50 rounded px-2 cursor-pointer" onClick={toggleAiCoach}>
            <div>
              <div className="font-medium">AI Writing Coach</div>
              <div className="text-xs text-gray-400">Suggestions as you write</div>
            </div>
            <Toggle checked={aiCoachEnabled} onChange={toggleAiCoach} />
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Page Status</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_LIST.map(s => (
              <button key={s.value} onClick={() => updatePage(selectedPage.id, { status: s.value })}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${s.cls} ${selectedPage.status === s.value ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}>
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Page Info</div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2 py-1"><span className="text-gray-400 w-28 shrink-0">Created</span><span>{formatDate(selectedPage.createdAt)}</span></div>
            <div className="flex items-center gap-2 py-1"><span className="text-gray-400 w-28 shrink-0">Last edited</span><span>{relativeTime(selectedPage.updatedAt)}</span></div>
            <div className="flex items-center gap-2 py-1"><span className="text-gray-400 w-28 shrink-0">Words</span><span>{wordCount}</span></div>
            <div className="flex items-center gap-2 py-1"><span className="text-gray-400 w-28 shrink-0">Read time</span><span>{readingTime} min</span></div>
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Page Insights</div>
          <button
            className={`w-full px-3 py-2 rounded-xl border text-sm font-medium transition-colors mb-3 ${insightsLoading ? "bg-gray-50 text-gray-400 border-gray-100" : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700"}`}
            onClick={handleGenerateInsights}
            disabled={insightsLoading}
          >
            {insightsLoading ? "Analyzing page..." : "✨ Generate Insights"}
          </button>
          {insights ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs font-semibold text-gray-400 mb-1.5">Summary</div>
                <p className="text-xs text-gray-700 leading-relaxed">{insights.summary}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs font-semibold text-gray-400 mb-2">Key Topics</div>
                <div className="flex flex-wrap gap-1.5">
                  {insights.topics.map(t => (
                    <span key={t} className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 border border-blue-100">{t}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs font-semibold text-gray-400 mb-1">Sentiment</div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sentimentColor[insights.sentiment] ?? "text-gray-600 bg-gray-50"}`}>{insights.sentiment}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs font-semibold text-gray-400 mb-1">Readability</div>
                  <span className="text-xs text-gray-700 font-medium">{insights.readability}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 text-center">Click above to generate AI insights for this page</div>
          )}
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Smart Tags</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedPage.tags.map(tag => (
              <span key={tag} className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                {tag}
                <button className="hover:text-red-500 ml-0.5" onClick={() => updatePage(selectedPage.id, { tags: selectedPage.tags.filter(t => t !== tag) })}>✕</button>
              </span>
            ))}
          </div>
          <button
            className={`w-full px-3 py-2 rounded-xl border text-sm font-medium transition-colors mb-3 ${tagsLoading ? "bg-gray-50 text-gray-400 border-gray-100" : wordCount < 100 ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed" : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700"}`}
            onClick={handleGenerateSmartTags}
            disabled={tagsLoading || wordCount < 100}
            title={wordCount < 100 ? "Need 100+ words for smart tags" : ""}
          >
            {tagsLoading ? "Analyzing..." : wordCount < 100 ? `🏷️ Need ${100 - wordCount} more words` : "🏷️ Suggest Smart Tags"}
          </button>
          {tagSuggestions.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-2">Suggested tags:</div>
              <div className="flex flex-wrap gap-1.5">
                {tagSuggestions.map(tag => (
                  <div key={tag} className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                    <span className="text-xs text-purple-700">{tag}</span>
                    <button className="text-green-500 hover:text-green-700 text-xs font-bold ml-0.5" title="Accept" onClick={() => acceptSmartTag(selectedPage.id, tag)}>✓</button>
                    <button className="text-gray-400 hover:text-red-500 text-xs ml-0.5" title="Dismiss" onClick={() => dismissSmartTag(selectedPage.id, tag)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</div>
          <div className="space-y-0.5">
            {[
              { label: "Copy link", action: () => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied to clipboard" }); } },
              { label: "Duplicate page", action: () => { const id = duplicatePage(selectedPage.id); selectPage(id); setSettingsPanelOpen(false); toast({ title: "Page duplicated" }); } },
              { label: "Share", action: () => setShowShare(true) },
              { label: "Export as Markdown", action: handleExport },
              { label: "Import from Markdown", action: handleImport },
            ].map(item => (
              <button key={item.label} className="w-full h-10 flex items-center hover:bg-gray-50 rounded px-2 text-sm cursor-pointer text-gray-700 text-left" onClick={item.action}>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Danger Zone</div>
          <button className="w-full h-10 flex items-center hover:bg-red-50 rounded px-2 text-sm cursor-pointer text-red-500 text-left" onClick={() => { deletePage(selectedPage.id); setSettingsPanelOpen(false); }}>
            Move to Trash
          </button>
        </section>
      </div>

      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-5 w-80" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Share page</h3>
              <button onClick={() => setShowShare(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-3">
              <span className="text-xs text-gray-600 flex-1 truncate">{window.location.href}</span>
              <button className="text-blue-600 text-xs font-medium shrink-0" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied" }); }}>Copy</button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Permission</span>
              <select className="text-sm border border-gray-200 rounded px-2 py-1 outline-none" value={sharePermission} onChange={e => setSharePermission(e.target.value)}>
                <option value="view">Can view</option>
                <option value="comment">Can comment</option>
                <option value="edit">Can edit</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
