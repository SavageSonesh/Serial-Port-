// Lightweight component system (shadcn-style, dependency-free).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { X, CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react';

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------- Button ---------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; loading?: boolean }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-white hover:bg-accent-soft shadow-sm',
    secondary: 'bg-surface-2 text-ink-1 hover:bg-surface-3 border border-surface-3',
    ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
    danger: 'bg-rose-600/90 text-white hover:bg-rose-600',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-surface-3/70 bg-surface-1 shadow-sm', className)}>{children}</div>
  );
}

/* ---------- Inputs ---------- */
const fieldBase =
  'w-full rounded-xl border border-surface-3 bg-surface-1 px-3 py-2 text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/60';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'min-h-[90px]', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, 'pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-3">{hint}</span>}
    </label>
  );
}

/* ---------- Badge ---------- */
export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', className)}>
      {children}
    </span>
  );
}

/* ---------- Skeleton / Empty state ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-3 px-6 py-12 text-center">
      {icon && <div className="text-ink-3">{icon}</div>}
      <p className="text-sm font-medium text-ink-1">{title}</p>
      {hint && <p className="max-w-md text-xs text-ink-3">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ---------- Tooltip (CSS hover) ---------- */
export function HelpTip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-64 -translate-x-1/2 rounded-xl border border-surface-3 bg-surface-1 p-3 text-left text-xs leading-relaxed text-ink-2 shadow-lg group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

/* ---------- Modal & Confirm ---------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-surface-3 bg-surface-1 p-5 shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-3 hover:bg-surface-2 hover:text-ink-1" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-ink-2">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}
const ToastContext = createContext<(kind: Toast['kind'], message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);
  const icons = { success: <CheckCircle2 size={15} className="text-emerald-500" />, error: <AlertTriangle size={15} className="text-rose-500" />, info: <Info size={15} className="text-sky-500" /> };
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-2 rounded-xl border border-surface-3 bg-surface-1 p-3 text-xs text-ink-1 shadow-lg">
            {icons[t.kind]}
            <span className="leading-relaxed">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            value === t.id ? 'bg-surface-1 text-ink-1 shadow-sm' : 'text-ink-3 hover:text-ink-1'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
