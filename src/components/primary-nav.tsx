"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Today" },
  { href: "/plans", label: "Plans" },
  { href: "/create", label: "Create" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
] as const;

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="primary-nav" aria-label="Primary">
      <ul>
        {navigation.map((item) => {
          const current = isCurrentPath(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="nav-link"
                aria-current={current ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
