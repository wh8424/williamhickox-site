"use client";

import { useEffect, useRef, useState } from "react";

// Public todo form. Visible to every visitor. Authenticated visitors
// (Auth.js session present) submit straight through. Unauthenticated
// visitors (and iOS Shortcut callers) get prompted for a 4-digit PIN,
// which is sent as X-Todo-Pin and verified server-side by
// /api/create-todo against the TODO_PIN env var.
//
// Otherwise feature-parity with the legacy index.html form:
//   - "+ Add item" button toggles the form
//   - Title required
//   - Tag autocomplete fetched from /api/tags (now public)
//   - Priority + due date + notes
//   - URL pre-fill via ?addtodo=1&tag=...&priority=...
//   - POST /api/create-todo with bot-context routing

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

export default function TodoForm({
  authenticated,
}: {
  authenticated: boolean;
}) {
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

  // PIN modal state — only used when !authenticated
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const pinResolveRef = useRef<((p: string | null) => void) | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // URL pre-fill
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

  // Load tags when form opens
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

  // Recompute filtered suggestions
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

  // Click-outside dismiss
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

  // Focus PIN input when modal opens
  useEffect(() => {
    if (pinModalOpen && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [pinModalOpen]);

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

  // Open the PIN modal and return a Promise<string|null> resolving
  // to the entered PIN (or null if cancelled). Awaited from addTodo.
  function requestPin(): Promise<string | null> {
    setPinValue("");
    setPinError(null);
    setPinModalOpen(true);
    return new Promise<string | null>((resolve) => {
      pinResolveRef.current = resolve;
    });
  }

  function closePin(value: string | null) {
    setPinModalOpen(false);
    if (pinResolveRef.current) {
      pinResolveRef.current(value);
      pinResolveRef.current = null;
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

    // Authenticated visitors skip the PIN. Anonymous visitors must
    // present a PIN that /api/create-todo verifies against TODO_PIN.
    let pin: string | null = null;
    if (!authenticated) {
      pin = await requestPin();
      if (!pin) return; // user cancelled
    }

    setPending(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (pin) headers["X-Todo-Pin"] = pin;
      const res = await fetch("/api/create-todo", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        setError(
          authenticated
            ? "Session expired. Refresh the page and try again."
            : "Incorrect PIN",
        );
        return;
      }
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

  return (
    <>
      {!formVisible ? (
        <button
          className="todo-add-btn"
          type="button"
          onClick={() => {
            setFormVisible(true);
            setTimeout(() => {
              const titleEl = document.getElementById("input-title");
              if (titleEl) (titleEl as HTMLInputElement).focus();
            }, 50);
          }}
        >
          + Add item
        </button>
      ) : (
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
      )}

      {pinModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            // Click the dim backdrop to cancel.
            if (e.target === e.currentTarget) closePin(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-title">Enter PIN</div>
            <input
              ref={pinInputRef}
              type="password"
              maxLength={4}
              autoComplete="off"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (pinValue) closePin(pinValue);
                } else if (e.key === "Escape") {
                  closePin(null);
                }
              }}
            />
            {pinError && <div className="modal-error">{pinError}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => closePin(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-add"
                disabled={!pinValue}
                onClick={() => closePin(pinValue)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
