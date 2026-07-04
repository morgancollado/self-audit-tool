// Legacy pre-i18n route: forwards /settings to /{locale}/settings (see LocaleForward).

import { LocaleForward } from '../LocaleForward';

export default function LegacyForward() {
  return <LocaleForward path="/settings" />;
}
