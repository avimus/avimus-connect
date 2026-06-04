'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clearToken } from '@/services/api'
import { ThemeToggle } from '@/components/ThemeToggle'

const KeyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
)

const navItems = [
  { href: '/admin/clients', label: 'Clientes', icon: null },
  { href: '/admin/dashboard', label: 'Dashboard', icon: null },
  { href: '/admin/logs', label: 'Logs Globais', icon: null },
  { href: '/admin/api-keys', label: 'API Keys', icon: <KeyIcon /> },
]

function SidebarContent({ pathname, onNavClick, onLogout }: { pathname: string; onNavClick?: () => void; onLogout: () => void }) {
  return (
    <>
      <div className="p-5 border-b" style={{ borderColor: 'var(--border-sidebar)' }}>
        <h1 className="font-bold text-base" style={{ color: 'var(--accent)' }}>Ávimus Connect</h1>
        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Admin</span>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? 'rgba(119,94,252,0.15)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-sidebar)' }}>
        <button
          onClick={onLogout}
          className="text-left px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: 'var(--text-subtle)' }}
        >
          Sair
        </button>
        <ThemeToggle />
      </div>
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  function handleLogout() {
    clearToken()
    router.push('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Mobile header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-sidebar)', backdropFilter: 'blur(12px)' }}
      >
        <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>Ávimus Connect</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar — static on desktop, drawer on mobile */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-56 flex flex-col border-r transition-transform duration-300 md:translate-x-0 md:min-h-screen ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-sidebar)', backdropFilter: 'blur(12px)' }}
        >
          <SidebarContent
            pathname={pathname}
            onNavClick={() => setDrawerOpen(false)}
            onLogout={handleLogout}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pt-[4.5rem] md:pt-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
