import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SkillsPage from './pages/Skills'
import DevelopPage from './pages/Develop'
import SettingsPage from './pages/Settings'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SkillsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/develop" element={<DevelopPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
