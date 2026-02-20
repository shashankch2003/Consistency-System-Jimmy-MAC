const APP_NAME = "Consistency System";

export function generateShareText(section: string, data: Record<string, string | number>): string {
  let text = `${APP_NAME} — ${section}\n${"—".repeat(30)}\n`;
  Object.entries(data).forEach(([key, value]) => {
    text += `${key}: ${value}\n`;
  });
  text += `\nTracked with ${APP_NAME}`;
  return text;
}

export async function shareData(section: string, data: Record<string, string | number>) {
  const text = generateShareText(section, data);

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${APP_NAME} — ${section}`,
        text,
      });
      return { success: true, method: "share" as const };
    } catch {
      // User cancelled or share failed, fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return { success: true, method: "clipboard" as const };
  } catch {
    return { success: false, method: "none" as const };
  }
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    `${APP_NAME} — ${filename}`,
    "",
    headers.join(","),
    ...rows.map(row => row.map(cell => {
      const str = String(cell);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename.replace(/\s+/g, "_")}_${APP_NAME.replace(/\s+/g, "_")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
