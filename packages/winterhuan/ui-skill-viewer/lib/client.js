window.__ModuleLoader__.load({
	id: "@winterhuan/dsh-client-ui-skill-viewer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let zod = require("zod");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region ../../../node_modules/.pnpm/@deepseek-ai+dsh-typert-protocol@0.2.2-rc.1_@deepseek-ai+cordis@4.1.0/node_modules/@deepseek-ai/dsh-typert-protocol/lib/types/remote-info.js
		/** Lazy assembly of generated Remote definitions using caller-supplied Zod; no runtime imports. */
		/**
		* Retain one generated definition per endpoint without constructing parsers or projections.
		* The class instance builds its shared descriptor/method index on first access;
		* input schemas and JSON Schema projections are cached only when requested.
		* @param spec - compiler-produced method facts and Zod factories.
		* @param zod - the generated artifact's Zod runtime for named-input parsers.
		* @returns a lazy, mountable info instance with no registration or transport effects.
		*/
		function createTypertRemoteInfo(spec, zod) {
			return new RemoteInfo(spec, zod);
		}
		var RemoteInfo = class {
			spec;
			zod;
			index;
			constructor(spec, zod) {
				this.spec = spec;
				this.zod = zod;
			}
			get package() {
				return this.spec.package;
			}
			get descriptors() {
				return this.resolve().descriptors;
			}
			get methods() {
				return this.resolve().methods;
			}
			resolve() {
				if (this.index !== void 0) return this.index;
				const zod = this.zod;
				const descriptors = [];
				const methods = Object.create(null);
				for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
					const separator = endpoint.indexOf("/");
					const namespace = endpoint.slice(0, separator);
					const method = endpoint.slice(separator + 1);
					const parameters = definition.parameters.map((parameter) => ({
						...parameter,
						wire: parameter.wire ?? parameter.name
					}));
					const descriptor = {
						...definition,
						id: `${this.spec.package}#${endpoint}`,
						namespace,
						method,
						parameters,
						result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
					};
					if (definition.invocation.kind === "direct") {
						const inputs = [];
						methods[endpoint] = Object.assign(descriptor, {
							input(options) {
								const strict = options?.strict === true;
								return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
							},
							invoke(remote, input, signal) {
								const named = input;
								const values = parameters.map((parameter) => named[parameter.wire]);
								if (definition.cancellation !== void 0) values.push(signal);
								const receiver = Reflect.get(remote, namespace);
								return Reflect.get(receiver, method).apply(receiver, values);
							}
						});
					}
					descriptors.push(descriptor);
				}
				return this.index = {
					descriptors,
					methods
				};
			}
		};
		function optional(parameter) {
			return parameter.source === "json" && parameter.acceptsUndefined === true;
		}
		var NamedInput = class {
			parameters;
			strict;
			zod;
			schema;
			projection;
			constructor(parameters, strict, zod) {
				this.parameters = parameters;
				this.strict = strict;
				this.zod = zod;
			}
			codec(parameter) {
				return this.strict ? parameter.strictCodec : parameter.codec;
			}
			create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
				const value = this.codec(parameter).create();
				return [parameter.wire, optional(parameter) ? value.optional() : value.nonoptional()];
			})));
			get jsonSchema() {
				return this.project().jsonSchema;
			}
			get jsonSchemaError() {
				return this.project().jsonSchemaError;
			}
			project() {
				if (this.projection !== void 0) return this.projection;
				const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
				if (unavailable !== void 0) return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
				return this.projection = { jsonSchema: {
					type: "object",
					properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
						...this.codec(parameter).jsonSchema,
						...parameter.description === void 0 ? {} : { description: parameter.description }
					}])),
					required: this.parameters.filter((parameter) => !optional(parameter)).map((parameter) => parameter.wire),
					additionalProperties: false
				} };
			}
		};
		var ResultValue = class {
			spec;
			projection;
			constructor(spec) {
				this.spec = spec;
			}
			get mode() {
				return this.spec.mode;
			}
			get typeSymbol() {
				return this.spec.typeSymbol;
			}
			get create() {
				return this.spec.create;
			}
			get decode() {
				return this.spec.decode;
			}
			get encode() {
				return this.spec.encode;
			}
			get description() {
				return this.spec.description;
			}
			get jsonSchemaError() {
				return this.spec.jsonSchemaError;
			}
			get jsonSchema() {
				if (this.projection === void 0) {
					const schema = this.spec.jsonSchema;
					this.projection = { value: schema === void 0 ? void 0 : {
						...schema,
						description: this.spec.description
					} };
				}
				return this.projection.value;
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/@winterhuan+dsh-skill-viewer@https+++github.com+winterhuan+dsh-skill-viewer+releases+do_23a586a7756bf7e947fee57e3a388c8e/node_modules/@winterhuan/dsh-skill-viewer/lib/typert.remote-client.js
		let _winterhuan_dsh_skill_viewer_skillViewer_get_parameter_0$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_get_parameter_0$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_get_parameter_0$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly().describe("Session whose cwd and preset select the catalog view."),
			"name": zod.z.string().readonly().describe("Exact skill name from the viewer list.")
		});
		let _winterhuan_dsh_skill_viewer_skillViewer_get_result$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_get_result$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_get_result$schema$value ??= zod.z.object({
			"name": zod.z.string().readonly().describe("Kebab-case identifier."),
			"description": zod.z.string().readonly().describe("Short routing description."),
			"whenToUse": zod.z.union([zod.z.undefined(), zod.z.string()]).readonly().optional().describe("Optional extra routing guidance."),
			"modelInvocable": zod.z.boolean().readonly().describe("Whether the same skill is also advertised to the model."),
			"userInvocable": zod.z.literal(true).readonly().describe("Always true: the viewer only serves the human surface."),
			"source": zod.z.string().readonly().describe("Discovery source that produced the winning skill."),
			"provider": zod.z.string().readonly().describe("Provider that owns the skill body."),
			"path": zod.z.union([zod.z.undefined(), zod.z.string()]).readonly().optional().describe("Absolute file path when the skill came from disk."),
			"resourceBase": zod.z.union([
				zod.z.undefined(),
				zod.z.object({
					"kind": zod.z.literal("directory").readonly(),
					"path": zod.z.string().readonly()
				}),
				zod.z.object({
					"kind": zod.z.literal("url").readonly(),
					"url": zod.z.string().readonly()
				}),
				zod.z.object({
					"kind": zod.z.literal("opaque").readonly(),
					"description": zod.z.string().readonly()
				})
			]).readonly().optional().describe("Provider-specific base for relative resources."),
			"content": zod.z.string().readonly().describe("Markdown instruction body."),
			"references": zod.z.union([zod.z.literal(null), zod.z.object({
				"files": zod.z.array(zod.z.string()).readonly().describe("Sorted, slash-separated paths under references/; symbolic links and hidden entries are omitted."),
				"truncated": zod.z.boolean().readonly().describe("Whether the discovery budget prevented a complete listing.")
			})]).readonly().describe("Local reference listing, or null when the provider supplies no absolute local directory.")
		});
		let _winterhuan_dsh_skill_viewer_skillViewer_listDetails_parameter_0$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_listDetails_parameter_0$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_listDetails_parameter_0$schema$value ??= zod.z.object({ "sessionId": zod.z.string().readonly().describe("Session whose cwd and preset select the catalog view.") });
		let _winterhuan_dsh_skill_viewer_skillViewer_listDetails_result$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_listDetails_result$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_listDetails_result$schema$value ??= zod.z.object({
			"skills": zod.z.array(zod.z.object({
				"name": zod.z.string().readonly().describe("Kebab-case identifier."),
				"description": zod.z.string().readonly().describe("Short routing description."),
				"whenToUse": zod.z.union([zod.z.undefined(), zod.z.string()]).readonly().optional().describe("Optional extra routing guidance."),
				"modelInvocable": zod.z.boolean().readonly().describe("Whether the same skill is also advertised to the model."),
				"userInvocable": zod.z.literal(true).readonly().describe("Always true: the viewer only serves the human surface."),
				"source": zod.z.string().readonly().describe("Discovery source that produced the winning skill."),
				"provider": zod.z.string().readonly().describe("Provider that owns the skill body.")
			})).readonly().describe("User-invocable skills visible through the Session composition, sorted by name."),
			"stale": zod.z.boolean().readonly().describe("Whether a provider observation was incomplete. An incomplete list keeps whatever the registry could collect; callers present it as last-good coverage rather than an authoritative catalog.")
		});
		let _winterhuan_dsh_skill_viewer_skillViewer_readReference_parameter_0$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_readReference_parameter_0$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_readReference_parameter_0$schema$value ??= zod.z.object({
			"path": zod.z.string().readonly().describe("Slash-separated path under references/, as returned by get."),
			"sessionId": zod.z.string().readonly().describe("Session whose cwd and preset select the catalog view."),
			"name": zod.z.string().readonly().describe("Exact skill name from the viewer list.")
		});
		let _winterhuan_dsh_skill_viewer_skillViewer_readReference_result$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_readReference_result$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_readReference_result$schema$value ??= zod.z.object({
			"path": zod.z.string().readonly().describe("Requested path relative to the skill resource directory."),
			"content": zod.z.string().readonly().describe("Text read from the file, with an incomplete trailing code point omitted when truncated."),
			"bytes": zod.z.number().readonly().describe("File size observed before reading, in bytes."),
			"truncated": zod.z.boolean().readonly().describe("Whether content is only the configured prefix of the file.")
		});
		let _winterhuan_dsh_skill_viewer_skillViewer_get_parameter_0_strict$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_get_parameter_0_strict$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_get_parameter_0_strict$schema$value ??= zod.z.strictObject({
			"sessionId": zod.z.string().readonly().describe("Session whose cwd and preset select the catalog view."),
			"name": zod.z.string().readonly().describe("Exact skill name from the viewer list.")
		});
		let _winterhuan_dsh_skill_viewer_skillViewer_listDetails_parameter_0_strict$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_listDetails_parameter_0_strict$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_listDetails_parameter_0_strict$schema$value ??= zod.z.strictObject({ "sessionId": zod.z.string().readonly().describe("Session whose cwd and preset select the catalog view.") });
		let _winterhuan_dsh_skill_viewer_skillViewer_readReference_parameter_0_strict$schema$value;
		const _winterhuan_dsh_skill_viewer_skillViewer_readReference_parameter_0_strict$schema = () => _winterhuan_dsh_skill_viewer_skillViewer_readReference_parameter_0_strict$schema$value ??= zod.z.strictObject({
			"path": zod.z.string().readonly().describe("Slash-separated path under references/, as returned by get."),
			"sessionId": zod.z.string().readonly().describe("Session whose cwd and preset select the catalog view."),
			"name": zod.z.string().readonly().describe("Exact skill name from the viewer list.")
		});
		const TYPERT_REMOTE = createTypertRemoteInfo({
			package: "@winterhuan/dsh-skill-viewer",
			methods: {
				"skillViewer/get": {
					service: "skillViewerCatalog",
					description: "Load one user-invocable skill body for viewer presentation.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						description: "Session identity selecting the catalog view plus the exact skill name from the viewer list.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerGetRequest",
							create: _winterhuan_dsh_skill_viewer_skillViewer_get_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"sessionId": {
										"type": "string",
										"description": "Session whose cwd and preset select the catalog view."
									},
									"name": {
										"type": "string",
										"description": "Exact skill name from the viewer list."
									}
								},
								"required": ["sessionId", "name"],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerGetRequest",
							create: _winterhuan_dsh_skill_viewer_skillViewer_get_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"sessionId": {
										"type": "string",
										"description": "Session whose cwd and preset select the catalog view."
									},
									"name": {
										"type": "string",
										"description": "Exact skill name from the viewer list."
									}
								},
								"required": ["sessionId", "name"],
								"additionalProperties": false
							}
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerGetValue",
						create: _winterhuan_dsh_skill_viewer_skillViewer_get_result$schema,
						description: "the full skill with body content and its local reference listing.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"name": {
									"type": "string",
									"description": "Kebab-case identifier."
								},
								"description": {
									"type": "string",
									"description": "Short routing description."
								},
								"whenToUse": {
									"type": "string",
									"description": "Optional extra routing guidance."
								},
								"modelInvocable": {
									"type": "boolean",
									"description": "Whether the same skill is also advertised to the model."
								},
								"userInvocable": {
									"type": "boolean",
									"const": true,
									"description": "Always true: the viewer only serves the human surface."
								},
								"source": {
									"type": "string",
									"description": "Discovery source that produced the winning skill."
								},
								"provider": {
									"type": "string",
									"description": "Provider that owns the skill body."
								},
								"path": {
									"type": "string",
									"description": "Absolute file path when the skill came from disk."
								},
								"resourceBase": {
									"oneOf": [
										{
											"type": "object",
											"properties": {
												"kind": {
													"type": "string",
													"const": "directory"
												},
												"path": { "type": "string" }
											},
											"required": ["kind", "path"],
											"additionalProperties": true
										},
										{
											"type": "object",
											"properties": {
												"kind": {
													"type": "string",
													"const": "url"
												},
												"url": { "type": "string" }
											},
											"required": ["kind", "url"],
											"additionalProperties": true
										},
										{
											"type": "object",
											"properties": {
												"kind": {
													"type": "string",
													"const": "opaque"
												},
												"description": { "type": "string" }
											},
											"required": ["kind", "description"],
											"additionalProperties": true
										}
									],
									"description": "Provider-specific base for relative resources."
								},
								"content": {
									"type": "string",
									"description": "Markdown instruction body."
								},
								"references": {
									"oneOf": [{
										"type": "null",
										"const": null
									}, {
										"type": "object",
										"properties": {
											"files": {
												"type": "array",
												"items": { "type": "string" },
												"description": "Sorted, slash-separated paths under references/; symbolic links and hidden entries are omitted."
											},
											"truncated": {
												"type": "boolean",
												"description": "Whether the discovery budget prevented a complete listing."
											}
										},
										"required": ["files", "truncated"],
										"additionalProperties": true
									}],
									"description": "Local reference listing, or null when the provider supplies no absolute local directory."
								}
							},
							"required": [
								"name",
								"description",
								"modelInvocable",
								"userInvocable",
								"source",
								"provider",
								"content",
								"references"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/winterhuan/skill-viewer/src/index.ts",
						"line": 138,
						"column": 9
					}
				},
				"skillViewer/listDetails": {
					service: "skillViewerCatalog",
					description: "List the user-invocable skills visible to one Session composition, with the source and provider metadata the composer catalog omits.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						description: "Session identity whose cwd and preset select the catalog view.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerListRequest",
							create: _winterhuan_dsh_skill_viewer_skillViewer_listDetails_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": { "sessionId": {
									"type": "string",
									"description": "Session whose cwd and preset select the catalog view."
								} },
								"required": ["sessionId"],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerListRequest",
							create: _winterhuan_dsh_skill_viewer_skillViewer_listDetails_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": { "sessionId": {
									"type": "string",
									"description": "Session whose cwd and preset select the catalog view."
								} },
								"required": ["sessionId"],
								"additionalProperties": false
							}
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerListValue",
						create: _winterhuan_dsh_skill_viewer_skillViewer_listDetails_result$schema,
						description: "user-invocable skill metadata without bodies, plus whether a provider observation was incomplete.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"skills": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"name": {
												"type": "string",
												"description": "Kebab-case identifier."
											},
											"description": {
												"type": "string",
												"description": "Short routing description."
											},
											"whenToUse": {
												"type": "string",
												"description": "Optional extra routing guidance."
											},
											"modelInvocable": {
												"type": "boolean",
												"description": "Whether the same skill is also advertised to the model."
											},
											"userInvocable": {
												"type": "boolean",
												"const": true,
												"description": "Always true: the viewer only serves the human surface."
											},
											"source": {
												"type": "string",
												"description": "Discovery source that produced the winning skill."
											},
											"provider": {
												"type": "string",
												"description": "Provider that owns the skill body."
											}
										},
										"required": [
											"name",
											"description",
											"modelInvocable",
											"userInvocable",
											"source",
											"provider"
										],
										"additionalProperties": true
									},
									"description": "User-invocable skills visible through the Session composition, sorted by name."
								},
								"stale": {
									"type": "boolean",
									"description": "Whether a provider observation was incomplete. An incomplete list keeps whatever the registry could collect; callers present it as last-good coverage rather than an authoritative catalog."
								}
							},
							"required": ["skills", "stale"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/winterhuan/skill-viewer/src/index.ts",
						"line": 110,
						"column": 9
					}
				},
				"skillViewer/readReference": {
					service: "skillViewerCatalog",
					description: "Read one local reference of a user-invocable skill without starting an Agent.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						description: "Session, skill name, and relative file path under references/.",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerReferenceRequest",
							create: _winterhuan_dsh_skill_viewer_skillViewer_readReference_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"path": {
										"type": "string",
										"description": "Slash-separated path under references/, as returned by get."
									},
									"sessionId": {
										"type": "string",
										"description": "Session whose cwd and preset select the catalog view."
									},
									"name": {
										"type": "string",
										"description": "Exact skill name from the viewer list."
									}
								},
								"required": [
									"path",
									"sessionId",
									"name"
								],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerReferenceRequest",
							create: _winterhuan_dsh_skill_viewer_skillViewer_readReference_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"path": {
										"type": "string",
										"description": "Slash-separated path under references/, as returned by get."
									},
									"sessionId": {
										"type": "string",
										"description": "Session whose cwd and preset select the catalog view."
									},
									"name": {
										"type": "string",
										"description": "Exact skill name from the viewer list."
									}
								},
								"required": [
									"path",
									"sessionId",
									"name"
								],
								"additionalProperties": false
							}
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@winterhuan/dsh-skill-viewer/types#SkillViewerReferenceValue",
						create: _winterhuan_dsh_skill_viewer_skillViewer_readReference_result$schema,
						description: "a bounded UTF-8 preview with explicit truncation and file-size metadata.",
						jsonSchema: {
							"type": "object",
							"properties": {
								"path": {
									"type": "string",
									"description": "Requested path relative to the skill resource directory."
								},
								"content": {
									"type": "string",
									"description": "Text read from the file, with an incomplete trailing code point omitted when truncated."
								},
								"bytes": {
									"type": "number",
									"description": "File size observed before reading, in bytes."
								},
								"truncated": {
									"type": "boolean",
									"description": "Whether content is only the configured prefix of the file."
								}
							},
							"required": [
								"path",
								"content",
								"bytes",
								"truncated"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/winterhuan/skill-viewer/src/index.ts",
						"line": 160,
						"column": 9
					}
				}
			}
		}, zod.z);
		//#endregion
		//#region lib/types/client/controller.js
		/**
		* Skill viewer controller, browser half: the panel's viewing state plus a
		* session-keyed catalog cache over the `skillViewer` Remote.
		*
		* Catalog fetches are cached per session with a single-flight fetch each
		* (the ui-skill twin): opening the panel replays the settled snapshot
		* locally, so one session costs one list RPC. A preset switch drops that
		* session's entries (the catalog belongs to the preset), and a reconnect
		* clears everything. A shared in-flight fetch outlives any single panel
		* interaction: closing the panel must not kill a fetch a reopen will hit,
		* so each fetch carries its own abort (fired only on invalidation and
		* teardown) while a superseded caller just yields. Loaded bodies cache per
		* session and name the same way.
		*
		* Session switches mid-flight never paint a stale session's data: every
		* settlement checks the currently addressable session first.
		*/
		/** Initial panel state: closed with nothing fetched. */
		const INITIAL = {
			open: false,
			query: "",
			status: "idle",
			skills: [],
			stale: false,
			error: null,
			scoped: false,
			detail: null,
			reference: null
		};
		/**
		* Render an arbitrary Remote failure as diagnostic text. A non-Error
		* rejection carries nothing displayable; the panel substitutes its
		* localized unknown-failure line for the null return.
		*/
		function failureText(error) {
			return error instanceof Error ? error.message : null;
		}
		/**
		* Rank skill names first, followed by entries matching their description or origin.
		* @param skills - current session's catalog.
		* @param query - case-insensitive name or metadata search.
		* @returns matching entries without duplicates, preserving catalog order after name matches.
		*/
		function searchSkills(skills, query) {
			const text = query.trim().toLowerCase();
			const names = (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)(skills, text);
			const matched = new Set(names.map((skill) => skill.name));
			return [...names, ...skills.filter((skill) => !matched.has(skill.name) && [
				skill.description,
				skill.whenToUse,
				skill.source,
				skill.provider
			].some((value) => value?.toLowerCase().includes(text)))];
		}
		/** Panel controller: viewing state plus session-keyed Remote caches. */
		var SkillViewerController = class {
			remote;
			sessions;
			/** Panel snapshot the renderer subscribes to. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(INITIAL);
			/** Session-keyed list fetches; single-flight per key. */
			lists = /* @__PURE__ */ new Map();
			/** Session-and-name-keyed body fetches; single-flight per key. */
			bodies = /* @__PURE__ */ new Map();
			/** Session subscription teardown. */
			offSessions;
			selectionVersion = 0;
			listVersion = 0;
			referenceRead;
			viewedSession;
			/**
			* @param remote - the mounted skillViewer namespace contribution.
			* @param sessions - current selection and child addressing.
			*/
			constructor(remote, sessions) {
				this.remote = remote;
				this.sessions = sessions;
				this.offSessions = sessions.list.subscribe(() => {
					this.refreshOnSessionChange();
				});
			}
			/** Abort in-flight fetches and release the session subscription. */
			dispose() {
				this.selectionVersion += 1;
				this.listVersion += 1;
				this.cancelReference();
				this.offSessions();
				for (const entry of this.lists.values()) entry.abort.abort();
				this.lists.clear();
				for (const entry of this.bodies.values()) entry.abort.abort();
				this.bodies.clear();
			}
			/** Show the panel, loading the current session's catalog when uncached. */
			open() {
				const selected = this.addressable() === this.viewedSession ? this.store.getSnapshot().detail?.name : void 0;
				this.selectionVersion += 1;
				this.cancelReference();
				this.set({
					open: true,
					detail: null,
					reference: null
				});
				this.ensureList(true, selected);
			}
			/** Hide the panel; settled caches survive for the next open. */
			close() {
				this.selectionVersion += 1;
				this.cancelReference();
				this.set({
					open: false,
					reference: null
				});
			}
			/**
			* Update the search text.
			* @param query - raw search input.
			*/
			setQuery(query) {
				this.set({ query });
			}
			/** Reload the current session's catalog, bypassing its cache. */
			retry() {
				const sessionId = this.addressable();
				const selected = this.store.getSnapshot().detail?.name;
				if (sessionId !== void 0) this.invalidateSession(sessionId);
				this.selectionVersion += 1;
				this.cancelReference();
				this.set({ reference: null });
				this.ensureList(true, selected);
			}
			/**
			* Show one skill's detail, loading its body when uncached.
			* @param name - exact skill name from the viewer list.
			*/
			select(name) {
				const sessionId = this.addressable();
				if (sessionId === void 0) return;
				const selectionVersion = ++this.selectionVersion;
				this.cancelReference();
				const settled = this.bodies.get(`${sessionId}/${name}`)?.settled;
				if (settled !== void 0) {
					this.set({
						detail: {
							name,
							status: "ready",
							value: settled,
							error: null
						},
						reference: null
					});
					return;
				}
				this.set({
					detail: {
						name,
						status: "loading",
						value: null,
						error: null
					},
					reference: null
				});
				this.fetchBody(sessionId, name).then((value) => {
					if (this.selectionVersion !== selectionVersion) return;
					if (this.addressable() !== sessionId) return;
					this.set({ detail: {
						name,
						status: "ready",
						value,
						error: null
					} });
				}, (error) => {
					if (this.selectionVersion !== selectionVersion) return;
					if (this.addressable() !== sessionId) return;
					this.set({ detail: {
						name,
						status: "error",
						value: null,
						error: failureText(error)
					} });
				});
			}
			/** Return from a reference to its skill, or from the skill to the list. */
			back() {
				this.selectionVersion += 1;
				this.cancelReference();
				if (this.store.getSnapshot().reference !== null) {
					this.set({ reference: null });
					return;
				}
				this.set({ detail: null });
			}
			/**
			* Read a reference without invoking a model tool or changing the selected skill.
			* @param path - reference path supplied by the skill's listing; empty selects its instructions.
			*/
			selectReference(path) {
				this.cancelReference();
				if (path === "") {
					this.set({ reference: null });
					return;
				}
				const sessionId = this.addressable();
				const detail = this.store.getSnapshot().detail;
				if (sessionId === void 0 || detail?.status !== "ready") return;
				const read = new AbortController();
				this.referenceRead = read;
				this.set({ reference: {
					path,
					status: "loading",
					value: null,
					error: null
				} });
				const current = () => this.referenceRead === read && this.addressable() === sessionId && this.store.getSnapshot().detail?.name === detail.name;
				this.remote.readReference({
					sessionId,
					name: detail.name,
					path
				}, read.signal).then((result) => {
					if (!current()) return;
					this.referenceRead = void 0;
					this.set({ reference: result.ok ? {
						path,
						status: "ready",
						value: result.value,
						error: null
					} : {
						path,
						status: "error",
						value: null,
						error: `skillViewer/readReference failed: ${result.error.code}: ${result.error.message}`
					} });
				}, (error) => {
					if (!current()) return;
					this.referenceRead = void 0;
					this.set({ reference: {
						path,
						status: "error",
						value: null,
						error: failureText(error)
					} });
				});
			}
			cancelReference() {
				this.referenceRead?.abort();
				this.referenceRead = void 0;
			}
			/**
			* Drop cached entries, optionally scoped to one session.
			* @param sessionId - session whose entries to drop; omitted drops everything.
			*/
			invalidate(sessionId) {
				const affectsCurrent = sessionId === void 0 || sessionId === this.addressable();
				if (sessionId === void 0) {
					for (const entry of this.lists.values()) entry.abort.abort();
					this.lists.clear();
					for (const entry of this.bodies.values()) entry.abort.abort();
					this.bodies.clear();
				} else this.invalidateSession(sessionId);
				if (!affectsCurrent) return;
				this.selectionVersion += 1;
				this.cancelReference();
				this.set({
					detail: null,
					reference: null
				});
				if (this.store.getSnapshot().open) this.ensureList(true);
			}
			/** Reload the list when the current session changed under an open panel. */
			refreshOnSessionChange() {
				if (!this.store.getSnapshot().open) return;
				if (this.addressable() === this.viewedSession) return;
				this.selectionVersion += 1;
				this.cancelReference();
				this.set({
					detail: null,
					reference: null
				});
				this.ensureList(true);
			}
			/**
			* Session backing the viewer, or undefined for blank and child views.
			*
			* The shown Session is the one the shell's main view retains: Host-owned
			* navigation publishes no single selection for a root-scoped surface to read,
			* so the retain claim is the address.
			*/
			addressable() {
				const byId = this.sessions.list.getSnapshot().byId;
				const current = Object.values(byId).find((row) => (row.retainedBy.mainView ?? 0) > 0)?.id;
				if (current === void 0) return void 0;
				if (this.sessions.subagentAddress(current) !== void 0) return void 0;
				return current;
			}
			/** Load the current session's catalog from cache or the Remote. */
			ensureList(selectDefault = false, selected) {
				const listVersion = ++this.listVersion;
				const selectionVersion = this.selectionVersion;
				const sessionId = this.addressable();
				if (sessionId !== this.viewedSession) this.set({
					skills: [],
					stale: false
				});
				this.viewedSession = sessionId;
				if (sessionId === void 0) {
					this.set({
						status: "ready",
						skills: [],
						stale: false,
						error: null,
						scoped: false
					});
					return;
				}
				const cached = this.lists.get(sessionId)?.settled;
				const publish = (value) => {
					this.set({
						status: "ready",
						skills: value.skills,
						stale: value.stale,
						error: null,
						scoped: true
					});
					const state = this.store.getSnapshot();
					if (!selectDefault || !state.open || selected === void 0 && state.detail !== null || this.selectionVersion !== selectionVersion) return;
					const first = value.skills.find((skill) => skill.name === selected) ?? searchSkills(value.skills, state.query)[0];
					if (first !== void 0) this.select(first.name);
					else this.set({
						detail: null,
						reference: null
					});
				};
				if (cached !== void 0) {
					publish(cached);
					return;
				}
				this.set({
					status: "loading",
					error: null,
					scoped: true
				});
				this.fetchList(sessionId).then((value) => {
					if (this.listVersion !== listVersion) return;
					if (this.addressable() !== sessionId) return;
					publish(value);
				}, (error) => {
					if (this.listVersion !== listVersion) return;
					if (this.addressable() !== sessionId) return;
					this.set({
						status: "error",
						error: failureText(error),
						scoped: true
					});
				});
			}
			/** Session-keyed single-flight list fetch recording its settled value. */
			fetchList(sessionId) {
				const existing = this.lists.get(sessionId);
				if (existing !== void 0) return existing.promise;
				const abort = new AbortController();
				const promise = (async () => {
					const result = await this.remote.listDetails({ sessionId }, abort.signal);
					if (!result.ok) throw new Error(`skillViewer/listDetails failed: ${result.error.code}: ${result.error.message}`);
					return result.value;
				})();
				const entry = {
					promise,
					abort
				};
				this.lists.set(sessionId, entry);
				promise.then((value) => {
					entry.settled = value;
				}, () => {
					if (this.lists.get(sessionId) === entry) this.lists.delete(sessionId);
				});
				return promise;
			}
			/** Session-and-name-keyed single-flight body fetch recording its settled value. */
			fetchBody(sessionId, name) {
				const key = `${sessionId}/${name}`;
				const existing = this.bodies.get(key);
				if (existing !== void 0) return existing.promise;
				const abort = new AbortController();
				const promise = (async () => {
					const result = await this.remote.get({
						sessionId,
						name
					}, abort.signal);
					if (!result.ok) throw new Error(`skillViewer/get failed: ${result.error.code}: ${result.error.message}`);
					return result.value;
				})();
				const entry = {
					promise,
					abort
				};
				this.bodies.set(key, entry);
				promise.then((value) => {
					entry.settled = value;
				}, () => {
					if (this.bodies.get(key) === entry) this.bodies.delete(key);
				});
				return promise;
			}
			/** Abort and drop one session's cached entries. */
			invalidateSession(sessionId) {
				const list = this.lists.get(sessionId);
				if (list !== void 0) {
					this.lists.delete(sessionId);
					list.abort.abort();
				}
				for (const [key, entry] of this.bodies) if (key.startsWith(`${sessionId}/`)) {
					this.bodies.delete(key);
					entry.abort.abort();
				}
			}
			/** Replace the panel snapshot wholesale. */
			set(patch) {
				this.store.set({
					...this.store.getSnapshot(),
					...patch
				});
			}
		};
		//#endregion
		//#region \0dsh-css:/Users/winter/dsh-plugins/dsh-client-ui-skill-viewer/packages/winterhuan/ui-skill-viewer/src/client/SkillViewerPanel.module.css.mjs
		const css$1 = ".gCeZjq_panel{flex:1;grid-template-columns:minmax(260px,30%) minmax(0,1fr);min-width:0;min-height:0;display:grid;overflow:hidden}.gCeZjq_catalog,.gCeZjq_reader{flex-direction:column;min-width:0;min-height:0;display:flex}.gCeZjq_catalog{border-right:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}.gCeZjq_search{flex:none;padding:16px 16px 8px}.gCeZjq_catalogActions{align-items:center;gap:12px;min-height:32px;margin-top:6px;display:flex}.gCeZjq_catalogActions>span{flex:1}.gCeZjq_textButton{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:0;padding:4px 0;font-size:13px}.gCeZjq_textButton:hover{color:var(--dsw-alias-label-primary)}.gCeZjq_textButton:disabled{opacity:.5;cursor:default}.gCeZjq_loading{min-height:96px;color:var(--dsw-alias-label-secondary);flex:1;place-items:center;display:grid}.gCeZjq_spinner{animation:1s linear infinite gCeZjq_spin}@keyframes gCeZjq_spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.gCeZjq_spinner{animation:none}}.gCeZjq_searchInput{box-sizing:border-box;width:100%}.gCeZjq_searchInput input::placeholder{color:var(--dsw-alias-label-secondary);opacity:1}.gCeZjq_catalogScroll{overscroll-behavior:contain;--dsh-scrollbar-track-margin:8px;flex:1;min-height:0;padding:8px 12px 16px;overflow-y:auto}.gCeZjq_selectionHint{text-align:center;color:var(--dsw-alias-label-secondary);margin:auto;padding:24px;font-size:14px}.gCeZjq_readerStatus{color:var(--dsw-alias-label-secondary);margin:0;padding:16px 24px;font-size:13px}.gCeZjq_status,.gCeZjq_hint{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px}.gCeZjq_empty{flex-direction:column;gap:4px;display:flex}.gCeZjq_stale{color:var(--dsw-alias-state-warn-primary);margin:0 0 8px;font-size:12px}.gCeZjq_errorBlock{flex-direction:column;gap:8px;display:flex}.gCeZjq_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:13px}.gCeZjq_retry,.gCeZjq_back,.gCeZjq_referenceBack{border:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:6px;align-self:flex-start;padding:4px 12px;font-size:13px}.gCeZjq_retry:hover,.gCeZjq_back:hover,.gCeZjq_referenceBack:hover{color:var(--dsw-alias-label-primary)}.gCeZjq_list{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}.gCeZjq_rowButton{text-align:start;cursor:pointer;background:0 0;border:.5px solid #0000;border-radius:6px;flex-direction:column;gap:6px;width:100%;padding:12px;display:flex}.gCeZjq_rowButton:hover{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-muted)}.gCeZjq_rowButton[aria-current=true]{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-muted);box-shadow:inset 3px 0 var(--dsw-alias-label-primary)}.gCeZjq_rowButton:focus-visible,.gCeZjq_textButton:focus-visible,.gCeZjq_referenceSelect:focus-visible,.gCeZjq_metadataHeading:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:2px}.gCeZjq_rowTitle{align-items:center;gap:8px;display:flex}.gCeZjq_name{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;font-size:13px;font-weight:500}.gCeZjq_badge{color:var(--dsw-alias-label-secondary);border:.5px solid var(--dsw-alias-border-l1);corner-shape:round;border-radius:999px;padding:1px 6px;font-size:11px}.gCeZjq_description{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:1.6}.gCeZjq_rowButton .gCeZjq_description{-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.gCeZjq_meta{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;font-size:12px}.gCeZjq_detailName{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;margin:0;font-size:15px;font-weight:500}.gCeZjq_detailHeader{border-bottom:.5px solid var(--dsw-alias-border-l2);flex:none;align-items:center;gap:12px;padding:16px 24px;display:flex}.gCeZjq_back{flex:none;display:none}.gCeZjq_detail{overscroll-behavior:contain;--dsh-scrollbar-track-margin:8px;flex:1;min-height:0;padding:20px 24px;overflow-y:auto}.gCeZjq_metadata{border-block:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);margin:16px 0;padding:12px 0;font-size:13px}.gCeZjq_metadataHeading{cursor:pointer;margin:0;font-size:13px;font-weight:500}.gCeZjq_referenceBack{flex:none}.gCeZjq_references{margin:16px 0}.gCeZjq_referenceFields{flex-direction:column;gap:8px;display:flex}.gCeZjq_referenceLabel{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:6px;font-size:12px;display:flex}.gCeZjq_referenceSelect{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);width:100%;min-width:0;color:var(--dsw-alias-label-primary);border-radius:6px;padding:8px;font-size:13px}.gCeZjq_metaList{flex-direction:column;gap:4px;margin:12px 0 0;display:flex}.gCeZjq_metaRow{grid-template-columns:64px minmax(0,1fr);gap:8px;margin:0;font-size:13px;display:grid}.gCeZjq_metaRow dt{min-width:64px;color:var(--dsw-alias-label-secondary);flex:none}.gCeZjq_metaRow dd{min-width:0;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0}.gCeZjq_instructions{min-width:0}.gCeZjq_instructionsHeader{color:var(--dsw-alias-label-secondary);border-bottom:.5px solid var(--dsw-alias-border-l2);overflow-wrap:anywhere;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;font-size:13px;display:flex}.gCeZjq_markdown{min-width:0;padding:16px 0}.gCeZjq_body{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-label-primary);border-radius:6px;margin:16px 0 0;padding:16px;font-size:13px;line-height:1.7}@media (width<=760px){.gCeZjq_panel{grid-template-columns:minmax(0,1fr)}.gCeZjq_catalog{border-right:0}.gCeZjq_reader,.gCeZjq_panel[data-detail=true] .gCeZjq_catalog{display:none}.gCeZjq_panel[data-detail=true] .gCeZjq_reader{display:flex}.gCeZjq_back{display:inline-block}.gCeZjq_detailHeader,.gCeZjq_detail,.gCeZjq_readerStatus{padding:16px}}";
		const tagId$1 = "@winterhuan/dsh-client-ui-skill-viewer/SkillViewerPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@winterhuan/dsh-client-ui-skill-viewer";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var SkillViewerPanel_module_css_default = {
			"back": "gCeZjq_back",
			"badge": "gCeZjq_badge",
			"body": "gCeZjq_body",
			"catalog": "gCeZjq_catalog",
			"catalogActions": "gCeZjq_catalogActions",
			"catalogScroll": "gCeZjq_catalogScroll",
			"description": "gCeZjq_description",
			"detail": "gCeZjq_detail",
			"detailHeader": "gCeZjq_detailHeader",
			"detailName": "gCeZjq_detailName",
			"empty": "gCeZjq_empty",
			"error": "gCeZjq_error",
			"errorBlock": "gCeZjq_errorBlock",
			"hint": "gCeZjq_hint",
			"instructions": "gCeZjq_instructions",
			"instructionsHeader": "gCeZjq_instructionsHeader",
			"list": "gCeZjq_list",
			"loading": "gCeZjq_loading",
			"markdown": "gCeZjq_markdown",
			"meta": "gCeZjq_meta",
			"metaList": "gCeZjq_metaList",
			"metaRow": "gCeZjq_metaRow",
			"metadata": "gCeZjq_metadata",
			"metadataHeading": "gCeZjq_metadataHeading",
			"name": "gCeZjq_name",
			"panel": "gCeZjq_panel",
			"reader": "gCeZjq_reader",
			"readerStatus": "gCeZjq_readerStatus",
			"referenceBack": "gCeZjq_referenceBack",
			"referenceFields": "gCeZjq_referenceFields",
			"referenceLabel": "gCeZjq_referenceLabel",
			"referenceSelect": "gCeZjq_referenceSelect",
			"references": "gCeZjq_references",
			"retry": "gCeZjq_retry",
			"rowButton": "gCeZjq_rowButton",
			"rowTitle": "gCeZjq_rowTitle",
			"search": "gCeZjq_search",
			"searchInput": "gCeZjq_searchInput",
			"selectionHint": "gCeZjq_selectionHint",
			"spin": "gCeZjq_spin",
			"spinner": "gCeZjq_spinner",
			"stale": "gCeZjq_stale",
			"status": "gCeZjq_status",
			"textButton": "gCeZjq_textButton"
		};
		//#endregion
		//#region lib/types/client/SkillViewerPanel.js
		/** Provider resource base rendered as one verbatim line. */
		function resourceLine(value) {
			if (value.kind === "directory") return value.path;
			if (value.kind === "url") return value.url;
			return value.description;
		}
		/**
		* Render one list row: name, badges, description, and source metadata.
		* @param props - row entry plus selection callback and copy.
		* @returns the row button.
		*/
		function SkillRow({ name, description, modelInvocable, source, provider, selected, t, onSelect }) {
			return (0, react_jsx_runtime.jsx)("li", {
				className: SkillViewerPanel_module_css_default.row,
				children: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: SkillViewerPanel_module_css_default.rowButton,
					"aria-current": selected ? "true" : void 0,
					onClick: () => {
						onSelect(name);
					},
					children: [
						(0, react_jsx_runtime.jsxs)("span", {
							className: SkillViewerPanel_module_css_default.rowTitle,
							children: [(0, react_jsx_runtime.jsx)("code", {
								className: SkillViewerPanel_module_css_default.name,
								children: name
							}), modelInvocable ? null : (0, react_jsx_runtime.jsx)("span", {
								className: SkillViewerPanel_module_css_default.badge,
								children: t("row.userOnly")
							})]
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: SkillViewerPanel_module_css_default.description,
							children: description
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: SkillViewerPanel_module_css_default.meta,
							children: `${source} · ${provider}`
						})
					]
				})
			}, name);
		}
		/**
		* Render the searchable catalog alongside a reader, with single-pane navigation on narrow screens.
		* @param props - panel snapshot, copy, and intent callbacks.
		* @returns the panel tree.
		*/
		function SkillViewerPanel({ state, t, onQuery, onRetry, onSelect, onBack, onReference }) {
			const detail = state.detail;
			const matches = searchSkills(state.skills, state.query);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: SkillViewerPanel_module_css_default.panel,
				"data-detail": detail !== null || void 0,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: SkillViewerPanel_module_css_default.catalog,
					children: [state.scoped ? (0, react_jsx_runtime.jsxs)("div", {
						className: SkillViewerPanel_module_css_default.search,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							className: SkillViewerPanel_module_css_default.searchInput,
							autoFocus: true,
							"aria-label": t("search.label"),
							placeholder: t("search.placeholder"),
							value: state.query,
							onChange: (event) => {
								onQuery(event.target.value);
							}
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: SkillViewerPanel_module_css_default.catalogActions,
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: SkillViewerPanel_module_css_default.hint,
									role: "status",
									children: t("list.count", {
										count: matches.length,
										total: state.skills.length
									})
								}),
								state.query ? (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SkillViewerPanel_module_css_default.textButton,
									onClick: () => {
										onQuery("");
									},
									children: t("search.clear")
								}) : null,
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SkillViewerPanel_module_css_default.textButton,
									disabled: state.status === "loading",
									onClick: onRetry,
									children: t("list.refresh")
								})
							]
						})]
					}) : null, (0, react_jsx_runtime.jsxs)("div", {
						className: SkillViewerPanel_module_css_default.catalogScroll,
						children: [
							state.status === "idle" || state.status === "loading" ? (0, react_jsx_runtime.jsx)("div", {
								className: SkillViewerPanel_module_css_default.loading,
								role: "status",
								"aria-label": t("list.loading"),
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, { className: SkillViewerPanel_module_css_default.spinner })
							}) : null,
							state.status === "error" ? (0, react_jsx_runtime.jsxs)("div", {
								className: SkillViewerPanel_module_css_default.errorBlock,
								role: "alert",
								children: [(0, react_jsx_runtime.jsx)("p", {
									className: SkillViewerPanel_module_css_default.error,
									children: `${t("list.error")}：${state.error ?? t("error.unknown")}`
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SkillViewerPanel_module_css_default.retry,
									onClick: onRetry,
									children: t("list.retry")
								})]
							}) : null,
							state.status === "ready" || state.skills.length > 0 ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [state.stale ? (0, react_jsx_runtime.jsx)("p", {
								className: SkillViewerPanel_module_css_default.stale,
								children: t("list.stale")
							}) : null, state.skills.length === 0 ? (0, react_jsx_runtime.jsxs)("div", {
								className: SkillViewerPanel_module_css_default.empty,
								children: [(0, react_jsx_runtime.jsx)("p", {
									className: SkillViewerPanel_module_css_default.status,
									children: t("list.empty")
								}), state.scoped ? null : (0, react_jsx_runtime.jsx)("p", {
									className: SkillViewerPanel_module_css_default.hint,
									children: t("list.emptyHint")
								})]
							}) : matches.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
								className: SkillViewerPanel_module_css_default.status,
								children: t("list.noResults")
							}) : (0, react_jsx_runtime.jsx)("ul", {
								className: SkillViewerPanel_module_css_default.list,
								children: matches.map((skill) => (0, react_jsx_runtime.jsx)(SkillRow, {
									name: skill.name,
									description: skill.description,
									modelInvocable: skill.modelInvocable,
									source: skill.source,
									provider: skill.provider,
									selected: detail?.name === skill.name,
									t,
									onSelect
								}, skill.name))
							})] }) : null
						]
					})]
				}), (0, react_jsx_runtime.jsx)("div", {
					className: SkillViewerPanel_module_css_default.reader,
					children: detail === null ? (0, react_jsx_runtime.jsx)("p", {
						className: SkillViewerPanel_module_css_default.selectionHint,
						children: t("detail.empty")
					}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: SkillViewerPanel_module_css_default.detailHeader,
							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: state.reference === null ? SkillViewerPanel_module_css_default.back : SkillViewerPanel_module_css_default.referenceBack,
								onClick: onBack,
								children: t(state.reference === null ? "detail.back" : "reference.back")
							}), (0, react_jsx_runtime.jsx)("h2", {
								className: SkillViewerPanel_module_css_default.detailName,
								children: (0, react_jsx_runtime.jsx)("code", { children: detail.name })
							})]
						}),
						detail.status === "loading" ? (0, react_jsx_runtime.jsx)("div", {
							className: SkillViewerPanel_module_css_default.loading,
							role: "status",
							"aria-label": t("detail.loading"),
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, { className: SkillViewerPanel_module_css_default.spinner })
						}) : null,
						detail.status === "error" ? (0, react_jsx_runtime.jsxs)("div", {
							className: SkillViewerPanel_module_css_default.readerStatus,
							role: "alert",
							children: [(0, react_jsx_runtime.jsx)("p", {
								className: SkillViewerPanel_module_css_default.error,
								children: `${t("detail.error")}：${detail.error ?? t("error.unknown")}`
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SkillViewerPanel_module_css_default.retry,
								onClick: () => {
									onSelect(detail.name);
								},
								children: t("detail.retry")
							})]
						}) : null,
						detail.status === "ready" && detail.value !== null ? (0, react_jsx_runtime.jsx)(SkillDetail, {
							value: detail.value,
							reference: state.reference,
							onReference,
							t
						}, detail.name) : null
					] })
				})]
			});
		}
		/**
		* Render one loaded skill: metadata plus the full instruction body.
		* @param props - loaded skill value and copy.
		* @returns the detail tree.
		*/
		function SkillDetail({ value, reference, onReference, t }) {
			const [fileQuery, setFileQuery] = (0, react.useState)("");
			const [mode, setMode] = (0, react.useState)("preview");
			const id = (0, react.useId)();
			const scroll = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (scroll.current !== null) scroll.current.scrollTop = 0;
			}, [reference?.path]);
			const matches = (value.references?.files ?? []).filter((path) => path.toLowerCase().includes(fileQuery.trim().toLowerCase()));
			const markdown = reference === null || /\.(md|markdown)$/i.test(reference.path);
			const content = reference === null ? value.content : reference.value?.content ?? "";
			const activeMode = markdown ? mode : "source";
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: scroll,
				className: SkillViewerPanel_module_css_default.detail,
				role: "region",
				"aria-label": t("detail.content"),
				tabIndex: 0,
				children: [
					(0, react_jsx_runtime.jsx)("p", {
						className: SkillViewerPanel_module_css_default.description,
						children: value.description
					}),
					(0, react_jsx_runtime.jsxs)("details", {
						className: SkillViewerPanel_module_css_default.metadata,
						children: [(0, react_jsx_runtime.jsx)("summary", {
							className: SkillViewerPanel_module_css_default.metadataHeading,
							children: t("meta.details")
						}), (0, react_jsx_runtime.jsxs)("dl", {
							className: SkillViewerPanel_module_css_default.metaList,
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: SkillViewerPanel_module_css_default.metaRow,
									children: [(0, react_jsx_runtime.jsx)("dt", { children: t("meta.source") }), (0, react_jsx_runtime.jsx)("dd", { children: value.source })]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: SkillViewerPanel_module_css_default.metaRow,
									children: [(0, react_jsx_runtime.jsx)("dt", { children: t("meta.provider") }), (0, react_jsx_runtime.jsx)("dd", { children: value.provider })]
								}),
								value.whenToUse === void 0 ? null : (0, react_jsx_runtime.jsxs)("div", {
									className: SkillViewerPanel_module_css_default.metaRow,
									children: [(0, react_jsx_runtime.jsx)("dt", { children: t("meta.whenToUse") }), (0, react_jsx_runtime.jsx)("dd", { children: value.whenToUse })]
								}),
								value.path === void 0 ? null : (0, react_jsx_runtime.jsxs)("div", {
									className: SkillViewerPanel_module_css_default.metaRow,
									children: [(0, react_jsx_runtime.jsx)("dt", { children: t("meta.path") }), (0, react_jsx_runtime.jsx)("dd", { children: (0, react_jsx_runtime.jsx)("code", { children: value.path }) })]
								}),
								value.resourceBase === void 0 ? null : (0, react_jsx_runtime.jsxs)("div", {
									className: SkillViewerPanel_module_css_default.metaRow,
									children: [(0, react_jsx_runtime.jsx)("dt", { children: t("meta.resources") }), (0, react_jsx_runtime.jsx)("dd", { children: (0, react_jsx_runtime.jsx)("code", { children: resourceLine(value.resourceBase) }) })]
								})
							]
						})]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: SkillViewerPanel_module_css_default.references,
						children: [
							value.references === null ? (0, react_jsx_runtime.jsx)("p", {
								className: SkillViewerPanel_module_css_default.hint,
								children: t("reference.unavailable")
							}) : value.references.files.length === 0 ? null : (0, react_jsx_runtime.jsxs)("div", {
								className: SkillViewerPanel_module_css_default.referenceFields,
								children: [
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										className: SkillViewerPanel_module_css_default.searchInput,
										"aria-label": t("reference.search"),
										placeholder: t("reference.search"),
										value: fileQuery,
										onChange: (event) => {
											setFileQuery(event.target.value);
										}
									}),
									(0, react_jsx_runtime.jsxs)("label", {
										className: SkillViewerPanel_module_css_default.referenceLabel,
										children: [(0, react_jsx_runtime.jsx)("span", { children: t("reference.label") }), (0, react_jsx_runtime.jsxs)("select", {
											className: SkillViewerPanel_module_css_default.referenceSelect,
											value: reference?.path ?? "",
											onChange: (event) => {
												onReference(event.target.value);
											},
											children: [
												(0, react_jsx_runtime.jsx)("option", {
													value: "",
													children: t("reference.instructions")
												}),
												reference !== null && !matches.includes(reference.path) ? (0, react_jsx_runtime.jsx)("option", {
													value: reference.path,
													children: reference.path
												}) : null,
												matches.map((path) => (0, react_jsx_runtime.jsx)("option", {
													value: path,
													children: path
												}, path))
											]
										})]
									}),
									matches.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
										className: SkillViewerPanel_module_css_default.hint,
										children: t("reference.noResults")
									}) : null
								]
							}),
							value.references?.files.length === 0 && !value.references.truncated ? (0, react_jsx_runtime.jsx)("p", {
								className: SkillViewerPanel_module_css_default.hint,
								children: t("reference.empty")
							}) : null,
							value.references?.truncated === true ? (0, react_jsx_runtime.jsx)("p", {
								className: SkillViewerPanel_module_css_default.hint,
								children: t("reference.listTruncated")
							}) : null
						]
					}),
					(0, react_jsx_runtime.jsxs)("section", {
						className: SkillViewerPanel_module_css_default.instructions,
						"aria-label": t("detail.instructions"),
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: SkillViewerPanel_module_css_default.instructionsHeader,
								children: [(0, react_jsx_runtime.jsx)("span", { children: reference?.path ?? t("detail.instructions") }), markdown ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
									id,
									value: mode,
									onChange: setMode,
									label: t("detail.view"),
									options: [{
										value: "preview",
										label: t("detail.preview")
									}, {
										value: "source",
										label: t("detail.source")
									}]
								}) : null]
							}),
							reference?.status === "loading" ? (0, react_jsx_runtime.jsx)("div", {
								className: SkillViewerPanel_module_css_default.loading,
								role: "status",
								"aria-label": t("reference.loading"),
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, { className: SkillViewerPanel_module_css_default.spinner })
							}) : null,
							reference?.status === "error" ? (0, react_jsx_runtime.jsxs)("div", {
								className: SkillViewerPanel_module_css_default.readerStatus,
								role: "alert",
								children: [(0, react_jsx_runtime.jsx)("p", {
									className: SkillViewerPanel_module_css_default.error,
									children: `${t("reference.error")}：${reference.error ?? t("error.unknown")}`
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SkillViewerPanel_module_css_default.retry,
									onClick: () => {
										onReference(reference.path);
									},
									children: t("detail.retry")
								})]
							}) : null,
							reference?.value?.truncated === true ? (0, react_jsx_runtime.jsx)("p", {
								className: SkillViewerPanel_module_css_default.readerStatus,
								children: t("reference.truncated")
							}) : null,
							reference === null || reference.status === "ready" ? (0, react_jsx_runtime.jsx)("div", {
								role: markdown ? "tabpanel" : void 0,
								id: `${id}-${activeMode}-panel`,
								"aria-labelledby": markdown ? `${id}-${activeMode}` : void 0,
								children: activeMode === "source" ? (0, react_jsx_runtime.jsx)("pre", {
									className: SkillViewerPanel_module_css_default.body,
									children: content
								}) : (0, react_jsx_runtime.jsx)("div", {
									className: SkillViewerPanel_module_css_default.markdown,
									children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
										text: content,
										labels: {
											code: {
												copyLabel: t("code.copy"),
												copiedLabel: t("code.copied"),
												toolbarLabels: {
													codeLabel: t("code.title"),
													wrapLabel: t("code.wrap"),
													unwrapLabel: t("code.unwrap")
												}
											},
											footnotes: t("detail.footnotes")
										}
									})
								})
							}) : null
						]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/winter/dsh-plugins/dsh-client-ui-skill-viewer/packages/winterhuan/ui-skill-viewer/src/client/SkillViewerAction.module.css.mjs
		const css = ".s-3e8q_action{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:6px;align-items:center;gap:6px;padding:6px;display:inline-flex}.s-3e8q_action:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-muted)}.s-3e8q_label{font-size:13px;line-height:1.2}.s-3e8q_modal{gap:0;width:min(1120px,100%);height:calc(100dvh - 48px);min-height:0;max-height:100%;padding:0}.s-3e8q_header{border-bottom:.5px solid var(--dsw-alias-border-l1);flex:none;justify-content:space-between;align-items:flex-start;gap:16px;padding:20px 24px;display:flex}.s-3e8q_title{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:500;line-height:24px}.s-3e8q_description{color:var(--dsw-alias-label-secondary);margin:4px 0 0;font-size:13px;line-height:1.5}.s-3e8q_close{flex:none;width:36px;padding:0}@media (width<=760px){.s-3e8q_header{padding:16px}}";
		const tagId = "@winterhuan/dsh-client-ui-skill-viewer/SkillViewerAction.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@winterhuan/dsh-client-ui-skill-viewer";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SkillViewerAction_module_css_default = {
			"action": "s-3e8q_action",
			"close": "s-3e8q_close",
			"description": "s-3e8q_description",
			"header": "s-3e8q_header",
			"label": "s-3e8q_label",
			"modal": "s-3e8q_modal",
			"title": "s-3e8q_title"
		};
		//#endregion
		//#region lib/types/client/SkillViewerAction.js
		/**
		* Render the sidebar-foot skill entry plus the viewer modal.
		* @param props - foot owner props, localized copy, and injected viewer state.
		* @returns the action button and the modal tree.
		*/
		function SkillViewerAction({ wide, controller, useViewer, t }) {
			const state = useViewer((viewer) => viewer);
			const action = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!state.open) return;
				return () => {
					action.current?.focus();
				};
			}, [state.open]);
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t("action.label"),
				delayMs: 500,
				disabled: wide,
				children: (0, react_jsx_runtime.jsxs)("button", {
					ref: action,
					type: "button",
					className: SkillViewerAction_module_css_default.action,
					"aria-label": t("action.label"),
					onClick: () => {
						controller.open();
					},
					children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutlineRegular, { size: wide ? 14 : 18 }), wide ? (0, react_jsx_runtime.jsx)("span", {
						className: SkillViewerAction_module_css_default.label,
						children: t("action.label")
					}) : null]
				})
			}), (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: state.open,
				onClose: () => {
					controller.close();
				},
				title: t("panel.title"),
				headless: true,
				className: SkillViewerAction_module_css_default.modal,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: SkillViewerAction_module_css_default.header,
					children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("h2", {
						className: SkillViewerAction_module_css_default.title,
						children: t("panel.title")
					}), (0, react_jsx_runtime.jsx)("p", {
						className: SkillViewerAction_module_css_default.description,
						children: t("panel.description")
					})] }), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						className: SkillViewerAction_module_css_default.close,
						"aria-label": t("panel.close"),
						icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {}),
						onClick: () => {
							controller.close();
						}
					})]
				}), (0, react_jsx_runtime.jsx)(SkillViewerPanel, {
					state,
					t,
					onQuery: (query) => {
						controller.setQuery(query);
					},
					onRetry: () => {
						controller.retry();
					},
					onSelect: (name) => {
						controller.select(name);
					},
					onBack: () => {
						controller.back();
					},
					onReference: (path) => {
						controller.selectReference(path);
					}
				})]
			})] });
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `skillViewer` namespace dictionaries for the skill viewer panel. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "skillViewer";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"action.label": "技能",
			"panel.title": "技能",
			"panel.description": "查看当前会话可用的技能及其完整说明。",
			"panel.close": "关闭",
			"search.label": "搜索技能",
			"search.placeholder": "搜索技能…",
			"search.clear": "清除",
			"list.count": "{count} / {total} 个技能",
			"list.refresh": "刷新",
			"list.loading": "正在加载技能列表…",
			"list.empty": "暂无可用技能",
			"list.noResults": "没有匹配的技能",
			"list.emptyHint": "打开一个项目会话后可查看该项目的技能。",
			"list.error": "技能列表加载失败",
			"list.retry": "重试",
			"list.stale": "部分来源尚未就绪，当前为上次可用视图。",
			"error.unknown": "未知错误",
			"detail.back": "返回列表",
			"detail.empty": "选择一个技能，查看完整说明。",
			"detail.content": "技能详情",
			"detail.loading": "正在加载技能全文…",
			"detail.error": "技能全文加载失败",
			"detail.retry": "重试",
			"detail.instructions": "完整说明",
			"detail.view": "阅读模式",
			"detail.preview": "预览",
			"detail.source": "原文",
			"detail.footnotes": "脚注",
			"code.copy": "复制代码",
			"code.copied": "已复制",
			"code.title": "代码",
			"code.wrap": "自动换行",
			"code.unwrap": "取消换行",
			"meta.whenToUse": "适用场景",
			"meta.details": "技能信息",
			"reference.label": "参考文件",
			"reference.search": "查找参考文件…",
			"reference.noResults": "没有匹配的参考文件",
			"reference.instructions": "技能说明",
			"reference.back": "返回技能说明",
			"reference.loading": "正在加载参考文件…",
			"reference.error": "参考文件读取失败",
			"reference.empty": "此技能没有参考文件。",
			"reference.unavailable": "此技能未提供本地参考目录。",
			"reference.listTruncated": "参考目录较大，当前仅列出部分文件。",
			"reference.truncated": "文件较大，当前显示截断后的预览。",
			"meta.source": "来源",
			"meta.provider": "提供方",
			"meta.resources": "资源",
			"meta.path": "路径",
			"row.userOnly": "仅用户"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"action.label": "Skills",
			"panel.title": "Skills",
			"panel.description": "Browse the skills available to the current session with their full instructions.",
			"panel.close": "Close",
			"search.label": "Search skills",
			"search.placeholder": "Search skills…",
			"search.clear": "Clear",
			"list.count": "{count} / {total} skills",
			"list.refresh": "Refresh",
			"list.loading": "Loading skills…",
			"list.empty": "No skills available",
			"list.noResults": "No matching skills",
			"list.emptyHint": "Open a workspace session to view its skills.",
			"list.error": "Skill list failed to load",
			"list.retry": "Retry",
			"list.stale": "Some sources are not ready yet; showing the last available view.",
			"error.unknown": "Unknown error",
			"detail.back": "Back to list",
			"detail.empty": "Select a skill to read its full instructions.",
			"detail.content": "Skill details",
			"detail.loading": "Loading skill instructions…",
			"detail.error": "Skill instructions failed to load",
			"detail.retry": "Retry",
			"detail.instructions": "Instructions",
			"detail.view": "Reading mode",
			"detail.preview": "Preview",
			"detail.source": "Source",
			"detail.footnotes": "Footnotes",
			"code.copy": "Copy code",
			"code.copied": "Copied",
			"code.title": "Code",
			"code.wrap": "Wrap lines",
			"code.unwrap": "Unwrap lines",
			"meta.whenToUse": "When to use",
			"meta.details": "Skill information",
			"reference.label": "Reference files",
			"reference.search": "Find reference files…",
			"reference.noResults": "No matching reference files",
			"reference.instructions": "Skill instructions",
			"reference.back": "Back to skill",
			"reference.loading": "Loading reference file…",
			"reference.error": "Reference file could not be read",
			"reference.empty": "This skill has no reference files.",
			"reference.unavailable": "This skill provides no local reference directory.",
			"reference.listTruncated": "The reference directory is large; only some files are listed.",
			"reference.truncated": "This large file is shown as a truncated preview.",
			"meta.source": "Source",
			"meta.provider": "Provider",
			"meta.resources": "Resources",
			"meta.path": "Path",
			"row.userOnly": "user-only"
		};
		//#endregion
		//#region lib/types/client/mount.js
		/**
		* Source-safe lifecycle of the skill viewer browser half: registers the sidebar-foot action that
		* opens the viewer panel — the skill list with source metadata plus
		* on-demand full instructions, read from the `skillViewer` Remote over the
		* plugin's root-context connection captured at registration.
		*
		* List and body fetches cache per session (the small twin of the ui-skill
		* directory): opening the panel replays the settled snapshot locally, so
		* one session costs one list RPC. A preset switch drops that session's
		* entries (the catalog belongs to the preset); connection/reset clears
		* everything. Catalog addressing matches the slash source: continuable
		* subagent children resolve no skills locally because the RPC requires an
		* attached session.
		*/
		/** Required services before the `skillViewer` Remote mounts. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"sessions"
		];
		/**
		* Mount the plugin's own Remote namespace, since `dsh-api-remotes` lists only harness namespaces.
		* @param ctx - client root context.
		* @param contribution - generated `skillViewer` Remote definitions.
		* @returns disposer joining UI and Remote withdrawal.
		*/
		async function mountSkillViewer(ctx, contribution) {
			const disposeRemote = await ctx.remote.$mount(contribution);
			const ui = ctx.inject([
				"slots",
				"locale",
				"remote",
				"remote.skillViewer",
				"sessions"
			], registerUi);
			try {
				await ui;
			} catch (error) {
				await ui.dispose();
				await disposeRemote();
				throw error;
			}
			return async () => {
				await ui.dispose();
				await disposeRemote();
			};
		}
		function registerUi(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-skill-viewer: dictionaries");
			const controller = new SkillViewerController(ctx.remote.skillViewer, ctx.sessions);
			ctx.effect(() => () => {
				controller.dispose();
			}, "ui-skill-viewer: controller");
			const invalidate = (sessionId) => {
				controller.invalidate(sessionId);
			};
			ctx.remote.$on("agent-preset/selected", invalidate);
			ctx.on("connection/reset", () => {
				controller.invalidate();
			});
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "skill-viewer",
				locale: NS,
				inject: () => ({
					controller,
					hooks: { viewer: controller.store }
				})
			}, SkillViewerAction));
		}
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Activate the skill viewer.
		* @param ctx - client root context.
		* @returns disposer joining UI and Remote withdrawal.
		*/
		async function apply(ctx) {
			return await mountSkillViewer(ctx, TYPERT_REMOTE);
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map