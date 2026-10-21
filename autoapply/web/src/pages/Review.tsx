import { useEffect, useState } from "react";
import { api, type Answer, type Application, type FormField } from "../api";

function upsertAnswer(
  prev: Answer[],
  field: FormField,
  value: string,
  existing?: Answer,
): Answer[] {
  if (existing) {
    return prev.map((a) => (a.path === field.path ? { ...a, value } : a));
  }
  return [
    ...prev,
    {
      path: field.path,
      label: field.label,
      type: "unknown",
      value,
      confidence: "low",
      source: "empty",
    },
  ];
}

function FieldControl({
  field,
  answer,
  onChange,
}: {
  field: FormField;
  answer?: Answer;
  onChange: (value: string) => void;
}) {
  const value = answer?.value ?? "";
  const kind = field.inputKind;

  if (kind === "file") {
    return <p className="muted small">{value || "No file mapped (resume uses {{resume}} on submit)"}</p>;
  }

  if (kind === "radio" && field.options.length > 0) {
    return (
      <div className="radio-group">
        {field.options.map((opt) => (
          <label key={opt} className="radio-option">
            <input
              type="radio"
              name={field.path}
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if ((kind === "select" || kind === "multiselect") && field.options.length > 0) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (kind === "checkbox") {
    const checked = /^(yes|true|1|on)$/i.test(value);
    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
      />
    );
  }

  return <textarea value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function Review({ id }: { id: number }) {
  const [item, setItem] = useState<Application | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [action, setAction] = useState<null | "save" | "refill" | "approve" | "skip" | "mark">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.application(id).then((r) => {
      setItem(r);
      setAnswers(r.answers ?? []);
    });
  }, [id]);

  if (!item) return <p className="muted">Loading…</p>;

  const busy = action !== null;
  const inboxLike = item.status === "pending_approval" || item.status === "auto_submit";
  const backHref =
    item.status === "submitted"
      ? "#/submitted"
      : item.status === "failed"
        ? "#/failed"
        : inboxLike
          ? "#/inbox"
          : "#/history";
  const backLabel =
    item.status === "submitted"
      ? "Submitted"
      : item.status === "failed"
        ? "Failed"
        : inboxLike
          ? "Inbox"
          : "History";

  const requiredEmpty = (item.flags ?? []).filter(
    (f) => f.required && !answers.find((a) => a.path === f.path)?.value,
  );

  const fields = item.form?.fields ?? [];
  const byPath = new Map(answers.map((a) => [a.path, a]));
  const rows =
    fields.length > 0
      ? fields.map((f) => ({ field: f, answer: byPath.get(f.path) }))
      : answers.map((a) => ({
          field: {
            path: a.path,
            label: a.label || a.path,
            required: false,
            inputKind: "text",
            options: [] as string[],
          },
          answer: a,
        }));

  return (
    <div>
      <p className="small">
        <a href={backHref}>← {backLabel}</a>
      </p>
      <div className="row">
        <h1>
          {item.job.companyName} — {item.job.title}
        </h1>
        <span className={`badge ${item.status === "auto_submit" ? "ok" : item.status === "pending_approval" ? "warn" : ""}`}>
          {item.status === "auto_submit" ? "auto submit" : item.status === "pending_approval" ? "pending approval" : item.status}
          {" · "}
          {item.matchScore} · {item.match?.confidence}
        </span>
      </div>
      <p className="small">
        <a href={item.job.jobUrl} target="_blank" rel="noreferrer">
          Job posting
        </a>
        {" · "}
        <a href={item.job.applyUrl} target="_blank" rel="noreferrer">
          Apply page
        </a>
      </p>
      <p>{item.match?.summary}</p>
      {item.match?.evidence && item.match.evidence.length > 0 && (
        <>
          <h3>Evidence</h3>
          <ul className="evidence">
            {item.match.evidence.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}
      {item.match?.gaps && item.match.gaps.length > 0 && (
        <>
          <h3>Gaps</h3>
          <ul className="evidence">
            {item.match.gaps.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}
      {item.critique?.violations && item.critique.violations.length > 0 && (
        <p className="flags">Critique: {item.critique.violations.join(" · ")}</p>
      )}
      {item.flags
        ?.filter((f) => f.required)
        .map((f) => {
        const prompt =
          item.form?.fields?.find((field) => field.path === f.path)?.label ??
          answers.find((a) => a.path === f.path)?.label ??
          f.path;
        return (
          <p key={f.path + f.reason} className={f.required ? "flags" : "muted small"}>
            {f.required ? "Required" : "Note"} · {prompt}: {f.reason}
          </p>
        );
      })}

      <h3>Drafted answers</h3>
      {rows.map(({ field, answer }) => (
        <div className="field" key={field.path}>
          <span>{field.label || answer?.label || field.path}</span>
          <span className="muted small">
            {" "}
            · {answer?.type ?? "unanswered"}
            {field.required ? " · required" : ""}
            {answer ? ` · ${answer.confidence} · ${answer.source}` : ""}
          </span>
          <FieldControl
            field={field}
            answer={answer}
            onChange={(value) => setAnswers((prev) => upsertAnswer(prev, field, value, answer))}
          />
        </div>
      ))}

      {error && <p className="error">{error}</p>}
      <div className="row" style={{ justifyContent: "flex-start", gap: 8 }}>
        <button
          className="btn secondary"
          disabled={busy}
          onClick={async () => {
            setAction("save");
            setError(null);
            try {
              await api.saveAnswers(id, answers);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Save failed");
            } finally {
              setAction(null);
            }
          }}
        >
          Save
        </button>
        <button
          className="btn secondary"
          disabled={busy}
          onClick={async () => {
            setAction("refill");
            setError(null);
            try {
              const result = await api.refill(id);
              if (result.status && result.status !== "pending_approval" && result.status !== "auto_submit") {
                setError(`Refill finished as ${result.status}. Check History if it left the inbox.`);
                return;
              }
              const next = await api.application(id);
              setItem(next);
              setAnswers(next.answers ?? []);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Refill failed");
            } finally {
              setAction(null);
            }
          }}
        >
          {action === "refill" ? "Refilling…" : "Refill draft"}
        </button>
        {item.status !== "submitted" && (
        <button
          className="btn danger"
          disabled={busy}
          onClick={async () => {
            setAction("skip");
            await api.skip(id);
            location.hash = "#/inbox";
          }}
        >
          Skip
        </button>
        )}
        {item.status !== "submitted" && (
          <button
            className="btn secondary"
            disabled={busy}
            onClick={async () => {
              setAction("mark");
              setError(null);
              try {
                await api.saveAnswers(id, answers);
                await api.markSubmitted(id);
                location.hash = "#/submitted";
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not mark submitted");
                setAction(null);
              }
            }}
          >
            {action === "mark" ? "Saving…" : "Mark submitted"}
          </button>
        )}
        {item.status !== "submitted" && (
        <button
          className="btn"
          disabled={busy || requiredEmpty.length > 0}
          onClick={async () => {
            setAction("approve");
            setError(null);
            try {
              await api.saveAnswers(id, answers);
              await api.approve(id);
              location.hash = "#/inbox";
            } catch (e) {
              setError(e instanceof Error ? e.message : "Approve failed");
              setAction(null);
            }
          }}
        >
          Approve & submit
        </button>
        )}
      </div>
      {item.status === "submitted" && (
        <p className="muted small">
          This application is in Submitted. The agent will not send it again.
        </p>
      )}
      {item.status === "auto_submit" && (
        <p className="muted small">Tagged auto-submit. It waits in Inbox until you click Start auto apply, or you can Approve & submit this one now.</p>
      )}
      {requiredEmpty.length > 0 && (
        <p className="muted small">Fill required flagged fields before approve, or Refill draft to rewrite from the résumé.</p>
      )}
    </div>
  );
}
