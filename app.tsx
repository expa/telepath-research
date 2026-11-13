import { PageOutlet, useNavigation, useRoute } from "modulato";
import { Logo } from "@/components/article/logo";
import "./styles/globals.css";
import "./styles/v2.css";

// The shell persists across navigation; pages swap inside <PageOutlet/>.
export default function App() {
  // The homepage is the company landing: full-bleed, no research chrome.
  const route = useRoute(), nav = useNavigation();
  const id = (nav.to ?? route).id;
  // Chrome shows as soon as we head away from the landing, and stays (lifted out of flow) while heading
  // back to it, so the research → home transition can fade it out.
  const landing = (route.id === "home-1" && id === "home-1") || id === "deck", leaving = nav.to?.id === "home-1";
  const v2 = [route.id, id].some(value => value === "home" || value.startsWith("research/"));
  const research = id.startsWith("research");
  return (
    <>
      {landing || v2 ? null : <header className={leaving ? "site-header is-leaving" : "site-header"}>
        <a href="/research-1" className="brand" aria-label="Telepath">
          <Logo />
          Telepath
        </a>
        <nav className="nav" aria-label="Main">
          <a href="/research-1" aria-current={research ? "page" : undefined}>Research</a>
          <a href="/">Company</a>
        </nav>
      </header>}
      <PageOutlet />
      {landing || (v2 && (id === "home" || route.id === "home")) ? null : <footer className="site-footer">
        <span>© {new Date().getFullYear()} Telepath</span>
        <span>Intelligence that evolves.</span>
      </footer>}
    </>
  );
}
