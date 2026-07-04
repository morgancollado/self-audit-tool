// Legacy pre-i18n route: forwards /how-it-works to /{locale}/how-it-works (see LocaleForward).

import { LocaleForward } from '../LocaleForward';

export default function LegacyForward() {
  return <LocaleForward path="/how-it-works" />;
}
