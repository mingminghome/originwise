import { useEffect, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
import { BottomNav } from './components/BottomNav';
import { CheckScreen } from './components/CheckScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { HowItWorksScreen } from './components/HowItWorksScreen';
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

  // Check keeps Google-style full chrome (no bottom nav). Other tabs show primary nav.
  const hideBottomNav = tab === 'check';
  const isCheckHome = tab === 'check';

  return (
    <div className="app-page">
      <div
        className={[
          'app-shell',
          hideBottomNav ? 'app-shell--no-bottom' : '',
          isCheckHome ? 'app-shell--check' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <main
          className={
            isCheckHome ? 'app-main app-main--check' : 'app-main'
          }
        >
          {/* Banner only on non-check screens so the home search stays centered */}
          {!isCheckHome ? <InstallAppBanner t={t} /> : null}
          {tab === 'check' && <CheckScreen state={state} />}
          {tab === 'history' && <HistoryScreen state={state} />}
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
