import { ReactNode } from 'react'
import Sidebar from '../Sidebar'
import Toast from '../Toast'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
      <Toast />
    </div>
  )
}
