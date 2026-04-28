// Static content — server component is fine. Same body the legacy
// index.html shipped, just re-flowed into JSX. The expanded body
// documents POST /api/create-todo, the four contexts, project_tags,
// and the GET /api/todos/tags discovery endpoint (proxied via
// williamhickox.com/api/tags now).

export default function AiGuide() {
  return (
    <details>
      <summary>
        <span>How to add todos programmatically</span>
      </summary>
      <div className="ai-guide-body">
        <p>
          Authorized AI assistants and scripts can add todos to this list
          via a single POST endpoint. Ask Will for the shared API key.
        </p>

        <h4>Endpoint</h4>
        <pre>POST https://www.williamhickox.com/api/create-todo</pre>

        <h4>Headers</h4>
        <pre>{`Content-Type: application/json`}</pre>

        <h4>Body</h4>
        <pre>{`{
  "title":         "Task title here",  // required
  "context":       "impossible",       // "personal" | "ki-bio" | "impossible" | "trading"
  "project_tags":  ["sanova"],         // optional, array of strings
  "priority":      "normal",           // "low" | "normal" | "high"
  "due_date":      "2026-04-30",       // optional, YYYY-MM-DD
  "notes":         "Optional detail",  // optional
  "source":        "claude"            // optional — identify yourself
}`}</pre>

        <h4>Context</h4>
        <p>One of four reserved buckets the dashboard pulses on:</p>
        <ul>
          <li>
            <code>personal</code> &mdash; errands, home, family
          </li>
          <li>
            <code>ki-bio</code> &mdash; Ki-Bio company work
          </li>
          <li>
            <code>impossible</code> &mdash; Impossible Outcomes work + general business/ops
          </li>
          <li>
            <code>trading</code> &mdash; trading systems, bots, market work
          </li>
        </ul>

        <h4>Project tags</h4>
        <p>
          Free-form labels (e.g. <code>sanova</code>, <code>q3-launch</code>)
          for finer grouping. Use these for project-level breakouts within
          a context. Optional — pass <code>[]</code> or omit if unused.
          Existing tags can be discovered via{" "}
          <code>GET /api/todos/tags</code> on the ops dashboard (same
          API key).
        </p>

        <h4>Responses</h4>
        <ul>
          <li>
            <code>201</code> &mdash; todo created, body echoes it back
          </li>
          <li>
            <code>400</code> &mdash; missing/invalid title or context
          </li>
          <li>
            <code>401</code> &mdash; not signed in (form callers) or
            wrong API key (script callers)
          </li>
          <li>
            <code>502</code> / <code>503</code> &mdash; upstream ops
            dashboard unreachable
          </li>
        </ul>

        <h4>Notes for AI assistants</h4>
        <ul>
          <li>
            Always set <code>source</code> so Will knows which AI added
            the task.
          </li>
          <li>
            Use <code>priority: &quot;high&quot;</code> sparingly &mdash;
            only for genuinely urgent items.
          </li>
          <li>
            The canonical list lives at{" "}
            <a
              href="https://ops.williamhickox.com"
              target="_blank"
              rel="noreferrer"
            >
              ops.williamhickox.com
            </a>{" "}
            (Google sign-in required).
          </li>
        </ul>
      </div>
    </details>
  );
}
