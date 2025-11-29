import type { DepsGraph, IStorage, SymbolIndex } from "../../domain/services/IStorage.js"
import type { FileAST } from "../../domain/value-objects/FileAST.js"
import type { FileData } from "../../domain/value-objects/FileData.js"
import type { FileMeta } from "../../domain/value-objects/FileMeta.js"
import { IpuaroError } from "../../shared/errors/IpuaroError.js"
import { RedisClient } from "./RedisClient.js"
import { IndexFields, ProjectKeys } from "./schema.js"

/**
 * Redis implementation of IStorage.
 * Stores project data (files, AST, meta, indexes) in Redis hashes.
 */
export class RedisStorage implements IStorage {
    private readonly client: RedisClient
    private readonly projectName: string

    constructor(client: RedisClient, projectName: string) {
        this.client = client
        this.projectName = projectName
    }

    async getFile(path: string): Promise<FileData | null> {
        const redis = this.getRedis()
        const data = await redis.hget(ProjectKeys.files(this.projectName), path)
        if (!data) {
            return null
        }
        return this.parseJSON(data, "FileData") as FileData
    }

    async setFile(path: string, data: FileData): Promise<void> {
        const redis = this.getRedis()
        await redis.hset(ProjectKeys.files(this.projectName), path, JSON.stringify(data))
    }

    async deleteFile(path: string): Promise<void> {
        const redis = this.getRedis()
        await redis.hdel(ProjectKeys.files(this.projectName), path)
    }

    async getAllFiles(): Promise<Map<string, FileData>> {
        const redis = this.getRedis()
        const data = await redis.hgetall(ProjectKeys.files(this.projectName))
        const result = new Map<string, FileData>()

        for (const [path, value] of Object.entries(data)) {
            const parsed = this.parseJSON(value, "FileData") as FileData | null
            if (parsed) {
                result.set(path, parsed)
            }
        }

        return result
    }

    async getFileCount(): Promise<number> {
        const redis = this.getRedis()
        return redis.hlen(ProjectKeys.files(this.projectName))
    }

    async getAST(path: string): Promise<FileAST | null> {
        const redis = this.getRedis()
        const data = await redis.hget(ProjectKeys.ast(this.projectName), path)
        if (!data) {
            return null
        }
        return this.parseJSON(data, "FileAST") as FileAST
    }

    async setAST(path: string, ast: FileAST): Promise<void> {
        const redis = this.getRedis()
        await redis.hset(ProjectKeys.ast(this.projectName), path, JSON.stringify(ast))
    }

    async deleteAST(path: string): Promise<void> {
        const redis = this.getRedis()
        await redis.hdel(ProjectKeys.ast(this.projectName), path)
    }

    async getAllASTs(): Promise<Map<string, FileAST>> {
        const redis = this.getRedis()
        const data = await redis.hgetall(ProjectKeys.ast(this.projectName))
        const result = new Map<string, FileAST>()

        for (const [path, value] of Object.entries(data)) {
            const parsed = this.parseJSON(value, "FileAST") as FileAST | null
            if (parsed) {
                result.set(path, parsed)
            }
        }

        return result
    }

    async getMeta(path: string): Promise<FileMeta | null> {
        const redis = this.getRedis()
        const data = await redis.hget(ProjectKeys.meta(this.projectName), path)
        if (!data) {
            return null
        }
        return this.parseJSON(data, "FileMeta") as FileMeta
    }

    async setMeta(path: string, meta: FileMeta): Promise<void> {
        const redis = this.getRedis()
        await redis.hset(ProjectKeys.meta(this.projectName), path, JSON.stringify(meta))
    }

    async deleteMeta(path: string): Promise<void> {
        const redis = this.getRedis()
        await redis.hdel(ProjectKeys.meta(this.projectName), path)
    }

    async getAllMetas(): Promise<Map<string, FileMeta>> {
        const redis = this.getRedis()
        const data = await redis.hgetall(ProjectKeys.meta(this.projectName))
        const result = new Map<string, FileMeta>()

        for (const [path, value] of Object.entries(data)) {
            const parsed = this.parseJSON(value, "FileMeta") as FileMeta | null
            if (parsed) {
                result.set(path, parsed)
            }
        }

        return result
    }

    async getSymbolIndex(): Promise<SymbolIndex> {
        const redis = this.getRedis()
        const data = await redis.hget(ProjectKeys.indexes(this.projectName), IndexFields.symbols)
        if (!data) {
            return new Map()
        }

        const parsed = this.parseJSON(data, "SymbolIndex") as [string, unknown[]][] | null
        if (!parsed) {
            return new Map()
        }

        return new Map(parsed) as SymbolIndex
    }

    async setSymbolIndex(index: SymbolIndex): Promise<void> {
        const redis = this.getRedis()
        const serialized = JSON.stringify([...index.entries()])
        await redis.hset(ProjectKeys.indexes(this.projectName), IndexFields.symbols, serialized)
    }

    async getDepsGraph(): Promise<DepsGraph> {
        const redis = this.getRedis()
        const data = await redis.hget(ProjectKeys.indexes(this.projectName), IndexFields.depsGraph)
        if (!data) {
            return {
                imports: new Map(),
                importedBy: new Map(),
            }
        }

        const parsed = this.parseJSON(data, "DepsGraph") as {
            imports: [string, string[]][]
            importedBy: [string, string[]][]
        } | null

        if (!parsed) {
            return {
                imports: new Map(),
                importedBy: new Map(),
            }
        }

        return {
            imports: new Map(parsed.imports),
            importedBy: new Map(parsed.importedBy),
        }
    }

    async setDepsGraph(graph: DepsGraph): Promise<void> {
        const redis = this.getRedis()
        const serialized = JSON.stringify({
            imports: [...graph.imports.entries()],
            importedBy: [...graph.importedBy.entries()],
        })
        await redis.hset(ProjectKeys.indexes(this.projectName), IndexFields.depsGraph, serialized)
    }

    async getProjectConfig(key: string): Promise<unknown> {
        const redis = this.getRedis()
        const data = await redis.hget(ProjectKeys.config(this.projectName), key)
        if (!data) {
            return null
        }
        return this.parseJSON(data, "ProjectConfig")
    }

    async setProjectConfig(key: string, value: unknown): Promise<void> {
        const redis = this.getRedis()
        await redis.hset(ProjectKeys.config(this.projectName), key, JSON.stringify(value))
    }

    async connect(): Promise<void> {
        await this.client.connect()
    }

    async disconnect(): Promise<void> {
        await this.client.disconnect()
    }

    isConnected(): boolean {
        return this.client.isConnected()
    }

    async clear(): Promise<void> {
        const redis = this.getRedis()
        await Promise.all([
            redis.del(ProjectKeys.files(this.projectName)),
            redis.del(ProjectKeys.ast(this.projectName)),
            redis.del(ProjectKeys.meta(this.projectName)),
            redis.del(ProjectKeys.indexes(this.projectName)),
            redis.del(ProjectKeys.config(this.projectName)),
        ])
    }

    private getRedis(): ReturnType<RedisClient["getClient"]> {
        return this.client.getClient()
    }

    private parseJSON(data: string, type: string): unknown {
        try {
            return JSON.parse(data) as unknown
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error"
            throw IpuaroError.parse(`Failed to parse ${type}: ${message}`)
        }
    }
}
