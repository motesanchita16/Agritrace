import { Link, Outlet } from 'react-router-dom';

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-leaf-700">
      <span aria-hidden>🌱</span> AgriTrace
    </Link>
  );
}

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-soil-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Brand />
          <nav className="flex gap-4 text-sm font-medium">
            <Link to="/login" className="hover:text-leaf-700">Sign in</Link>
            <Link to="/register" className="rounded-lg bg-leaf-600 px-3 py-1.5 text-white hover:bg-leaf-700">Register</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-soil-100 py-4 text-center text-xs text-stone-500">
        AgriTrace records support traceability; they do not by themselves prove physical produce matches a record.
      </footer>
    </div>
  );
}
