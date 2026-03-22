export interface TeamMember {
  id: string;
  name: string;
  skills: { name: string; level: "Expert" | "Intermediate" | "Beginner" | "None" }[];
  domains: string[];
  currentTasks: number;
  maxTasks: number;
  overdueCount: number;
  availability: "working" | "free" | "available" | "busy" | "offline";
  completionRate: number;
}

export interface ScoredCandidate {
  member: TeamMember;
  score: number;
  breakdown: {
    skillMatch: number;
    workloadFit: number;
    availabilityFit: number;
    pastPerformance: number;
    domainExperience: number;
  };
  reasoning: string;
}

interface TaskContext {
  title: string;
  requiredSkill?: string;
  domain?: string;
}

function skillMatchScore(member: TeamMember, requiredSkill?: string): number {
  if (!requiredSkill) return 60;
  const skill = member.skills.find(
    (s) => s.name.toLowerCase() === requiredSkill.toLowerCase()
  );
  if (!skill) return 10;
  return { Expert: 100, Intermediate: 70, Beginner: 40, None: 10 }[skill.level];
}

function workloadFitScore(member: TeamMember): number {
  const ratio = member.currentTasks / Math.max(member.maxTasks, 1);
  let score = Math.max(0, 20 - ratio * 20);
  if (member.overdueCount > 0) score -= 20;
  else score += 10;
  return Math.max(0, Math.min(100, score));
}

function availabilityFitScore(member: TeamMember): number {
  return { working: 50, free: 30, available: 20, busy: 5, offline: 0 }[member.availability] ?? 0;
}

function pastPerformanceScore(member: TeamMember): number {
  return Math.round(member.completionRate * 100);
}

function domainExperienceScore(member: TeamMember, domain?: string): number {
  if (!domain) return 60;
  const exact = member.domains.find((d) => d.toLowerCase() === domain.toLowerCase());
  if (exact) return 100;
  const related = member.domains.find((d) =>
    d.toLowerCase().includes(domain.toLowerCase().slice(0, 4))
  );
  if (related) return 60;
  return 20;
}

function buildReasoning(breakdown: ScoredCandidate["breakdown"], member: TeamMember): string {
  const parts: string[] = [];
  if (breakdown.skillMatch >= 70) parts.push("strong skill match");
  if (breakdown.workloadFit >= 15) parts.push("available capacity");
  if (breakdown.availabilityFit >= 30) parts.push("currently accessible");
  if (breakdown.pastPerformance >= 80) parts.push("excellent track record");
  if (breakdown.domainExperience >= 80) parts.push("domain expertise");
  return parts.length > 0
    ? `Best fit due to ${parts.join(", ")}.`
    : `${member.name} has some relevant skills for this task.`;
}

export function scoreAndRankCandidates(
  members: TeamMember[],
  task: TaskContext
): ScoredCandidate[] {
  const scored = members.map((member) => {
    const breakdown = {
      skillMatch: skillMatchScore(member, task.requiredSkill),
      workloadFit: workloadFitScore(member),
      availabilityFit: availabilityFitScore(member),
      pastPerformance: pastPerformanceScore(member),
      domainExperience: domainExperienceScore(member, task.domain),
    };
    const score =
      breakdown.skillMatch * 0.3 +
      breakdown.workloadFit * 0.25 +
      breakdown.availabilityFit * 0.2 +
      breakdown.pastPerformance * 0.15 +
      breakdown.domainExperience * 0.1;

    return {
      member,
      score: Math.round(score),
      breakdown,
      reasoning: buildReasoning(breakdown, member),
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}
