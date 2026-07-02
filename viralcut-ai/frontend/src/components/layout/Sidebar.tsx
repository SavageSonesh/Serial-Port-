import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "▦", end: true },
  { to: "/new", label: "New Project", icon: "➕", end: false },
  { to: "/settings", label: "Settings", icon: "⚙", end: false },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-white/5 bg-base-900 px-3 py-5">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-glow font-bold text-white">
          V
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-tight">ViralCut AI</div>
          <div className="text-[11px] text-slate-500 leading-tight">local &amp; private</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? "bg-accent/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-white/5 bg-base-850 px-3 py-3 text-[11px] leading-relaxed text-slate-500">
        Your videos are processed locally and are not uploaded to an external server.
      </div>
    </aside>
  );
}
