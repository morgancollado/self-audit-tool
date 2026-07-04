// The bare '/' — a language chooser that immediately forwards to /en or /es
// (see LocaleForward for the preference order and the no-JS fallback).

import { LocaleForward } from './LocaleForward';

export default function RootRedirect() {
  return <LocaleForward />;
}
