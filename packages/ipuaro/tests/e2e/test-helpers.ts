/**
 * E2E Test Helpers
 * Provides dependencies for testing the full flow with REAL LLM.
 */

import { vi } from "vitest"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"
import type { IStorage, SymbolIndex, DepsGraph } from "../../src/domain/services/IStorage.js"
import type { ISessionStorage, SessionListItem } from "../../src/domain/services/ISessionStorage.js"
import type { FileData } from "../../src/domain/value-objects/FileData.js"
import type { FileAST } from "../../src/domain/value-objects/FileAST.js"
import type { FileMeta } from "../../src/domain/value-objects/FileMeta.js"
import type { UndoEntry } from "../../src/domain/value-objects/UndoEntry.js"
import { Session } from "../../src/domain/entities/Session.js"
import { ToolRegistry } from "../../src/infrastructure/tools/registry.js"
import { OllamaClient } from "../../src/infrastructure/llm/OllamaClient.js"
import { registerAllTools } from "../../src/cli/commands/tools-setup.js"
import type { LLMConfig } from "../../src/shared/constants/config.js"

/**
 * Default LLM config for tests.
 */
export const DEFAULT_TEST_LLM_CONFIG: LLMConfig = {
    model: "qwen2.5-coder:14b-instruct-q4_K_M",
    contextWindow: 128_000,
    temperature: 0.1,
    host: "http://localhost:11434",
    timeout: 180_000,
    useNativeTools: true,
}

/**
 * In-memory storage implementation for testing.
 * Stores all data in Maps, no Redis required.
 */
export function createInMemoryStorage(): IStorage {
    const files = new Map<string, FileData>()
    const asts = new Map<string, FileAST>()
    const metas = new Map<string, FileMeta>()
    let symbolIndex: SymbolIndex = new Map()
    let depsGraph: DepsGraph = { imports: new Map(), importedBy: new Map() }
    const projectConfig = new Map<string, unknown>()
    let connected = false

    return {
        getFile: vi.fn(async (filePath: string) => files.get(filePath) ?? null),
        setFile: vi.fn(async (filePath: string, data: FileData) => {
            files.set(filePath, data)
        }),
        deleteFile: vi.fn(async (filePath: string) => {
            files.delete(filePath)
        }),
        getAllFiles: vi.fn(async () => new Map(files)),
        getFileCount: vi.fn(async () => files.size),

        getAST: vi.fn(async (filePath: string) => asts.get(filePath) ?? null),
        setAST: vi.fn(async (filePath: string, ast: FileAST) => {
            asts.set(filePath, ast)
        }),
        deleteAST: vi.fn(async (filePath: string) => {
            asts.delete(filePath)
        }),
        getAllASTs: vi.fn(async () => new Map(asts)),

        getMeta: vi.fn(async (filePath: string) => metas.get(filePath) ?? null),
        setMeta: vi.fn(async (filePath: string, meta: FileMeta) => {
            metas.set(filePath, meta)
        }),
        deleteMeta: vi.fn(async (filePath: string) => {
            metas.delete(filePath)
        }),
        getAllMetas: vi.fn(async () => new Map(metas)),

        getSymbolIndex: vi.fn(async () => symbolIndex),
        setSymbolIndex: vi.fn(async (index: SymbolIndex) => {
            symbolIndex = index
        }),
        getDepsGraph: vi.fn(async () => depsGraph),
        setDepsGraph: vi.fn(async (graph: DepsGraph) => {
            depsGraph = graph
        }),

        getProjectConfig: vi.fn(async (key: string) => projectConfig.get(key) ?? null),
        setProjectConfig: vi.fn(async (key: string, value: unknown) => {
            projectConfig.set(key, value)
        }),

        connect: vi.fn(async () => {
            connected = true
        }),
        disconnect: vi.fn(async () => {
            connected = false
        }),
        isConnected: vi.fn(() => connected),
        clear: vi.fn(async () => {
            files.clear()
            asts.clear()
            metas.clear()
            symbolIndex = new Map()
            depsGraph = { imports: new Map(), importedBy: new Map() }
            projectConfig.clear()
        }),
    }
}

/**
 * In-memory session storage for testing.
 */
