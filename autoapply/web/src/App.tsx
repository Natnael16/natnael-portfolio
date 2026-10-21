import { useEffect, useState } from "react";
import { api } from "./api";
import { Companies } from "./pages/Companies";
import { History, Submitted, Failed } from "./pages/History";
import { Inbox } from "./pages/Inbox";
import { Login } from "./pages/Login";
import { Logs } from "./pages/Logs";
import { Profile } from "./pages/Profile";
import { Review } from "./pages/Review";
import { Runs } from "./pages/Runs";

function pathOf() {
  const h = location.hash.replace(/^#/, "") || "/inbox";
  return h.startsWith("/") ? h : `/${h}`;
}

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [route, setRoute] = useState(pathOf());

  useEffect(() => {
    api
      .me()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
    const onHash = () => setRoute(pathOf());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (authed === null) return <div className="main muted">Loading…</div>;
  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  const review = route.match(/^\/inbox\/(\d+)/);
  const nav = [
    ["/inbox", "Inbox"],
    ["/submitted", "Submitted"],
    ["/failed", "Failed"],
    ["/history", "History"],
    ["/logs", "Logs"],
    ["/profile", "Profile"],
    ["/companies", "Companies"],
    ["/runs", "Runs"],
  ];

  return (
    <div className="app">
      <nav className="nav">
        <p className="brand">Autoapply</p>
        {nav.map(([href, label]) => (
          <a
            key={href}
            href={`#${href}`}
            className={route.startsWith(href) ? "active" : ""}
          >
            {label}
          </a>
        ))}
        <div className="spacer" />
        <button
          className="link"
          onClick={async () => {
            await api.logout();
            setAuthed(false);
          }}
        >
          Sign out
        </button>
      </nav>
      <main className="main">
        {review ? (
          <Review id={Number(review[1])} />
        ) : route.startsWith("/submitted") ? (
          <Submitted />
        ) : route.startsWith("/failed") ? (
          <Failed />
        ) : route.startsWith("/history") ? (
          <History />
        ) : route.startsWith("/logs") ? (
          <Logs />
        ) : route.startsWith("/profile") ? (
          <Profile />
        ) : route.startsWith("/companies") ? (
          <Companies />
        ) : route.startsWith("/runs") ? (
          <Runs />
        ) : (
          <Inbox />
        )}
      </main>
    </div>
  );
}
