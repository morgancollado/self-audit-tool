// Legacy pre-i18n route: forwards /harden to /{locale}/harden (see LocaleForward).

import { LocaleForward } from '../LocaleForward';

export default function LegacyForward() {
  return <LocaleForward path="/harden" />;
}
