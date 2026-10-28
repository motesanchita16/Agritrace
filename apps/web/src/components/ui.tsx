import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-leaf-600 text-white hover:bg-leaf-700 disabled:bg-stone-300',
  secondary: 'border border-leaf-600 text-leaf-700 hover:bg-leaf-50 disabled:opacity-50',
  ghost: 'text-stone-700 hover:bg-soil-100 disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(function Field({ label, error, id, name, ...rest }, ref) {
  const fieldId = id ?? name;
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-err` : undefined}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm',
          error ? 'border-red-500' : 'border-stone-300',
        )}
        {...rest}
      />
      {error && (
        <p id={`${fieldId}-err`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
});

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-xl border border-soil-100 bg-white p-5 shadow-sm', className)}>{children}</div>;
}

const tones = {
  green: 'bg-leaf-100 text-leaf-900',
  amber: 'bg-harvest-100 text-harvest-700',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-stone-100 text-stone-700',
};
export function Badge({ tone = 'gray', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-leaf-500 border-t-transparent',
        small ? 'h-4 w-4' : 'h-8 w-8',
      )}
    />
  );
}

export function StateMessage({
  kind,
  title,
  children,
}: {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      role={kind === 'error' ? 'alert' : undefined}
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center"
    >
      {kind === 'loading' && <Spinner />}
      <p className={cn('font-medium', kind === 'error' && 'text-red-700')}>{title}</p>
      {children && <div className="max-w-md text-sm text-stone-600">{children}</div>}
    </div>
  );
}
