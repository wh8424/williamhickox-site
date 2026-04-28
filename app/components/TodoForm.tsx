"use client";

import { useEffect, useRef, useState } from "react";

// Replaces the legacy index.html add-todo form. PIN modal is gone
// (homepage is auth-gated now). Otherwise feature-parity:
//   - "+ Add item" button toggles the form
//   - Title required
//   - Tag autocomplete fetched from /api/tags (proxied to ops)
//   - Priority + due date + notes fields
//   - URL pre-fill via ?addtodo=1&tag=...&priority=...
//   - Submit POSTs to /api/create-todo (Next.js route handler)

type TagEntry = {
  tag: string;
  color: string;
  kind: "context" | "project_tag";
  count: number;
};

const ALLOWED_CONTEXTS = new Set([
  "personal",
  "ki-bio",
  "impossible",
  "trading",
]);

function legacyListTypeToTag(listType: string | null): string | null {
  if (listType === "personal") return "personal";
  if (listType === "work") return "impossible";
  return null;
}

function tagToContextAndProjectTags(rawTag: string): {
  context: string;
  project_tags: string[];
} {
  const t = (rawTag || "").trim();
  if (!t) return { context: "impossible", project_tags: [] };
  if (ALLOWED_CONTEXTS.has(t)) return { context: t, project_tags: [] };
  return { context: "impossible", project_tags: [t] };
}

