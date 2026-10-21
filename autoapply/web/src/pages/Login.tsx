import { useState, type FormEvent } from "react";
import { api } from "../api";

export function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.login(password);
      onOk();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="login">
      <form className="panel" onSubmit={submit}>
        <h1>Autoapply</h1>
        <p className="muted">Review-then-approve. Nothing submits without you.</p>
        <label className="field">
          Dashboard password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
