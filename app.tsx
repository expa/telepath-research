import { useEffect } from "react";
import { PageOutlet } from "modulato";
import { Logo } from "@/components/article/logo";
import "./styles/globals.css";

// The shell persists across navigation; pages swap inside <PageOutlet/>.
export default function App() {
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
      <header className="site-header">
        <a href="/" className="brand" aria-label="Telepath Research">
          <Logo />
          Telepath Research
        </a>
        <nav className="nav" aria-label="Main">
          <a href="https://telepath.com" data-native>Company</a>
        </nav>
      </header>
      <PageOutlet />
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Telepath</span>
        <span>Intelligence that evolves.</span>
      </footer>
    </>
  );
}