export default function TodoForm() {
  const [formVisible, setFormVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("impossible");
  const [priority, setPriority] = useState("normal");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [tagsCache, setTagsCache] = useState<TagEntry[] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [filtered, setFiltered] = useState<TagEntry[]>([]);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const sugRef = useRef<HTMLDivElement>(null);

  // URL pre-fill on first mount: ?addtodo=1 opens the form and
  // optionally pre-populates fields. Backwards-compat with the
  // legacy ?list_type= shortcut.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("addtodo")) return;
    setFormVisible(true);
    setTitle(params.get("title") ?? "");
    const tagValue =
      params.get("tag") ||
      params.get("context") ||
      legacyListTypeToTag(params.get("list_type"));
    if (tagValue) setTag(tagValue);
    const p = params.get("priority");
    if (p) setPriority(p);
    const d = params.get("due_date");
    if (d) setDue(d);
    const n = params.get("notes");
    if (n) setNotes(n);
  }, []);

  // Load tags when the form opens.
  useEffect(() => {
    if (!formVisible || tagsCache) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tags");
        if (!res.ok) {
          if (!cancelled) setTagsCache([]);
          return;
        }
        const body = (await res.json()) as { tags?: TagEntry[] };
        if (!cancelled) setTagsCache(Array.isArray(body.tags) ? body.tags : []);
      } catch {
        if (!cancelled) setTagsCache([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formVisible, tagsCache]);

  // Recompute filtered suggestions when tag input or cache changes.
  useEffect(() => {
    if (!showSuggestions) return;
    const q = tag.trim().toLowerCase();
    const tags = tagsCache ?? [];
    const matches = tags
      .filter((t) => !q || t.tag.toLowerCase().includes(q))
      .slice(0, 12);
    const exact = matches.some((t) => t.tag.toLowerCase() === q);
    const next: TagEntry[] = [...matches];
    if (q && !exact) {
      next.push({
        tag: tag.trim(),
        color: "#9ca3af",
        kind: "project_tag",
        count: 0,
      });
    }
    setFiltered(next);
    setActiveIdx(0);
  }, [tag, tagsCache, showSuggestions]);

  // Click-outside to dismiss the suggestion dropdown. mousedown so
  // the input.blur fires after the suggestion onClick handler runs.
  useEffect(() => {
    if (!showSuggestions) return;
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (!sugRef.current?.contains(t) && t !== tagInputRef.current) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

  function pickSuggestion(idx: number) {
    const choice = filtered[idx];
    if (!choice) return;
    setTag(choice.tag);
    setShowSuggestions(false);
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (filtered.length === 0) {
      if (e.key === "Escape") setShowSuggestions(false);
      return;
    }
    if (e.key === "ArrowDown") {
      setActiveIdx((i) => (i + 1) % filtered.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
      e.preventDefault();
    } else if (e.key === "Enter") {
      pickSuggestion(activeIdx);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  async function addTodo() {
    setError(null);
    setStatusMsg(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }
    const { context, project_tags } = tagToContextAndProjectTags(tag);
    const body = {
      title: trimmedTitle,
      context,
      project_tags,
      priority,
      due_date: due || null,
      notes: notes.trim() || null,
      source: "williamhickox.com",
    };
    setPending(true);
    try {
      const res = await fetch("/api/create-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = `Add failed: HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { error?: string; detail?: string };
          if (j.error) msg = j.error;
          else if (j.detail) msg = j.detail;
        } catch {
          /* ignore */
        }
        setError(msg);
        return;
      }
      setStatusMsg("Added");
      // Reset most fields but keep the tag/priority defaults so the
      // next add is one less keystroke. URL params get cleared so a
      // refresh doesn't re-fire the prefill flow.
      setTitle("");
      setDue("");
      setNotes("");
      if (window.location.search) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      setTimeout(() => {
        setFormVisible(false);
        setStatusMsg(null);
      }, 600);
    } catch (e) {
      setError(`Network error: ${String(e).slice(0, 120)}`);
    } finally {
      setPending(false);
    }
  }

  if (!formVisible) {
    return (
      <button
        className="todo-add-btn"
        type="button"
        onClick={() => {
          setFormVisible(true);
          setTimeout(() => {
            // Focus the title input shortly after mount.
            const titleEl = document.getElementById("input-title");
            if (titleEl) (titleEl as HTMLInputElement).focus();
          }, 50);
        }}
      >
        + Add item
      </button>
    );
  }

  return (
    <div className="todo-form">
      <input
        id="input-title"
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter") addTodo();
        }}
      />
      <div className="todo-form-row">
        <div className="tag-picker">
          <input
            ref={tagInputRef}
            type="text"
            id="input-tag"
            placeholder="Tag (impossible, ki-bio, …)"
            autoComplete="off"
            value={tag}
            disabled={pending}
            onChange={(e) => {
              setTag(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={onTagKeyDown}
          />
          {showSuggestions && filtered.length > 0 && (
            <div ref={sugRef} className="tag-suggestions">
              {filtered.map((t, i) => {
                const isCreate =
                  t.count === 0 &&
                  !ALLOWED_CONTEXTS.has(t.tag) &&
                  !(tagsCache ?? []).some(
                    (x) => x.tag.toLowerCase() === t.tag.toLowerCase(),
                  );
                if (isCreate) {
                  return (
                    <div
                      key={`new-${i}`}
                      className={`tag-suggestion tag-create${
                        i === activeIdx ? " tag-active" : ""
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickSuggestion(i);
                      }}
                    >
                      + Create new tag <strong>{t.tag}</strong>
                    </div>
                  );
                }
                return (
                  <div
                    key={t.tag}
                    className={`tag-suggestion${
                      i === activeIdx ? " tag-active" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickSuggestion(i);
                    }}
                  >
                    <span
                      className="tag-chip"
                      style={{
                        background: `${t.color}22`,
                        color: t.color,
                        borderColor: t.color,
                      }}
                    >
                      {t.tag}
                    </span>
                    <span className="tag-suggestion-meta">
                      {t.kind === "context" ? "context" : `${t.count}×`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <select
          id="input-priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          disabled={pending}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        disabled={pending}
      />
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter") addTodo();
        }}
      />
      {error && <div className="form-error">{error}</div>}
      <div className="todo-form-actions">
        <button
          className="btn-add"
          type="button"
          onClick={addTodo}
          disabled={pending || !title.trim()}
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          className="btn-cancel"
          type="button"
          onClick={() => {
            setFormVisible(false);
            setError(null);
            setStatusMsg(null);
          }}
          disabled={pending}
        >
          Cancel
        </button>
        {statusMsg && <span className="form-success">{statusMsg}</span>}
      </div>
    </div>
  );
}
