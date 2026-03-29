import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, Code, Settings, Terminal } from 'lucide-react'
import { getVersion } from '@tauri-apps/api/app'

const navItems = [
  { to: '/skills', icon: Package, label: 'Skills', description: 'Manage skills' },
  { to: '/develop', icon: Code, label: 'Develop', description: 'Create new' },
  { to: '/settings', icon: Settings, label: 'Settings', description: 'Configure' },
]

export default function Sidebar() {
  const [version, setVersion] = useState('...')

  useEffect(() => {
    getVersion().then(v => setVersion(v)).catch(() => setVersion('dev'))
  }, [])

  return (
    <aside className="relative w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex flex-col z-10">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-dim)] flex items-center justify-center border border-[var(--color-primary)]/30">
              <Terminal size={20} className="text-[var(--color-primary)]" />
            </div>
            <div className="absolute -inset-1 bg-[var(--color-primary)]/20 rounded-lg blur-lg -z-10"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-tight" data-testid="sidebar-app-title">
              <span className="text-[var(--color-primary)]">j</span>-skills
            </h1>
            <p className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-widest" data-testid="sidebar-version">
              v{version}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 animate-fade-in stagger-${index + 1} ${
                isActive
                  ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.03]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[var(--color-primary)] rounded-r-full">
                    <div className="absolute inset-0 bg-[var(--color-primary)] blur-sm rounded-r-full"></div>
                  </div>
                )}

                <item.icon
                  size={18}
                  className={`transition-all duration-300 ${
                    isActive ? 'text-[var(--color-primary)]' : 'group-hover:scale-110'
                  }`}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {item.description}
                  </span>
                </div>

                {/* Hover glow effect */}
                {isActive && (
                  <div className="absolute inset-0 bg-[var(--color-primary)]/5 rounded-lg"></div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <div className="px-4 py-3 rounded-lg bg-white/[0.02] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
            <span className="font-mono">System ready</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
