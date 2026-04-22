import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SkillsPage from './pages/Skills'
import DevelopPage from './pages/Develop'
import SettingsPage from './pages/Settings'
import MonitorPage from './pages/Monitor'
import ClaudeMDPage from './pages/ClaudeMD'
import ProfilesPage from './pages/Profiles'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SkillsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/profiles" element={<ProfilesPage />} />
        <Route path="/develop" element={<DevelopPage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/claudemd" element={<ClaudeMDPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
