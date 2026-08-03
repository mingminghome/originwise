import { useEffect, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
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
  const { tab, t, dataSummary } = state;
  const [showWelcome, setShowWelcome] = useState(() => !hasDisclaimerAck());

  useEffect(() => {
    if (!hasDisclaimerAck()) setShowWelcome(true);
  }, [dataSummary.keyCount]);

  const acceptWelcome = () => {
    saveDisclaimerAck();
    setShowWelcome(false);
  };

  // No bottom/side main menu — History / About / Settings live in top-right icons.
  // Shell width is shared; Check only needs a full-height flex main.
  const isCheckHome = tab === 'check';

  return (
    <div className="app-page">
      <div className="app-shell">
        <main
          className={
            isCheckHome ? 'app-main app-main--check' : 'app-main'
          }
        >
          {tab === 'check' && <CheckScreen state={state} />}
          {tab === 'history' && <HistoryScreen state={state} />}
          {tab === 'settings' && <SettingsScreen state={state} />}
          {tab === 'about' && <AboutScreen state={state} />}
          {tab === 'how' && <HowItWorksScreen state={state} />}
        </main>
      </div>
      {showWelcome && <WelcomeDisclaimer t={t} onAccept={acceptWelcome} />}
    </div>
  );
}
