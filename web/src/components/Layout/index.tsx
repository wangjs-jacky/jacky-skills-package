import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../Sidebar'
import Toast from '../Toast'
import UpdateBanner from '../UpdateBanner'

interface LayoutProps {
  children: ReactNode
}

// 需要撑满 main 区域的页面（无 padding 包裹）
const FULL_PAGES = ['/profiles']

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isFullPage = FULL_PAGES.includes(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">
      <UpdateBanner />
      <Sidebar />
      <main className={`flex-1 relative ${isFullPage ? 'overflow-hidden' : 'overflow-auto'}`}>
        {/* Gradient orb decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[var(--color-blue)]/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Content */}
        {isFullPage ? (
          <div className="relative z-10 h-full">
            {children}
          </div>
        ) : (
          <div className="relative z-10 p-8 max-w-6xl mx-auto">
            {children}
          </div>
        )}
      </main>
      <Toast />
    </div>
  )
}
