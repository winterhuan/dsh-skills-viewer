import type { SkillViewerReferences, SkillViewerReferenceValue } from './types.ts';
/**
 * Discover regular reference files without following links or traversing hidden entries.
 * @param directory - absolute local resource directory supplied by the skill provider.
 * @param maxEntries - maximum directory entries examined across the traversal.
 * @param signal - cancellation of the viewing request.
 * @returns sorted file paths and whether the entry budget cut the listing.
 * @throws when discovery is cancelled or an existing reference directory cannot be inspected safely.
 */
export declare function listReferences(directory: string, maxEntries: number, signal: AbortSignal): Promise<SkillViewerReferences>;
/**
 * Read a bounded UTF-8 prefix from a regular reference file, checking its directory and opened identity.
 * @param directory - absolute local resource directory supplied by the skill provider.
 * @param path - slash-separated relative path under references/.
 * @param maxBytes - maximum bytes in the returned preview.
 * @param signal - cancellation of the viewing request.
 * @returns file text and explicit truncation metadata.
 * @throws RemoteError for an unsafe path, non-regular file, or non-UTF-8 content; filesystem errors remain available to the Remote owner.
 */
export declare function readReference(directory: string, path: string, maxBytes: number, signal: AbortSignal): Promise<SkillViewerReferenceValue>;
//# sourceMappingURL=references.d.ts.map