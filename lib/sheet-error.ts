/**
 * Shared error type for sheet parsing / validation.
 *
 * Extracted from `parse-sheet.ts` so that `sheet-tabs.ts` (tab-name resolution)
 * can throw the same error type without creating a circular import between the
 * two modules. `parse-sheet.ts` re-exports it for backward compatibility.
 */

/** Thrown on header drift (spec §3.1.3), tab-name/date resolution, or zod validation failure. */
export class SheetSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetSchemaError';
  }
}
