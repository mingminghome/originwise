import { useEffect, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
import { BottomNav } from './components/BottomNav';
import { CheckScreen } from './components/CheckScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { HowItWorksScreen } from './components/HowItWorksScreen';
import { InfoScreen } from './components/InfoScreen';
import { InstallAppBanner } from './components/InstallAppBanner';
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

  const hideBottomNav =
    tab === 'check' || tab === 'how' || tab === 'about';

  return (
    <div className="app-page">
      <div className={`app-shell${hideBottomNav ? ' app-shell--no-bottom' : ''}`}>
        <main className="app-main">
          <InstallAppBanner t={t} />
          {tab === 'check' && <CheckScreen state={state} />}
          {tab === 'history' && <HistoryScreen state={state} />}
          {tab === 'info' && <InfoScreen state={state} />}
          {tab === 'settings' && <SettingsScreen state={state} />}
          {tab === 'about' && <AboutScreen state={state} />}
          {tab === 'how' && <HowItWorksScreen state={state} />}
        </main>
        {!hideBottomNav ? (
          <BottomNav tab={tab} onChange={setTab} t={t} />
        ) : null}
      </div>
      {showWelcome && <WelcomeDisclaimer t={t} onAccept={acceptWelcome} />}
    </div>
  );
}
