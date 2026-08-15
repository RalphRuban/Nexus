import { ActivityLog } from "@/types/nexus";

interface ActivityTimelineProps {
  activity: ActivityLog[];
}

export default function ActivityTimeline({
  activity,
}: ActivityTimelineProps) {
  return (
    <div className="border-t border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-5 py-3">
        <p className="text-[10px] font-semibold tracking-widest text-slate-500">
          SYSTEM ACTIVITY
        </p>
      </div>

      <div className="max-h-[180px] overflow-y-auto">
        {activity.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 border-b border-slate-900 px-5 py-3"
          >
            <span className="font-mono text-[10px] text-slate-600">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>

            <span className="rounded bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-300">
              {item.actor}
            </span>

            <span className="text-xs text-slate-400">
              {item.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}