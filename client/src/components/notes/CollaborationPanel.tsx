const comments = [
  {
    id: 1,
    name: "Alice Kim",
    initials: "AK",
    time: "2h ago",
    text: "We should reconsider the timeline for Sprint 2. The current estimates seem optimistic given the complexity of the database schema.",
  },
  {
    id: 2,
    name: "Bob Lee",
    initials: "BL",
    time: "4h ago",
    text: "Great point on using Drizzle ORM! The type safety it provides will save us a lot of debugging time.",
  },
  {
    id: 3,
    name: "Carol M.",
    initials: "CM",
    time: "Yesterday",
    text: "I've added some notes about the API structure in the Research page. Could you review?",
  },
];

const activityLog = [
  { text: "Alice edited Block 3", time: "2h ago" },
  { text: "Bob added a comment", time: "4h ago" },
  { text: "Carol created this page", time: "Yesterday" },
  { text: "Alice changed status to In Progress", time: "2 days ago" },
  { text: "Bob pinned this page", time: "3 days ago" },
];

const reactions = [
  { snippet: "We should reconsider the timeline...", emojis: [{ e: "❤️", count: 3 }, { e: "👍", count: 1 }] },
  { snippet: "Great point on using Drizzle ORM!", emojis: [{ e: "🎉", count: 2 }] },
];

export default function CollaborationPanel() {
  const activeTab = "Comments";

  return (
    <div className="w-[320px] bg-white border-l border-gray-200 h-full flex flex-col overflow-hidden">
      <div className="flex border-b border-gray-200 px-4 pt-3 gap-4">
        <div className={`text-sm pb-2 cursor-pointer border-b-2 ${activeTab === "Comments" ? "border-blue-500 text-blue-700 font-medium" : "border-transparent text-gray-500"}`}>
          Comments
        </div>
        <div className={`text-sm pb-2 cursor-pointer border-b-2 ${activeTab === "Activity" ? "border-blue-500 text-blue-700 font-medium" : "border-transparent text-gray-500"}`}>
          Activity
        </div>
      </div>

      {activeTab === "Comments" && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {c.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm text-gray-800">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.time}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{c.text}</p>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs text-blue-600 cursor-pointer hover:underline">Reply</span>
                  <span className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Resolve</span>
                </div>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-400 mb-2 uppercase font-semibold tracking-wider">Reactions on this page</div>
            {reactions.map((r, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span className="text-xs text-gray-500 truncate flex-1 italic">"{r.snippet.slice(0, 32)}..."</span>
                <div className="flex gap-1 shrink-0">
                  {r.emojis.map(em => (
                    <span key={em.e} className="bg-gray-100 text-xs px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-gray-200">
                      {em.e} {em.count}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Activity" && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {activityLog.map((entry, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{entry.text}</span>
              <span className="text-xs text-gray-400 shrink-0 ml-2">{entry.time}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-200 p-3 flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 mt-0.5">
          Me
        </div>
        <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-text">
          Write a comment...
        </div>
      </div>
    </div>
  );
}
