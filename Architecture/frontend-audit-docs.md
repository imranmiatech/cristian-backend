# Frontend Documentation: Note Audit Logs & History

This guide explains how to consume the audit and history APIs to show users what changed, who changed it, and how to visualize previous versions of a note.

## 1. System-Wide Audit Logs
Used for a "Global Activity" or "Admin Dashboard" view to show recent actions across all notes.

**Endpoint:** `GET /notes/audit/all`  
**Query Parameters:**
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `noteName` | `string` | (Optional) Filter by note title |
| `authorName`| `string` | (Optional) Filter by the person who made the change |
| `startDate` | `ISO8601`| (Optional) Start date filter |
| `endDate` | `ISO8601`| (Optional) End date filter |
| `page` | `number` | Default: 1 |
| `limit` | `number` | Default: 10 |

**Response Example:**
```json
{
  "history": [
    {
      "id": "uuid",
      "action": "UPDATE", // CREATE, UPDATE, SOFT_DELETE, RECOVER
      "createdAt": "2023-10-27T10:00:00Z",
      "note": { "id": "uuid", "title": "Meeting Notes" },
      "changedBy": { "id": "uuid", "name": "John Doe", "email": "john@example.com" }
    }
  ],
  "meta": { "total": 100, "page": 1, "lastPage": 10 }
}
```

---

## 2. Specific Note History (Previous Changes)
Used to show a "Version History" or "Timeline" for a specific note.

**Endpoint:** `GET /notes/:id/history`

**Response Structure:**
The response is an array of history objects sorted by newest first. Each object represents a state *before* a change was made.

```json
[
  {
    "id": "uuid",
    "action": "UPDATE",
    "oldTitle": "Old Title",
    "oldContent": "Old content body...",
    "oldServices": [...], // JSON array of previous services
    "oldInteractionTypes": [...], // JSON array
    "oldDocuments": [...], // JSON array of previous attachments
    "createdAt": "2023-10-27T10:00:00Z",
    "changedBy": { "name": "Admin User", "profile": "url" }
  }
]
```

### How to Visualize Changes
When a user clicks on a history entry, you should compare the `oldX` fields with the current note data (or the next entry in the history list).

1.  **Text Diffs:** Use a library like `jsdiff` or `diff-match-patch` to compare `oldContent` with the current `content`.
2.  **Snapshots:** If `action` is `CREATE`, there are no "old" values. If `action` is `UPDATE`, the `oldTitle` and `oldContent` represent the state **immediately preceding** that specific update.
3.  **Deleted Items:** `SOFT_DELETE` and `RECOVER` actions are also logged here to show when a note was archived or brought back.

---

## 3. Soft Delete & Recovery
The frontend can manage "Trash" or "Archived" notes using these routes.

- **View Deleted Notes:** `GET /notes/deleted` (Shows notes where `deletedAt !== null`).
- **Archive Note:** `PATCH /notes/:id/soft-delete` (Moves to trash).
- **Restore Note:** `PATCH /notes/:id/recover` (Brings back to active).

## 4. UI Recommendations
- **Audit Table:** Show columns for `Action`, `Target Note`, `Changed By`, and `Date`.
- **History Timeline:** A vertical stepper showing the user's name and the action. Clicking an item expands to show a "Before/After" comparison of the text.
- **Badge Colors:**
  - `CREATE`: Green
  - `UPDATE`: Blue
  - `SOFT_DELETE`: Orange/Red
  - `RECOVER`: Purple
