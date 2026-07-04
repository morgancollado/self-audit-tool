// Legacy pre-i18n route: forwards /remediate to /{locale}/remediate (see LocaleForward).

import { LocaleForward } from '../LocaleForward';

export default function LegacyForward() {
  return <LocaleForward path="/remediate" />;
}
