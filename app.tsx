import { useEffect } from "react";
import { PageOutlet, useNavigation, useRoute } from "modulato";
import { Logo } from "@/components/article/logo";
import "./styles/globals.css";

// The shell persists across navigation; pages swap inside <PageOutlet/>.
export default function App() {
  // The homepage is the company landing: full-bleed, no research chrome.
  const route = useRoute(), nav = useNavigation();
  const id = (nav.to ?? route).id;
  const landing = id === "home", research = id.startsWith("research");
  // Cmd+↑ / Cmd+↓ jump to the top / bottom of any page (smooth scroll otherwise swallows the native shortcut).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      e.preventDefault();
      window.scrollTo(0, e.key === "ArrowUp" ? 0 : document.documentElement.scrollHeight);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      {landing ? null : <header className="site-header">
        <a href="/research" className="brand" aria-label="Telepath">
          <Logo />
          Telepath
        </a>
        <nav className="nav" aria-label="Main">
          <a href="/research" aria-current={research ? "page" : undefined}>Research</a>
          <a href="/">Company</a>
        </nav>
      </header>}
      <PageOutlet />
      {landing ? null : <footer className="site-footer">
        <span>© {new Date().getFullYear()} Telepath</span>
        <span>Intelligence that evolves.</span>
      </footer>}
    </>
  );
}
