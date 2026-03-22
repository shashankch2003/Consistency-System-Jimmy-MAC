import { ChevronRight } from "lucide-react";

export default function PageView() {
  return (
    <div className="flex-1 max-w-[900px] mx-auto px-16 py-8">
      <div className="h-[200px] w-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-b-lg relative mb-2">
        <div className="absolute bottom-3 right-3 text-white/70 text-xs cursor-pointer hover:text-white">Change cover</div>
      </div>

      <div className="text-5xl -mt-8 ml-2 relative z-10 cursor-pointer select-none">📁</div>

      <div className="flex items-center gap-1 text-xs text-gray-400 mt-3">
        <span className="hover:text-gray-600 cursor-pointer">Notes</span>
        <ChevronRight className="w-3 h-3" />
        <span className="hover:text-gray-600 cursor-pointer">Project Notes</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-600">Sprint 1</span>
        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full ml-2">In Progress</span>
        <span className="text-xs text-gray-400 ml-auto">342 words · 2 min read · Last edited 3h ago</span>
      </div>

      <h1 className="text-4xl font-bold text-gray-900 mt-2 outline-none w-full border-0 bg-transparent">
        Sprint 1 Planning
      </h1>

      <div className="mt-6 min-h-[400px] space-y-1">
        <div className="group relative py-0.5">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 cursor-grab">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="5" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="11" r="1.2" />
              <circle cx="11" cy="5" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="11" r="1.2" />
            </svg>
          </div>
          <p className="text-base text-gray-700 py-1 px-1">
            This sprint focuses on delivering the core authentication flow, dashboard layout, and the first set of productivity tracking features. The team will work in two-week cycles with daily standups.
          </p>
        </div>

        <div className="group relative py-0.5">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 cursor-grab">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="5" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="11" r="1.2" />
              <circle cx="11" cy="5" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="11" r="1.2" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 py-2">Key Decisions</h2>
        </div>

        <div className="group relative py-0.5">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 cursor-grab">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="5" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="11" r="1.2" />
              <circle cx="11" cy="5" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="11" r="1.2" />
            </svg>
          </div>
          <ul className="pl-6 text-gray-700 text-base space-y-1 py-1">
            <li className="list-disc">Use React Query for server state management</li>
            <li className="list-disc">PostgreSQL with Drizzle ORM for the data layer</li>
            <li className="list-disc">Replit Auth for user authentication</li>
          </ul>
        </div>

        <div className="group relative py-0.5">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 cursor-grab">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="5" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="11" r="1.2" />
              <circle cx="11" cy="5" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="11" r="1.2" />
            </svg>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg flex gap-3 my-2">
            <span className="text-xl">💡</span>
            <p className="text-sm text-blue-800">Remember to run drizzle-kit push after every schema change to keep the database in sync with the TypeScript types.</p>
          </div>
        </div>

        <div className="group relative py-0.5">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 cursor-grab">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="5" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="11" r="1.2" />
              <circle cx="11" cy="5" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="11" r="1.2" />
            </svg>
          </div>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm my-2 relative">
            <span className="absolute top-2 right-3 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">javascript</span>
            <div>const queryClient = new QueryClient();</div>
            <div>const storage = new DatabaseStorage();</div>
            <div>await registerRoutes(httpServer, app);</div>
          </div>
        </div>
      </div>
    </div>
  );
}
