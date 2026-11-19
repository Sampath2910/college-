"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Client wrapper around next-themes so the (server) root layout can enable
 * class-based theming. Defaults keep the existing light "paper" look unless a
 * visitor explicitly switches; the choice is remembered per browser.
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
