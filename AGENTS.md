# AI Agent Guidelines for this Project

## 1. Code & File Protection (Anti-Destruction)
- **NEVER** use the `delete_file` tool unless explicitly requested by the user.
- **NEVER** overwrite an entire file with a completely new structure without reading it first and ensuring no business logic is lost.
- **ALWAYS** use `edit_file` or `multi_edit_file` for targeted changes.

## 2. Data Protection (Soft Delete Pattern)
- **NEVER** use `deleteDoc` from `firebase/firestore` for user-generated content (users, requests, offers, marketplace items, etc.).
- **ALWAYS** use "Soft Delete" by updating the document with a status flag.
  - Example: `updateDoc(docRef, { status: 'deleted', deletedAt: new Date().toISOString() })`
  - Example for items without status: `updateDoc(docRef, { isDeleted: true, deletedAt: new Date().toISOString() })`
- **Firestore Rules**: Ensure `allow delete: if false;` is the default for critical collections to prevent accidental hard deletions.

## 3. Error Handling & Stability
- Wrap all async operations in `try/catch`.
- Use `ErrorBoundary` to catch UI crashes.
- Validate all data before sending it to Firestore.
- Handle missing data gracefully using optional chaining (`?.`) and nullish coalescing (`??`).

## 4. Security
- Never hardcode API keys or secrets.
- Always validate user roles (`isAdmin()`, `isSupplier()`) before rendering sensitive UI components or performing privileged actions.
