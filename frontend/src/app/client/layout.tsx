'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clearToken } from '@/services/api'

const navItems = [
  { href: '/client/instances', label: 'Minhas Instâncias' },
  { href: '/client/logs', label: 'Logs' },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0A0F' }}>
      <aside className="w-52 flex flex-col border-r" style={{ borderColor: 'rgba(119,94,252,0.15)', background: 'rgba(22,22,42,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(119,94,252,0.15)' }}>
          <h1 className="font-bold text-sm" style={{ color: '#775EFC' }}>Ávimus Connect</h1>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: active ? 'rgba(119,94,252,0.15)' : 'transparent', color: active ? '#775EFC' : 'rgba(240,240,255,0.6)', borderLeft: active ? '2px solid #775EFC' : '2px solid transparent' }}>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3">
          <button onClick={() => { clearToken(); router.push('/login') }} className="w-full text-left px-3 py-2 rounded-lg text-sm" style={{ color: 'rgba(240,240,255,0.4)' }}>Sair</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
