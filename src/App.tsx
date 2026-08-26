import { useEffect, useState } from 'react';
import { AboutScreen } from './components/AboutScreen';
import { AppTopBar } from './components/AppTopBar';
import { CheckScreen } from './components/CheckScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { HowItWorksScreen } from './components/HowItWorksScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { WelcomeDisclaimer } from './components/WelcomeDisclaimer';
import { trackEvent, trackPage } from './core/analytics/track';
import {
  hasDisclaimerAck,
  saveDisclaimerAck,
} from './core/storage/store';
import { useAppState } from './hooks/useAppState';

export default function App() {
  const state = useAppState();
  const { tab, setTab, t, dataSummary, setActiveResult } = state;
  const [showWelcome, setShowWelcome] = useState(() => !hasDisclaimerAck());
  /** Bump to force Check screen back to the empty landing hero. */
  const [checkResetToken, setCheckResetToken] = useState(0);

  useEffect(() => {
    if (!hasDisclaimerAck()) setShowWelcome(true);
  }, [dataSummary.keyCount]);

  useEffect(() => {
    trackPage(tab);
  }, [tab]);

  const acceptWelcome = () => {
    saveDisclaimerAck();
    setShowWelcome(false);
    trackEvent({ event: 'disclaimer_accept' });
  };

  // SourceWise-style shell: floating top bar + full-bleed main (no phone frame).
  const isCheckHome = tab === 'check';

  return (
    <div className="app-page">
      <div className="app-shell">
        <AppTopBar
          t={t}
          tab={tab}
          onChange={setTab}
          onBrandClick={() => {
            setActiveResult(null);
            setCheckResetToken((n) => n + 1);
            setTab('check');
          }}
        />
        <main
          className={
            isCheckHome ? 'app-main app-main--check' : 'app-main'
          }
        >
          {tab === 'check' && (
            <CheckScreen state={state} resetToken={checkResetToken} />
          )}
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
