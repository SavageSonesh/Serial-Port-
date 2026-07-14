import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Compass, PlusCircle, GitCompareArrows, Network, Lightbulb,
  Clapperboard, Bookmark, Database, Settings, Moon, Sun, Radar, Menu, X,
} from 'lucide-react';
import { cn } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/explorer', label: 'Trend Explorer', icon: Compass },
  { to: '/add', label: 'Add Content', icon: PlusCircle },
  { to: '/compare', label: 'Comparison', icon: GitCompareArrows },
  { to: '/cross-platform', label: 'Cross-Platform', icon: Network },
  { to: '/generator', label: 'Idea Generator', icon: Lightbulb },
  { to: '/analyzer', label: 'Structure Analyzer', icon: Clapperboard },
  { to: '/ideas', label: 'Saved Ideas', icon: Bookmark },
  { to: '/sources', label: 'Sources', icon: Database },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('trendradar-theme');
    return stored ? stored === 'dark' : true; // dark by default
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('trendradar-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export function Layout({ children }: { children: ReactNode }) {
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
              isActive ? 'bg-accent/15 text-accent-soft dark:text-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1'
            )
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
        <Radar size={18} />
      </span>
      <div>
        <p className="text-sm font-semibold leading-tight">TrendRadar</p>
        <p className="text-[10px] uppercase tracking-widest text-ink-3">Local · Private</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-surface-3/60 bg-surface-1 lg:flex">
        {brand}
        {nav}
        <div className="px-5 py-4 text-[10px] leading-relaxed text-ink-3">
          Runs entirely on 127.0.0.1.
          <br />
          No cloud. No tracking. No accounts.
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-surface-1 shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-ink-3 hover:bg-surface-2" aria-label="Close menu">
                <X size={16} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-surface-3/60 bg-surface-0/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1" id="page-header-slot" />
          <button
            onClick={toggle}
            className="rounded-xl border border-surface-3 bg-surface-1 p-2 text-ink-2 hover:text-ink-1"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
