// Locale-aware navigation wrappers. Components use this Link (not next/link)
// for internal routes so hrefs stay written as '/discover' etc. and the active
// locale prefix is added automatically; usePathname returns the path WITHOUT
// the locale prefix, so route checks like `pathname === '/'` keep working.

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
