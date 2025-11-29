/**
 * @puaros/ipuaro - Local AI agent for codebase operations
 *
 * Main entry point for the library.
 */

import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pkg = require("../package.json") as { version: string }

// Domain exports
export * from "./domain/index.js"

// Application exports
export * from "./application/index.js"

// Shared exports
export * from "./shared/index.js"

// Infrastructure exports
export * from "./infrastructure/index.js"

// Version
export const VERSION = pkg.version
