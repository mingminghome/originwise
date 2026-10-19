import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
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
  const popup = tab === 'check' ? null : tab;

  const closePopup = () => {
    setTab('check');
  };

  useEffect(() => {
    if (!hasDisclaimerAck()) setShowWelcome(true);
  }, [dataSummary.keyCount]);

  useEffect(() => {
    trackPage(tab);
  }, [tab]);

  useEffect(() => {
    if (!popup) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setTab('check');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [popup, setTab]);

  const acceptWelcome = () => {
    saveDisclaimerAck();
    setShowWelcome(false);
    trackEvent({ event: 'disclaimer_accept' });
  };

  return (
    <div className="app-page">
      <div className="app-shell">
        <AppTopBar
          t={t}
          tab={tab}
          onChange={(next) => {
            setTab(next === tab && next !== 'check' ? 'check' : next);
          }}
          onBrandClick={() => {
            setActiveResult(null);
            setCheckResetToken((n) => n + 1);
            closePopup();
          }}
        />
        <main className="app-main app-main--check">
          <CheckScreen state={state} resetToken={checkResetToken} />
        </main>
      </div>
      {popup ? (
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={closePopup}
        >
          <div
            className="sheet nav-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t(`tabs.${popup === 'how' ? 'about' : popup}`)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nav-sheet-bar">
              <button
                type="button"
                className="nav-sheet-close icon-btn"
                onClick={closePopup}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="nav-sheet-body">
              {popup === 'history' && <HistoryScreen state={state} />}
              {popup === 'settings' && <SettingsScreen state={state} />}
              {popup === 'about' && <AboutScreen state={state} />}
              {popup === 'how' && <HowItWorksScreen state={state} />}
            </div>
          </div>
        </div>
      ) : null}
      {showWelcome && <WelcomeDisclaimer t={t} onAccept={acceptWelcome} />}
    </div>
  );
}
