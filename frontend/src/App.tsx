import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui';
import Dashboard from './pages/Dashboard';
import Explorer from './pages/Explorer';
import AddContent from './pages/AddContent';
import Compare from './pages/Compare';
import CrossPlatform from './pages/CrossPlatform';
import IdeaGenerator from './pages/IdeaGenerator';
import StructureAnalyzer from './pages/StructureAnalyzer';
import SavedIdeas from './pages/SavedIdeas';
import Sources from './pages/Sources';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/add" element={<AddContent />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/cross-platform" element={<CrossPlatform />} />
            <Route path="/generator" element={<IdeaGenerator />} />
            <Route path="/analyzer" element={<StructureAnalyzer />} />
            <Route path="/ideas" element={<SavedIdeas />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  );
}
