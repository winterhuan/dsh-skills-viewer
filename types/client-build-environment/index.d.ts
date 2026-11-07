// Copied from deepseek-harness dsh-v0.2.2-rc.1; re-sync when the DSH dependency version changes.
/** Build-time values that bundlers replace before client code reaches a browser. */
declare const process: {
  readonly env: {
    readonly NODE_ENV?: string
    readonly [name: `DSH_CLIENT_${string}`]: string | undefined
  }
}
