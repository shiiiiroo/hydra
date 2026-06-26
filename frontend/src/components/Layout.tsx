import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AIChatPanel from './AIChatPanel';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-8">
        <Outlet />
      </main>
      <AIChatPanel />
    </div>
  );
}
