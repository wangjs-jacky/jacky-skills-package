import { NavLink } from 'react-router-dom'
import { Package, Code, Settings } from 'lucide-react'

const navItems = [
  { to: '/skills', icon: Package, label: 'Skills' },
  { to: '/develop', icon: Code, label: 'Develop' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 border-r border-[var(--color-border)] p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">j-skills</h1>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
