import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useNotes, Block } from "./NotesContext";

interface Slide {
  heading: string;
  headingLevel: 1 | 2;
  blocks: Block[];
}

function buildSlides(blocks: Block[]): Slide[] {
  const slides: Slide[] = [];
  let current: Slide | null = null;

  for (const block of blocks) {
    if (block.type === "heading1" || block.type === "heading2") {
      if (current) slides.push(current);
      current = { heading: block.content || "Untitled Slide", headingLevel: block.type === "heading1" ? 1 : 2, blocks: [] };
    } else if (current) {
      current.blocks.push(block);
    } else {
      current = { heading: "Introduction", headingLevel: 1, blocks: [block] };
    }
  }
  if (current) slides.push(current);
  if (slides.length === 0) slides.push({ heading: "Empty Presentation", headingLevel: 1, blocks: [] });
  return slides;
}

function renderSlideBlock(block: Block, idx: number) {
  switch (block.type) {
    case "text": return block.content ? <p key={idx} className="text-white/80 text-xl leading-relaxed">{block.content}</p> : null;
    case "heading3": return <h3 key={idx} className="text-white text-2xl font-semibold mt-4">{block.content}</h3>;
    case "bullet_list": return <div key={idx} className="flex items-start gap-3"><span className="text-blue-400 mt-2">•</span><p className="text-white/80 text-xl">{block.content}</p></div>;
    case "numbered_list": return <div key={idx} className="flex items-start gap-3"><span className="text-blue-400 text-sm mt-2 w-5 shrink-0">{idx + 1}.</span><p className="text-white/80 text-xl">{block.content}</p></div>;
    case "quote": return <blockquote key={idx} className="border-l-4 border-blue-400 pl-6 py-2 italic text-white/60 text-xl">{block.content}</blockquote>;
    case "callout": return <div key={idx} className="bg-white/10 rounded-xl p-4 flex gap-3"><span className="text-2xl">{block.properties.icon ?? "💡"}</span><p className="text-white/80 text-lg">{block.content}</p></div>;
    case "divider": return <hr key={idx} className="border-white/20 my-2" />;
    case "code": return <pre key={idx} className="bg-white/10 rounded-xl p-4 text-green-300 font-mono text-sm overflow-x-auto">{block.content}</pre>;
    case "todo": return <div key={idx} className="flex items-center gap-3"><div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${block.properties.checked ? "border-blue-400 bg-blue-400" : "border-white/40"}`}>{block.properties.checked && <span className="text-white text-xs">✓</span>}</div><p className={`text-xl ${block.properties.checked ? "line-through text-white/40" : "text-white/80"}`}>{block.content}</p></div>;
    default: return null;
  }
}

export default function PresentationMode() {
  const { selectedPage, setPresentationModeOpen } = useNotes();
  const [slideIdx, setSlideIdx] = useState(0);

  const slides = selectedPage ? buildSlides(selectedPage.blocks) : [];
  const total = slides.length;
  const current = slides[slideIdx];

  const prev = useCallback(() => setSlideIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setSlideIdx(i => Math.min(total - 1, i + 1)), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresentationModeOpen(false);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [prev, next, setPresentationModeOpen]);

  if (!selectedPage || !current) return null;

  const slideBlocks = current.blocks.filter(b => b.content || b.type === "divider");

  return (
    <div className="fixed inset-0 bg-gray-950 z-[100] flex flex-col select-none">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <span className="text-white/40 text-sm font-mono">{slideIdx + 1} / {total}</span>
        <button className="text-white/40 hover:text-white transition-colors" onClick={() => setPresentationModeOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-16 py-16">
        <div className="max-w-[900px] w-full">
          <div className="mb-2">
            <span className="text-blue-400 text-sm font-medium uppercase tracking-widest">
              {slideIdx === 0 ? selectedPage.icon + " " + (selectedPage.title || "Untitled") : `Slide ${slideIdx + 1}`}
            </span>
          </div>
          <h1 className={`font-bold text-white mb-8 leading-tight ${current.headingLevel === 1 ? "text-5xl" : "text-4xl"}`}>
            {current.heading}
          </h1>
          <div className="space-y-4">
            {slideBlocks.map((b, i) => renderSlideBlock(b, i))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 pb-8">
        <button
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30"
          onClick={prev} disabled={slideIdx === 0}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`rounded-full transition-all ${i === slideIdx ? "w-6 h-2 bg-blue-400" : "w-2 h-2 bg-white/20 hover:bg-white/40"}`}
              onClick={() => setSlideIdx(i)}
            />
          ))}
        </div>

        <button
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30"
          onClick={next} disabled={slideIdx === total - 1}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 text-white/20 text-xs">← → arrow keys to navigate • Esc to exit</div>
    </div>
  );
}