export function createInMemorySessionStorage(): ISessionStorage {
    const sessions = new Map<string, Session>()
    const undoStacks = new Map<string, UndoEntry[]>()

    return {
        saveSession: vi.fn(async (session: Session) => {
            sessions.set(session.id, session)
        }),
        loadSession: vi.fn(async (sessionId: string) => sessions.get(sessionId) ?? null),
        deleteSession: vi.fn(async (sessionId: string) => {
            sessions.delete(sessionId)
            undoStacks.delete(sessionId)
        }),
        listSessions: vi.fn(async (projectName?: string): Promise<SessionListItem[]> => {
            const items: SessionListItem[] = []
            for (const session of sessions.values()) {
                if (!projectName || session.projectName === projectName) {
                    items.push({
                        id: session.id,
                        projectName: session.projectName,
                        createdAt: session.createdAt,
                        lastActivityAt: session.lastActivityAt,
                        messageCount: session.history.length,
                    })
                }
            }
            return items
        }),
        getLatestSession: vi.fn(async (projectName: string) => {
            let latest: Session | null = null
            for (const session of sessions.values()) {
                if (session.projectName === projectName) {
                    if (!latest || session.lastActivityAt > latest.lastActivityAt) {
                        latest = session
                    }
                }
            }
            return latest
        }),
        sessionExists: vi.fn(async (sessionId: string) => sessions.has(sessionId)),
        pushUndoEntry: vi.fn(async (sessionId: string, entry: UndoEntry) => {
            const stack = undoStacks.get(sessionId) ?? []
            stack.push(entry)
            undoStacks.set(sessionId, stack)
        }),
        popUndoEntry: vi.fn(async (sessionId: string) => {
            const stack = undoStacks.get(sessionId) ?? []
            return stack.pop() ?? null
        }),
        getUndoStack: vi.fn(async (sessionId: string) => undoStacks.get(sessionId) ?? []),
        touchSession: vi.fn(async (sessionId: string) => {
            const session = sessions.get(sessionId)
            if (session) {
                session.lastActivityAt = Date.now()
            }
        }),
        clearAllSessions: vi.fn(async () => {
            sessions.clear()
            undoStacks.clear()
        }),
    }
}

/**
 * Create REAL Ollama client for E2E tests.
 */
export function createRealOllamaClient(config?: Partial<LLMConfig>): OllamaClient {
    return new OllamaClient({
        ...DEFAULT_TEST_LLM_CONFIG,
        ...config,
    })
}

/**
 * Create a tool registry with all 18 tools registered.
 */
export function createRealToolRegistry(): ToolRegistry {
    const registry = new ToolRegistry()
    registerAllTools(registry)
    return registry
}

/**
 * Create a new test session.
 */
export function createTestSession(projectName = "test-project"): Session {
    return new Session(`test-${Date.now()}`, projectName)
}

/**
 * Create a temporary test project directory with sample files.
 */
export async function createTestProject(): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ipuaro-e2e-"))

    await fs.mkdir(path.join(tempDir, "src"), { recursive: true })

    await fs.writeFile(
        path.join(tempDir, "src", "index.ts"),
        `/**
 * Main entry point
 */
export function main(): void {
    console.log("Hello, world!")
}

export function add(a: number, b: number): number {
    return a + b
}

export function multiply(a: number, b: number): number {
    return a * b
}

// TODO: Add more math functions
main()
`,
    )

    await fs.writeFile(
        path.join(tempDir, "src", "utils.ts"),
        `/**
 * Utility functions
 */
import { add } from "./index.js"

export function sum(numbers: number[]): number {
    return numbers.reduce((acc, n) => add(acc, n), 0)
}

export class Calculator {
    private result: number = 0

    add(n: number): this {
        this.result += n
        return this
    }

    subtract(n: number): this {
        this.result -= n
        return this
    }

    getResult(): number {
        return this.result
    }

    reset(): void {
        this.result = 0
    }
}

// FIXME: Handle edge cases for negative numbers
`,
    )

    await fs.writeFile(
        path.join(tempDir, "package.json"),
        JSON.stringify(
            {
                name: "test-project",
                version: "1.0.0",
                type: "module",
                scripts: {
                    test: "echo 'Tests passed!'",
                },
            },
            null,
            4,
        ),
    )

    await fs.writeFile(
        path.join(tempDir, "README.md"),
        `# Test Project

A sample project for E2E testing.

## Features
- Basic math functions
- Calculator class
`,
    )

    return tempDir
}

/**
 * Clean up test project directory.
 */
export async function cleanupTestProject(projectDir: string): Promise<void> {
    await fs.rm(projectDir, { recursive: true, force: true })
}

/**
 * All test dependencies bundled together.
 */
export interface E2ETestDependencies {
    storage: IStorage
    sessionStorage: ISessionStorage
    llm: OllamaClient
    tools: ToolRegistry
    session: Session
    projectRoot: string
}

/**
 * Create all dependencies for E2E testing with REAL Ollama.
 */
export async function createE2ETestDependencies(
    llmConfig?: Partial<LLMConfig>,
): Promise<E2ETestDependencies> {
    const projectRoot = await createTestProject()

    return {
        storage: createInMemoryStorage(),
        sessionStorage: createInMemorySessionStorage(),
        llm: createRealOllamaClient(llmConfig),
        tools: createRealToolRegistry(),
        session: createTestSession(),
        projectRoot,
    }
}

/**
 * Check if Ollama is available.
 */
export async function isOllamaAvailable(): Promise<boolean> {
    const client = createRealOllamaClient()
    return client.isAvailable()
}

/**
 * Check if required model is available.
 */
export async function isModelAvailable(
    model = "qwen2.5-coder:14b-instruct-q4_K_M",
): Promise<boolean> {
    const client = createRealOllamaClient()
    return client.hasModel(model)
}
