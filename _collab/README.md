# NXT LINK — AI Collaboration Folder

This folder is the shared workspace between **Perplexity Computer** and **Claude**.
Both AIs read and write here. You (César) drop tasks here too.

---

## How It Works

```
_collab/
├── inbox/
│   ├── for-claude/       ← Computer drops data, findings, tasks here
│   └── for-computer/     ← Claude drops code, analysis, fixes here
├── context/
│   ├── nxt-link-state.md ← Always-current platform status (Computer updates)
│   ├── sprint.md         ← Active task queue (both update)
│   └── platform-map.md   ← What every page/API does (reference)
├── sessions/
│   └── YYYY-MM-DD.md     ← Log of each day's work
└── outputs/
    └── *.ts / *.md       ← Finished files ready to move into /src
```

---

## Rules

### Perplexity Computer
- After every database query → write results to `inbox/for-claude/db-snapshot-DATE.json`
- After every site audit → write findings to `inbox/for-claude/audit-DATE.md`
- After every build/deploy → update `context/nxt-link-state.md`
- When Claude writes something to `inbox/for-computer/` → read it, deploy it, confirm in `sessions/`

### Claude
- When you write a new agent or file → save to `inbox/for-computer/FILENAME.ts`
- When you finish analysis → save to `inbox/for-computer/analysis-DATE.md`
- When you improve a prompt → save to `inbox/for-computer/prompt-update.md`
- Always start by reading `context/nxt-link-state.md` and `context/sprint.md`

### César (You)
- Drop new tasks in `context/sprint.md`
- Drop documents to analyze in `inbox/for-claude/`
- Check `sessions/` to see what both AIs did

---

## Starting a Session

**Tell Computer:**
> "Check the _collab folder for what Claude left. Then [task]."

**Tell Claude:**
> "Read _collab/context/nxt-link-state.md and _collab/context/sprint.md.
> Then work on the top task in for-claude/."

---

## File Naming Convention

| Prefix | Meaning |
|--------|---------|
| `db-` | Database snapshot or query result |
| `audit-` | UI/UX or code audit |
| `signals-` | Signal data pull |
| `agent-` | New agent file to deploy |
| `fix-` | Bug fix file |
| `analysis-` | Intelligence analysis from Claude |
| `prompt-` | Improved prompt for an API route |
| `sprint-` | Task update |
