import { constants } from "node:buffer";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import z from "@deepseek-ai/schemastery";
import { SessionQueryError } from "@deepseek-ai/dsh-session-query";
import { isSkillName, isUserInvocable } from "@deepseek-ai/dsh-skill";
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { constants as constants$1 } from "node:fs";
import { lstat, open, opendir, realpath, stat } from "node:fs/promises";
//#region lib/types/references.js
/** Bounded local reference discovery and text reads under a provider-selected skill directory. */
function missing(error) {
	return error?.code === "ENOENT";
}
function unavailable(path, message) {
	throw new RemoteError("skillViewer/reference-unavailable", message, { path });
}
function assertInside(root, path) {
	const suffix = relative(root, path);
	if (suffix === "" || suffix === ".." || suffix.startsWith(`..${sep}`) || isAbsolute(suffix)) unavailable(path, "Reference must remain inside the selected skill directory.");
}
/**
* Discover regular reference files without following links or traversing hidden entries.
* @param directory - absolute local resource directory supplied by the skill provider.
* @param maxEntries - maximum directory entries examined across the traversal.
* @param signal - cancellation of the viewing request.
* @returns sorted file paths and whether the entry budget cut the listing.
* @throws when discovery is cancelled or an existing reference directory cannot be inspected safely.
*/
async function listReferences(directory, maxEntries, signal) {
	signal.throwIfAborted();
	let root;
	try {
		root = await realpath(directory);
	} catch (error) {
		if (missing(error)) return {
			files: [],
			truncated: false
		};
		throw error;
	}
	const pending = ["references"];
	const files = [];
	let examined = 0;
	let truncated = false;
	for (let path = pending.pop(); path !== void 0 && !truncated; path = pending.pop()) {
		signal.throwIfAborted();
		const target = join(root, ...path.split("/"));
		let info;
		try {
			info = await lstat(target);
		} catch (error) {
			if (missing(error)) continue;
			throw error;
		}
		if (!info.isDirectory() || info.isSymbolicLink()) continue;
		assertInside(root, await realpath(target));
		for await (const entry of await opendir(target)) {
			signal.throwIfAborted();
			examined += 1;
			if (examined > maxEntries) {
				truncated = true;
				break;
			}
			if (entry.name.startsWith(".") || entry.name.includes("\\")) continue;
			const child = `${path}/${entry.name}`;
			if (entry.isDirectory()) pending.push(child);
			else if (entry.isFile()) files.push(child);
		}
	}
	return {
		files: files.sort(),
		truncated
	};
}
async function referencePath(root, path) {
	const parts = path.split("/");
	if (parts[0] !== "references" || parts.length < 2 || path.includes("\\") || path.includes("\0") || parts.some((part) => part === "" || part.startsWith("."))) throw new RemoteError("gateway/bad-request", "Reference path must name a non-hidden file under references/.", {});
	let current = root;
	for (const [index, part] of parts.entries()) {
		current = resolve(current, part);
		assertInside(root, current);
		const info = await lstat(current);
		if (info.isSymbolicLink()) unavailable(path, "Symbolic links are not readable as skill references.");
		if (index === parts.length - 1 ? !info.isFile() : !info.isDirectory()) unavailable(path, "Reference must be a regular file.");
	}
	const canonical = await realpath(current);
	assertInside(root, canonical);
	return canonical;
}
/**
* Read a bounded UTF-8 prefix from a regular reference file, checking its directory and opened identity.
* @param directory - absolute local resource directory supplied by the skill provider.
* @param path - slash-separated relative path under references/.
* @param maxBytes - maximum bytes in the returned preview.
* @param signal - cancellation of the viewing request.
* @returns file text and explicit truncation metadata.
* @throws RemoteError for an unsafe path, non-regular file, or non-UTF-8 content; filesystem errors remain available to the Remote owner.
*/
async function readReference(directory, path, maxBytes, signal) {
	signal.throwIfAborted();
	const root = await realpath(directory);
	const target = await referencePath(root, path);
	const file = await open(target, constants$1.O_RDONLY | constants$1.O_NOFOLLOW);
	try {
		const info = await file.stat();
		const current = await stat(await referencePath(root, path));
		if (!info.isFile() || info.dev !== current.dev || info.ino !== current.ino) unavailable(path, "Reference changed while it was being opened.");
		const buffer = Buffer.allocUnsafe(maxBytes + 1);
		let used = 0;
		while (used < buffer.length) {
			signal.throwIfAborted();
			const result = await file.read(buffer, used, buffer.length - used, used);
			if (result.bytesRead === 0) break;
			used += result.bytesRead;
		}
		signal.throwIfAborted();
		const truncated = used > maxBytes;
		const bytes = buffer.subarray(0, Math.min(used, maxBytes));
		if (bytes.includes(0)) unavailable(path, "Reference is not a UTF-8 text file.");
		let content;
		try {
			content = new TextDecoder("utf-8", {
				fatal: true,
				ignoreBOM: true
			}).decode(bytes, { stream: truncated });
		} catch {
			unavailable(path, "Reference is not a UTF-8 text file.");
		}
		return {
			path,
			content,
			bytes: info.size,
			truncated
		};
	} finally {
		await file.close();
	}
}
//#endregion
//#region lib/types/index.js
/**
* Read-only skill catalog and body Remote for the skill viewer.
*
* This package owns the Session-addressed `skillViewer` Remote namespace
* serving the human skill-viewer UI. It reads the layered `ctx.skills`
* registry through the viewing Session's cwd and preset scope and never
* writes the session log: viewer reads are human presentation, not
* model-visible input, so they need no durable event.
*
* The neighboring `skills` namespace keeps serving the composer slash
* source; this namespace exists because that payload carries neither
* source/provider metadata nor skill bodies, and its contract is frozen.
*
* @module @winterhuan/dsh-skill-viewer
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) {
			if (kind === "field") initializers.unshift(_);
			else descriptor[key] = _;
		}
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
var __addDisposableResource = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/** Host service backing `ctx.remote.skillViewer` without activating a cold Agent. */
let SkillViewerCatalog = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _listDetails_decorators;
	let _get_decorators;
	let _readReference_decorators;
	return class SkillViewerCatalog extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_listDetails_decorators = [Remote];
			_get_decorators = [Remote];
			_readReference_decorators = [Remote];
			__esDecorate(this, null, _listDetails_decorators, {
				kind: "method",
				name: "listDetails",
				static: false,
				private: false,
				access: {
					has: (obj) => "listDetails" in obj,
					get: (obj) => obj.listDetails
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _get_decorators, {
				kind: "method",
				name: "get",
				static: false,
				private: false,
				access: {
					has: (obj) => "get" in obj,
					get: (obj) => obj.get
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readReference_decorators, {
				kind: "method",
				name: "readReference",
				static: false,
				private: false,
				access: {
					has: (obj) => "readReference" in obj,
					get: (obj) => obj.readReference
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = [
			"agents",
			"sessionQuery",
			"typert"
		];
		static Config = z.object({
			maxReferenceEntries: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(1e3),
			maxReferenceBytes: z.number().step(1).min(1).max(constants.MAX_LENGTH - 1).default(1048576)
		});
		config = __runInitializers(this, _instanceExtraInitializers);
		/**
		* @param ctx - Host context carrying Session reads and optional skill/preset services.
		* @param config - reference discovery and preview limits, resolved at construction.
		*/
		constructor(ctx, config = {}) {
			super(ctx, "skillViewerCatalog", { namespace: "skillViewer" });
			this.config = SkillViewerCatalog.Config(config);
		}
		/**
		* List the user-invocable skills visible to one Session composition, with
		* the source and provider metadata the composer catalog omits.
		* @param request - Session identity whose cwd and preset select the catalog view.
		* @param signal - caller lifetime carried by the Remote transport; admitted catalog reads retain their existing completion semantics.
		* @returns user-invocable skill metadata without bodies, plus whether a provider observation was incomplete.
		* @throws RemoteError when the Session cannot be inspected or no registry can serve it.
		*/
		async listDetails(request, signal) {
			const view = await this.viewOf(request.sessionId);
			try {
				const snapshot = await view.registry.snapshot({
					cwd: view.cwd,
					scope: view.scope
				});
				return {
					skills: snapshot.skills.filter(isUserInvocable).map(toEntry),
					stale: !snapshot.complete
				};
			} catch (error) {
				throw new RemoteError("gateway/internal", `skill viewer listing failed: ${String(error)}`, {});
			} finally {
				await view.release();
			}
		}
		/**
		* Load one user-invocable skill body for viewer presentation.
		* @param request - Session identity selecting the catalog view plus the exact skill name from the viewer list.
		* @param signal - caller lifetime used to cancel reference discovery.
		* @returns the full skill with body content and its local reference listing.
		* @throws RemoteError when the Session cannot be inspected, the name is invalid, or no user-invocable skill with this name is available.
		*/
		async get(request, signal) {
			const definition = await this.definitionOf(request);
			let references = null;
			if (definition.resourceBase?.kind === "directory" && isAbsolute(definition.resourceBase.path)) try {
				references = await listReferences(definition.resourceBase.path, this.config.maxReferenceEntries, signal);
			} catch (error) {
				if (error instanceof RemoteError || signal.aborted) throw error;
				throw new RemoteError("gateway/internal", `skill reference listing failed: ${String(error)}`, {});
			}
			return toValue(definition, references);
		}
		/**
		* Read one local reference of a user-invocable skill without starting an Agent.
		* @param request - Session, skill name, and relative file path under references/.
		* @param signal - caller lifetime used to cancel file reading.
		* @returns a bounded UTF-8 preview with explicit truncation and file-size metadata.
		* @throws RemoteError when the Session or skill is unavailable, the path is unsafe, or the file cannot be read as text.
		*/
		async readReference(request, signal) {
			const base = (await this.definitionOf(request)).resourceBase;
			if (base?.kind !== "directory" || !isAbsolute(base.path)) throw new RemoteError("skillViewer/reference-unavailable", "This skill has no local reference directory.", { path: request.path });
			try {
				return await readReference(base.path, request.path, this.config.maxReferenceBytes, signal);
			} catch (error) {
				if (error instanceof RemoteError || signal.aborted) throw error;
				throw new RemoteError("skillViewer/reference-unavailable", `Reference could not be read: ${String(error)}`, { path: request.path });
			}
		}
		/** Load the current winning, user-invocable definition under the viewing Session's scope. */
		async definitionOf(request) {
			if (!isSkillName(request.name)) throw new RemoteError("gateway/bad-request", `skill viewer received invalid skill name "${request.name}"`, {});
			const view = await this.viewOf(request.sessionId);
			let definition;
			try {
				definition = await view.registry.get(request.name, {
					cwd: view.cwd,
					scope: view.scope
				});
			} catch (error) {
				throw new RemoteError("gateway/internal", `skill viewer load failed: ${String(error)}`, {});
			} finally {
				await view.release();
			}
			if (definition === void 0 || !isUserInvocable(definition)) throw new RemoteError("skillViewer/unknown-skill", `skill "${request.name}" is unknown or no longer available`, {
				sessionId: request.sessionId,
				name: request.name
			});
			return definition;
		}
		/**
		* Resolve the workspace, viewing scope, and registry for one Session.
		* A live Agent addresses its own preset layers; a cold Session resolves
		* its recorded preset's standing scope; an unknown preset falls back to
		* the global registry. Nothing here resumes an Agent.
		* @param sessionId - Session identity to inspect.
		* @returns the registry read position for this Session.
		* @throws RemoteError when the Session cannot be inspected or no registry can serve it.
		*/
		async viewOf(sessionId) {
			let cwd;
			let agentPreset;
			try {
				const env_1 = {
					stack: [],
					error: void 0,
					hasError: false
				};
				try {
					const observation = __addDisposableResource(env_1, await this.ctx.sessionQuery.observeSession(sessionId), false);
					if (observation.projections === void 0) throw new Error("skill viewer requires a projected Session observation");
					cwd = observation.header.cwd;
					agentPreset = observation.projections.values.agentPreset ?? void 0;
				} catch (e_1) {
					env_1.error = e_1;
					env_1.hasError = true;
				} finally {
					__disposeResources(env_1);
				}
			} catch (error) {
				if (error instanceof SessionQueryError && error.code === "SESSION_QUERY_SESSION_NOT_FOUND") throw new RemoteError("skillViewer/session-not-found", `session "${sessionId}" not found`, { sessionId });
				throw new RemoteError("gateway/internal", `session "${sessionId}" could not be inspected: ${String(error)}`, {});
			}
			if (cwd === void 0) throw new RemoteError("gateway/internal", `session "${sessionId}" has no project cwd`, {});
			const live = this.ctx.agents.get(sessionId);
			const presets = this.ctx.get("agentPresets");
			const registry = (live === void 0 ? void 0 : presets?.serviceFor(live, "skills")) ?? this.ctx.get("skills");
			if (registry === void 0) throw new RemoteError("gateway/internal", "skill registry is absent: neither this session's agent preset nor the host composition mounts @deepseek-ai/dsh-skill", {});
			let scope = live;
			let release = async () => {};
			if (live === void 0 && presets !== void 0 && agentPreset !== void 0) try {
				const lease = await presets.acquireScope(agentPreset);
				scope = lease.key;
				release = async () => {
					await lease[Symbol.asyncDispose]();
				};
			} catch {
				scope = void 0;
			}
			return {
				cwd,
				scope,
				registry,
				release
			};
		}
	};
})();
/**
* Project one registry summary onto the viewer entry: the composer catalog
* drops source and provider, the viewer keeps them. Callers filter to
* user-invocable summaries first, which is what the hardcoded flag records.
* @param skill - user-invocable registry summary.
* @returns the viewer list entry.
*/
function toEntry(skill) {
	return {
		name: skill.name,
		description: skill.description,
		...skill.whenToUse === void 0 ? {} : { whenToUse: skill.whenToUse },
		modelInvocable: skill.invocation.modelInvocable,
		userInvocable: true,
		source: skill.source,
		provider: skill.provider
	};
}
/**
* Project one loaded definition onto the viewer value, detaching the
* provider-owned resource base into JSON-safe wire data.
* @param skill - loaded user-invocable definition with body content.
* @param references - local reference listing, or null for provider-managed resources.
* @returns the viewer detail value.
*/
function toValue(skill, references) {
	return {
		name: skill.name,
		description: skill.description,
		...skill.whenToUse === void 0 ? {} : { whenToUse: skill.whenToUse },
		modelInvocable: skill.invocation.modelInvocable,
		userInvocable: true,
		source: skill.source,
		provider: skill.provider,
		...skill.path === void 0 ? {} : { path: skill.path },
		...skill.resourceBase === void 0 ? {} : { resourceBase: toResourceBase(skill.resourceBase) },
		content: skill.content,
		references
	};
}
/**
* Detach one provider-owned resource base into wire data.
* @param base - provider resource base from a loaded definition.
* @returns the JSON-safe resource base.
*/
function toResourceBase(base) {
	if (base.kind === "directory") return {
		kind: "directory",
		path: base.path
	};
	if (base.kind === "url") return {
		kind: "url",
		url: base.url
	};
	return {
		kind: "opaque",
		description: base.description
	};
}
//#endregion
export { SkillViewerCatalog, SkillViewerCatalog as default };
