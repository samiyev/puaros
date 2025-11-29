import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { RedisConfig } from "../../../../src/shared/constants/config.js"
import { IpuaroError } from "../../../../src/shared/errors/IpuaroError.js"

const mockRedisInstance = {
    connect: vi.fn(),
    quit: vi.fn(),
    ping: vi.fn(),
    config: vi.fn(),
    status: "ready" as string,
}

vi.mock("ioredis", () => {
    return {
        Redis: vi.fn(() => mockRedisInstance),
    }
})

const { RedisClient } = await import("../../../../src/infrastructure/storage/RedisClient.js")

describe("RedisClient", () => {
    const defaultConfig: RedisConfig = {
        host: "localhost",
        port: 6379,
        db: 0,
        keyPrefix: "ipuaro:",
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockRedisInstance.status = "ready"
        mockRedisInstance.connect.mockResolvedValue(undefined)
        mockRedisInstance.quit.mockResolvedValue(undefined)
        mockRedisInstance.ping.mockResolvedValue("PONG")
        mockRedisInstance.config.mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe("constructor", () => {
        it("should create instance with config", () => {
            const client = new RedisClient(defaultConfig)
            expect(client).toBeDefined()
            expect(client.isConnected()).toBe(false)
        })
    })

    describe("connect", () => {
        it("should connect to Redis", async () => {
            const client = new RedisClient(defaultConfig)
            await client.connect()

            expect(mockRedisInstance.connect).toHaveBeenCalled()
            expect(client.isConnected()).toBe(true)
        })

        it("should configure AOF on connect", async () => {
            const client = new RedisClient(defaultConfig)
            await client.connect()

            expect(mockRedisInstance.config).toHaveBeenCalledWith("SET", "appendonly", "yes")
            expect(mockRedisInstance.config).toHaveBeenCalledWith("SET", "appendfsync", "everysec")
        })

        it("should not reconnect if already connected", async () => {
            const client = new RedisClient(defaultConfig)
            await client.connect()
            await client.connect()

            expect(mockRedisInstance.connect).toHaveBeenCalledTimes(1)
        })

        it("should throw IpuaroError on connection failure", async () => {
            mockRedisInstance.connect.mockRejectedValue(new Error("Connection refused"))

            const client = new RedisClient(defaultConfig)

            await expect(client.connect()).rejects.toThrow(IpuaroError)
            await expect(client.connect()).rejects.toMatchObject({
                type: "redis",
            })
        })

        it("should handle AOF config failure gracefully", async () => {
            mockRedisInstance.config.mockRejectedValue(new Error("CONFIG disabled"))

            const client = new RedisClient(defaultConfig)
            await client.connect()

            expect(client.isConnected()).toBe(true)
        })
    })

    describe("disconnect", () => {
        it("should disconnect from Redis", async () => {
            const client = new RedisClient(defaultConfig)
            await client.connect()
            await client.disconnect()

            expect(mockRedisInstance.quit).toHaveBeenCalled()
            expect(client.isConnected()).toBe(false)
        })

        it("should handle disconnect when not connected", async () => {
            const client = new RedisClient(defaultConfig)
            await client.disconnect()

            expect(mockRedisInstance.quit).not.toHaveBeenCalled()
        })
    })

    describe("isConnected", () => {
        it("should return false when not connected", () => {
            const client = new RedisClient(defaultConfig)
            expect(client.isConnected()).toBe(false)
        })

        it("should return true when connected and ready", async () => {
            const client = new RedisClient(defaultConfig)
            await client.connect()
            expect(client.isConnected()).toBe(true)
        })

        it("should return false when client status is not ready", async () => {
            const client = new RedisClient(defaultConfig)
            await client.connect()
            mockRedisInstance.status = "connecting"
            expect(client.isConnected()).toBe(false)
        })
    })

    describe("getClient", () => {
        it("should return Redis client when connected", async () => {
            const client = new RedisClient(defaultConfig)
            await client.connect()

            const redis = client.getClient()
            expect(redis).toBe(mockRedisInstance)
        })

        it("should throw when not connected", () => {
            const client = new RedisClient(defaultConfig)

            expect(() => client.getClient()).toThrow(IpuaroError)
            expect(() => client.getClient()).toThrow("not connected")
        })
    })

    describe("ping", () => {
        it("should return true on successful ping", async () => {
            const client = new RedisClient(defaultConfig)
            await client.connect()

            const result = await client.ping()
            expect(result).toBe(true)
        })

        it("should return false when not connected", async () => {
            const client = new RedisClient(defaultConfig)

            const result = await client.ping()
            expect(result).toBe(false)
        })

        it("should return false on ping failure", async () => {
            mockRedisInstance.ping.mockRejectedValue(new Error("Timeout"))

            const client = new RedisClient(defaultConfig)
            await client.connect()

            const result = await client.ping()
            expect(result).toBe(false)
        })
    })
})
