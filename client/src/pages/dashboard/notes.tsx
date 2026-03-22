import { NotesProvider, useNotes } from "@/components/notes/NotesContext";
import Sidebar from "@/components/notes/Sidebar";
import PageView from "@/components/notes/PageView";
import PageSettingsPanel from "@/components/notes/PageSettingsPanel";
import SearchCommandPalette from "@/components/notes/SearchCommandPalette";
import FocusMode from "@/components/notes/FocusMode";
import SplitView from "@/components/notes/SplitView";
import ContentMap from "@/components/notes/ContentMap";
import PresentationMode from "@/components/notes/PresentationMode";

function NotesLayout() {
  const { settingsPanelOpen, searchOpen, focusModeOpen, splitViewOpen, contentMapOpen, presentationModeOpen } = useNotes();

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden">
        {splitViewOpen ? <SplitView /> : <PageView />}
      </div>
      {settingsPanelOpen && <PageSettingsPanel />}
      {searchOpen && <SearchCommandPalette />}
      {focusModeOpen && <FocusMode />}
      {contentMapOpen && <ContentMap />}
      {presentationModeOpen && <PresentationMode />}
    </div>
  );
}

export default function NotesPage() {
  return (
    <NotesProvider>
      <NotesLayout />
    </NotesProvider>
  );
}
