// Legacy pre-i18n route: forwards /discover to /{locale}/discover (see LocaleForward).

import { LocaleForward } from '../LocaleForward';

export default function LegacyForward() {
  return <LocaleForward path="/discover" />;
}
