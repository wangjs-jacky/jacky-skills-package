import { ReactNode } from 'react'
import Sidebar from '../Sidebar'
import Toast from '../Toast'
import UpdateBanner from '../UpdateBanner'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <UpdateBanner />
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Gradient orb decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[var(--color-blue)]/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Content */}
        <div className="relative z-10 p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      <Toast />
    </div>
  )
}
