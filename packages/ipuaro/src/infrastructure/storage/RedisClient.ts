import { Redis } from "ioredis"
import type { RedisConfig } from "../../shared/constants/config.js"
import { IpuaroError } from "../../shared/errors/IpuaroError.js"

/**
 * Redis client wrapper with connection management.
 * Handles connection lifecycle and AOF configuration.
 */
export class RedisClient {
    private client: Redis | null = null
    private readonly config: RedisConfig
    private connected = false

    constructor(config: RedisConfig) {
        this.config = config
    }

    /**
     * Connect to Redis server.
     * Configures AOF persistence on successful connection.
     */
    async connect(): Promise<void> {
        if (this.connected && this.client) {
            return
        }

        try {
            this.client = new Redis({
                host: this.config.host,
                port: this.config.port,
                db: this.config.db,
                password: this.config.password,
                keyPrefix: this.config.keyPrefix,
                lazyConnect: true,
                retryStrategy: (times: number): number | null => {
                    if (times > 3) {
                        return null
                    }
                    return Math.min(times * 200, 1000)
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
            })

            await this.client.connect()
            await this.configureAOF()
            this.connected = true
        } catch (error) {
            this.connected = false
            this.client = null
            const message = error instanceof Error ? error.message : "Unknown error"
            throw IpuaroError.redis(`Failed to connect to Redis: ${message}`)
        }
    }

    /**
     * Disconnect from Redis server.
     */
    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit()
            this.client = null
            this.connected = false
        }
    }

    /**
     * Check if connected to Redis.
     */
    isConnected(): boolean {
        return this.connected && this.client !== null && this.client.status === "ready"
    }

    /**
     * Get the underlying Redis client.
     * @throws IpuaroError if not connected
     */
    getClient(): Redis {
        if (!this.client || !this.connected) {
            throw IpuaroError.redis("Redis client is not connected")
        }
        return this.client
    }

    /**
     * Execute a health check ping.
     */
    async ping(): Promise<boolean> {
        if (!this.client) {
            return false
        }
        try {
            const result = await this.client.ping()
            return result === "PONG"
        } catch {
            return false
        }
    }

    /**
     * Configure AOF (Append Only File) persistence.
     * AOF provides better durability by logging every write operation.
     */
    private async configureAOF(): Promise<void> {
        if (!this.client) {
            return
        }

        try {
            await this.client.config("SET", "appendonly", "yes")
            await this.client.config("SET", "appendfsync", "everysec")
        } catch {
            /*
             * AOF config may fail if Redis doesn't allow CONFIG SET.
             * This is non-fatal - persistence will still work with default settings.
             */
        }
    }
}
