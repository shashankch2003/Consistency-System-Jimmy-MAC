import { ChevronRight } from "lucide-react";

function GripHandle() {
  return (
    <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 cursor-grab">
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5" cy="5" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="11" r="1.2" />
        <circle cx="11" cy="5" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="11" r="1.2" />
      </svg>
    </div>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div className="group relative py-0.5">
      <GripHandle />
      {children}
    </div>
  );
}

export default function BlockEditor() {
  return (
    <div className="w-full min-h-[400px] space-y-0.5">
      <Block>
        <p className="text-base text-gray-700 py-1 px-1">
          This is a regular paragraph block. You can write anything here and it will be formatted as body text. The editor supports rich text formatting including bold, italic, and links.
        </p>
      </Block>

      <Block>
        <h2 className="text-2xl font-semibold text-gray-900 py-2 px-1">Project Overview</h2>
      </Block>

      <Block>
        <ul className="pl-6 space-y-1 py-1">
          <li className="text-base text-gray-700 list-disc">Implement the core authentication flow with Replit Auth</li>
          <li className="text-base text-gray-700 list-disc">Set up the PostgreSQL database schema with Drizzle ORM</li>
          <li className="text-base text-gray-700 list-disc">Build the dashboard layout and navigation system</li>
        </ul>
      </Block>

      <Block>
        <div className="flex flex-col gap-1.5 py-1 px-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-500 flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 6l3 3 5-5" />
              </svg>
            </div>
            <span className="text-base text-gray-400 line-through">Set up project repository and initial structure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
            <span className="text-base text-gray-700">Configure Drizzle ORM and run initial migration</span>
          </div>
        </div>
      </Block>

      <Block>
        <div className="flex items-center gap-2 py-1 px-1 cursor-pointer">
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-base text-gray-700 font-medium">Click to expand — Toggle Block</span>
        </div>
      </Block>

      <Block>
        <div className="border-l-4 border-gray-300 pl-4 py-1 my-1">
          <p className="italic text-gray-600 text-base">"The best way to predict the future is to build it." — Alan Kay</p>
        </div>
      </Block>

      <Block>
        <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg flex gap-3 my-1">
          <span className="text-xl shrink-0">⚠️</span>
          <p className="text-sm text-amber-800">Always test your changes in development before deploying to production. Make sure all API routes are protected with the isAuthenticated middleware.</p>
        </div>
      </Block>

      <Block>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-x-auto my-1 relative">
          <span className="absolute top-2 right-3 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">python</span>
          <div>def calculate_productivity(tasks, habits):</div>
          <div className="pl-4">score = sum(t.weight for t in tasks if t.completed)</div>
          <div className="pl-4">return min(score / 100, 1.0)</div>
        </div>
      </Block>

      <Block>
        <div className="border-t border-gray-200 my-4" />
      </Block>

      <Block>
        <div className="border border-gray-200 rounded-lg overflow-hidden my-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-gray-600 font-medium border border-gray-200">Feature</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium border border-gray-200">Status</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium border border-gray-200">Priority</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border border-gray-200">Auth Flow</td>
                <td className="px-3 py-2 border border-gray-200 text-green-600">Done</td>
                <td className="px-3 py-2 border border-gray-200">High</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-gray-200">Dashboard</td>
                <td className="px-3 py-2 border border-gray-200 text-yellow-600">In Progress</td>
                <td className="px-3 py-2 border border-gray-200">High</td>
              </tr>
              <tr>
                <td className="px-3 py-2 border border-gray-200">Notes System</td>
                <td className="px-3 py-2 border border-gray-200 text-gray-400">Planned</td>
                <td className="px-3 py-2 border border-gray-200">Medium</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Block>

      <div className="py-4 px-1">
        <div className="h-5 w-0.5 bg-blue-400 animate-pulse inline-block" />
      </div>
    </div>
  );
}
