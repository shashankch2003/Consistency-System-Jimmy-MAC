import { Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { shareData, downloadCSV } from "@/lib/share-download";

interface ShareDownloadBarProps {
  section: string;
  shareData_: Record<string, string | number>;
  csvFilename: string;
  csvHeaders: string[];
  csvRows: (string | number)[][];
}

export function ShareDownloadBar({ section, shareData_, csvFilename, csvHeaders, csvRows }: ShareDownloadBarProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const result = await shareData(section, shareData_);
    if (result.success && result.method === "clipboard") {
      toast({ title: "Copied to clipboard!", description: "Share this summary anywhere you like." });
    } else if (!result.success) {
      toast({ title: "Could not share", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    downloadCSV(csvFilename, csvHeaders, csvRows);
    toast({ title: "Download started", description: `${csvFilename} is being downloaded.` });
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={handleShare} data-testid="button-share">
        <Share2 className="w-4 h-4" />
        Share
      </Button>
      <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload} data-testid="button-download">
        <Download className="w-4 h-4" />
        Download
      </Button>
    </div>
  );
}
