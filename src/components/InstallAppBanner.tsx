import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { STORAGE_PREFIX } from '../core/storage/keys';
import type { TFunction } from '../core/i18n';

const DISMISS_KEY = `${STORAGE_PREFIX}install_banner_dismissed`;
const AUTO_HIDE_MS = 14_000;
const IOS_SHOW_DELAY_MS = 2500;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Soft “Install as app” prompt (Chrome/Edge + iOS Safari tip).
 */
export function InstallAppBanner({ t }: { t: TFunction }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || readDismissed()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);

    const tIos = window.setTimeout(() => {
      if (isStandalone() || readDismissed()) return;
      if (isIos()) {
        setIosHelp(true);
        setVisible(true);
      }
    }, IOS_SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.clearTimeout(tIos);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = () => {
      if (isStandalone()) setVisible(false);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const tAuto = window.setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => window.clearTimeout(tAuto);
  }, [visible]);

  const dismiss = () => {
    writeDismissed();
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user dismissed */
    }
    setDeferred(null);
    setVisible(false);
    writeDismissed();
  };

  if (!visible) return null;

  return (
    <div
      className="install-app-banner"
      role="region"
      aria-label={t('install.aria')}
    >
      <div className="install-app-banner-icon" aria-hidden>
        <img src="/favicon.svg" alt="" width={40} height={40} />
      </div>
      <div className="install-app-banner-body">
        <div className="install-app-banner-title">{t('install.title')}</div>
        <p className="install-app-banner-text">
          {iosHelp && !deferred ? t('install.bodyIos') : t('install.body')}
        </p>
        {iosHelp && !deferred ? (
          <p className="install-app-banner-ios">
            {t('install.iosStep1')}{' '}
            <Share size={14} className="install-app-inline-icon" aria-hidden />{' '}
            {t('install.iosStep2')}
          </p>
        ) : null}
      </div>
      <div className="install-app-banner-actions">
        {deferred ? (
          <button
            type="button"
            className="install-app-btn"
            onClick={() => void install()}
          >
            <Download size={15} strokeWidth={2.4} />
            {t('install.action')}
          </button>
        ) : null}
        <button
          type="button"
          className="install-app-dismiss"
          onClick={dismiss}
          aria-label={t('install.dismiss')}
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
