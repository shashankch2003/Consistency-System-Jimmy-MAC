import { generateWithContext } from "@/lib/aiHelpers";
import type { GatheredData } from "./dataGatherer";

export interface TemplateSection {
  id: string;
  title: string;
  type: "static_text" | "data_query" | "ai_generated" | "user_input";
  content?: string;
  dataQuery?: string;
  aiPrompt?: string;
  userInput?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  sections: TemplateSection[];
}

export interface AssembledSection {
  sectionId: string;
  title: string;
  content: string;
  status: "pending" | "generating" | "done" | "error";
}

export interface AssemblyProgress {
  currentSection: number;
  totalSections: number;
  sections: AssembledSection[];
  isDone: boolean;
}

function formatTasksAsMarkdown(
  tasks: GatheredData["tasks"]
): string {
  if (tasks.length === 0) return "_No tasks in this period._";
  const done = tasks.filter((t) => t.completionPercentage >= 100);
  const inProgress = tasks.filter((t) => t.completionPercentage > 0 && t.completionPercentage < 100);
  const todo = tasks.filter((t) => t.completionPercentage === 0);
  const lines: string[] = [];
  if (done.length) lines.push(`**Completed (${done.length}):**\n` + done.map((t) => `- ${t.title}`).join("\n"));
  if (inProgress.length) lines.push(`**In Progress (${inProgress.length}):**\n` + inProgress.map((t) => `- ${t.title} (${t.completionPercentage}%)`).join("\n"));
  if (todo.length) lines.push(`**To Do (${todo.length}):**\n` + todo.map((t) => `- ${t.title}`).join("\n"));
  return lines.join("\n\n");
}

function formatNotesAsMarkdown(notes: GatheredData["notes"]): string {
  if (notes.length === 0) return "_No notes in this period._";
  return notes.map((n) => `- ${n.title}`).join("\n");
}

function formatMessagesAsMarkdown(msgs: GatheredData["groupMessages"]): string {
  if (msgs.length === 0) return "_No group messages in this period._";
  return msgs.slice(0, 10).map((m) => `- ${m.message.slice(0, 100)}`).join("\n");
}

function processDataQuery(query: string, data: GatheredData): string {
  if (query.includes("tasks")) return formatTasksAsMarkdown(data.tasks);
  if (query.includes("notes")) return formatNotesAsMarkdown(data.notes);
  if (query.includes("messages")) return formatMessagesAsMarkdown(data.groupMessages);
  return "_No data available._";
}

export async function assembleDocument(
  template: DocumentTemplate,
  data: GatheredData,
  onProgress: (progress: AssemblyProgress) => void
): Promise<AssembledSection[]> {
  const sections: AssembledSection[] = template.sections.map((s) => ({
    sectionId: s.id,
    title: s.title,
    content: "",
    status: "pending" as const,
  }));

  for (let i = 0; i < template.sections.length; i++) {
    const section = template.sections[i];
    sections[i].status = "generating";
    onProgress({ currentSection: i, totalSections: template.sections.length, sections: [...sections], isDone: false });

    try {
      if (section.type === "static_text") {
        sections[i].content = section.content ?? "";
      } else if (section.type === "data_query") {
        sections[i].content = processDataQuery(section.dataQuery ?? "", data);
      } else if (section.type === "ai_generated") {
        const prompt = section.aiPrompt ?? `Write a ${section.title} section for a productivity report.`;
        sections[i].content = await generateWithContext(prompt, {
          tasks: data.tasks,
          notes: data.notes,
          dateRange: data.dateRange,
          projectName: data.projectName,
        }).catch(() => `_AI generation unavailable for "${section.title}"._`);
      } else if (section.type === "user_input") {
        sections[i].content = section.userInput ?? "_User input required._";
      }
      sections[i].status = "done";
    } catch {
      sections[i].content = `_Error generating "${section.title}"._`;
      sections[i].status = "error";
    }

    onProgress({ currentSection: i + 1, totalSections: template.sections.length, sections: [...sections], isDone: false });
  }

  onProgress({ currentSection: template.sections.length, totalSections: template.sections.length, sections: [...sections], isDone: true });
  return sections;
}

export function sectionsToMarkdown(sections: AssembledSection[]): string {
  return sections
    .map((s) => `## ${s.title}\n\n${s.content}`)
    .join("\n\n---\n\n");
}
