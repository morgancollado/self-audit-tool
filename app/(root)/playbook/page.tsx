// Legacy pre-i18n route: forwards /playbook to /{locale}/playbook (see LocaleForward).

import { LocaleForward } from '../LocaleForward';

export default function LegacyForward() {
  return <LocaleForward path="/playbook" />;
}
