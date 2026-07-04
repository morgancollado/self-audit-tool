// Legacy pre-i18n route: forwards /records to /{locale}/records (see LocaleForward).

import { LocaleForward } from '../LocaleForward';

export default function LegacyForward() {
  return <LocaleForward path="/records" />;
}
