// Site-wide footer, mounted once in the root layout so it appears on every
// screen. Deliberately small and DENIABLE (scope/docs/06-risk-register.md R3,
// /11-brand.md): it must reveal nothing about what the tool is for to a
// bystander glancing at a shared/watched device — so support resources are
// reached via a neutral "Get support" link to the how-it-works page rather than
// naming crisis orgs in text on every screen. Server component, no client JS.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="site-footer">
      <nav aria-label={t('navLabel')}>
        <Link href="/how-it-works">{t('howItWorks')}</Link>
        <a href="https://github.com/morgancollado/self-audit-tool" target="_blank" rel="noreferrer">
          {t('source')}
        </a>
        <Link href="/how-it-works#support">{t('support')}</Link>
      </nav>
      <p className="site-footer-note">{t('note')}</p>
    </footer>
  );
}
