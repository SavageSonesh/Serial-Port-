import { useMemo, useState } from 'react';
import { createStorage } from './storage';
import { StoreProvider, useStore } from './state/store';
import { ToastProvider } from './ui/Toast';
import { Login } from './ui/Login';
import { MenuDoDia } from './ui/MenuDoDia';
import { PratosGuardados } from './ui/PratosGuardados';
import { Historico } from './ui/Historico';
import { Definicoes } from './ui/Definicoes';
import { PrintSheet } from './ui/Preview';

type Tab = 'menu' | 'pratos' | 'historico' | 'definicoes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'menu', label: 'Menu do dia' },
  { id: 'pratos', label: 'Pratos guardados' },
  { id: 'historico', label: 'Histórico' },
  { id: 'definicoes', label: 'Definições' },
];

function Shell() {
  const { storage, user, ready, loadError, reload, currentMenu } = useStore();
  const [tab, setTab] = useState<Tab>('menu');

  if (storage.requiresAuth && !user) return <Login />;
  if (!ready) return <div className="loading">A carregar…</div>;

  return (
    <>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="brand-name">O Satélite</span>
            <span className="brand-sub">Menu do dia</span>
          </div>
          <nav className="tabs" aria-label="Secções">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={`tab ${tab === t.id ? 'tab-on' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className={`storage-badge storage-${storage.kind}`} title={storage.label}>
            {storage.kind === 'local' ? 'Demonstração local' : 'Base de dados ligada'}
          </div>
        </header>
        {loadError && (
          <div className="warn" role="alert">
            Não foi possível carregar os dados: {loadError}{' '}
            <button type="button" className="link" onClick={() => void reload()}>
              Tentar novamente
            </button>
          </div>
        )}
        <main className="content">
          {tab === 'menu' && <MenuDoDia goHistory={() => setTab('historico')} />}
          {tab === 'pratos' && <PratosGuardados />}
          {tab === 'historico' && <Historico goEditor={() => setTab('menu')} />}
          {tab === 'definicoes' && <Definicoes />}
        </main>
      </div>
      <PrintSheet menu={currentMenu} />
    </>
  );
}

export default function App() {
  const storage = useMemo(() => createStorage(), []);
  return (
    <StoreProvider storage={storage}>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}
