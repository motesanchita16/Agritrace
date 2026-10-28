import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Badge, Button, cn } from '../components/ui';
import { useAuth } from '../lib/auth';
import { Brand } from './PublicLayout';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/app', label: 'Dashboard', end: true },
    { to: '/app/batches', label: 'Batches', end: false },
    ...(user?.role === 'ADMIN'
      ? [{ to: '/app/admin/users', label: 'User Admin', end: false }]
      : []),
  ];

  const rolePlanned: Record<string, string[]> = {
    FARMER: ['Farms & Plots', 'Harvest Registration', 'Dispatch Transfers'],
    DISTRIBUTOR: ['Inbound Shipments', 'Logistics Transfers', 'Receipt Confirmations'],
    WHOLESALER: ['Warehouse Inventory', 'Bulk Transfers', 'Price Reporting'],
    PROCESSOR: ['Processing Runs', 'Mass Balance Conversions', 'Yield Records'],
    RETAILER: ['Store Stock', 'QR Verify Station', 'Price Records'],
    AUDITOR: ['Regulatory Inquiries', 'Recall Investigations', 'Certification Reviews', 'Audit Log'],
    ADMIN: ['System Settings', 'Node & Blockchain', 'Audit Log'],
    CONSUMER: ['Product Verification', 'Safety Alerts'],
  };

  const plannedItems = user?.role ? rolePlanned[user.role] ?? ['Transfers', 'Evidence', 'Recalls'] : ['Transfers', 'Evidence', 'Recalls'];

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1 p-4">
      <div className="mb-3 px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Navigation
        </span>
      </div>
      {navLinks.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-2 text-sm font-medium',
              isActive ? 'bg-leaf-100 text-leaf-900' : 'hover:bg-soil-100 text-stone-700',
            )
          }
        >
          {i.label}
        </NavLink>
      ))}

      <div className="my-3 border-t border-soil-100 pt-3 px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Role Features
        </span>
      </div>
      {plannedItems.map((p) => (
        <span
          key={p}
          aria-disabled="true"
          className="flex items-center justify-between px-3 py-2 text-sm text-stone-400"
        >
          {p} <Badge>Planned</Badge>
        </span>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-soil-100 bg-white lg:block">
        <div className="p-4">
          <Brand />
        </div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="p-4">
              <Brand />
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-soil-100 bg-white px-4 py-3">
          <Button
            variant="ghost"
            className="lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            ☰ Menu
          </Button>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-medium text-stone-700">Supply-chain workspace</span>
            {user && <Badge tone="green">{user.role}</Badge>}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <div className="font-medium text-stone-900">{user.name}</div>
                  <div className="text-stone-500">{user.email}</div>
                </div>
                <Button variant="secondary" className="px-3 py-1 text-xs" onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
            ) : (
              <span className="text-sm text-stone-500">Not signed in</span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
