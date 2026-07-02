import { Route, Routes } from "react-router-dom";

import { Sidebar } from "./components/layout/Sidebar";
import ClipEditor from "./pages/ClipEditor";
import ClipResults from "./pages/ClipResults";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import Processing from "./pages/Processing";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewProject />} />
          <Route path="/projects/:projectId/processing" element={<Processing />} />
          <Route path="/projects/:projectId/clips" element={<ClipResults />} />
          <Route path="/projects/:projectId/clips/:clipId" element={<ClipEditor />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
