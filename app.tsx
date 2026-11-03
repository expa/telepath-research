import { PageOutlet } from "modulato";
import { Logo } from "@/components/article/logo";
import "./styles/globals.css";

// The shell persists across navigation; pages swap inside <PageOutlet/>.
export default function App() {
  return (
    <>
      <header className="site-header">
        <a href="/research" className="brand" aria-label="Telepath Research">
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
