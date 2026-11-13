// The deck is a self-contained HTML file (public/deck/index.html); show it full-screen.
export default function Deck() {
  return (
    <iframe
      src="/deck/index.html"
      title="Telepath deck"
      autoFocus
      onLoad={e => e.currentTarget.focus()}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, zIndex: 100, background: "#141210" }}
    />
  );
}
