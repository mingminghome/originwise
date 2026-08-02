import { useEffect, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
import { BottomNav } from './components/BottomNav';
import { CheckScreen } from './components/CheckScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { HowItWorksScreen } from './components/HowItWorksScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { WelcomeDisclaimer } from './components/WelcomeDisclaimer';
import {
  hasDisclaimerAck,
  saveDisclaimerAck,
} from './core/storage/store';
import { useAppState } from './hooks/useAppState';

export default function App() {
  const state = useAppState();
  const { tab, setTab, t, dataSummary } = state;
  const [showWelcome, setShowWelcome] = useState(() => !hasDisclaimerAck());

  useEffect(() => {
    if (!hasDisclaimerAck()) setShowWelcome(true);
  }, [dataSummary.keyCount]);

  const acceptWelcome = () => {
    saveDisclaimerAck();
    setShowWelcome(false);
  };

  return (
    <div className="app-page">
      <div className="app-shell">
        <main className="app-main">
          {tab === 'check' && <CheckScreen state={state} />}
          {tab === 'history' && <HistoryScreen state={state} />}
          {tab === 'settings' && <SettingsScreen state={state} />}
          {tab === 'about' && <AboutScreen state={state} />}
          {tab === 'how' && <HowItWorksScreen state={state} />}
        </main>
        <BottomNav tab={tab} onChange={setTab} t={t} />
      </div>
      {showWelcome && <WelcomeDisclaimer t={t} onAccept={acceptWelcome} />}
    </div>
  );
}
