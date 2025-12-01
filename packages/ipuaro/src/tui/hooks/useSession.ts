/**
 * useSession hook for TUI.
 * Manages session state and message handling.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { Session } from "../../domain/entities/Session.js"
import type { ILLMClient } from "../../domain/services/ILLMClient.js"
import type { ISessionStorage } from "../../domain/services/ISessionStorage.js"
import type { IStorage } from "../../domain/services/IStorage.js"
import type { DiffInfo } from "../../domain/services/ITool.js"
import type { ChatMessage } from "../../domain/value-objects/ChatMessage.js"
import type { ErrorOption } from "../../shared/errors/IpuaroError.js"
import type { IToolRegistry } from "../../application/interfaces/IToolRegistry.js"
import {
    HandleMessage,
    type HandleMessageStatus,
} from "../../application/use-cases/HandleMessage.js"
import { StartSession } from "../../application/use-cases/StartSession.js"
import { UndoChange } from "../../application/use-cases/UndoChange.js"
import type { ConfirmationResult } from "../../application/use-cases/ExecuteTool.js"
import type { ProjectStructure } from "../../infrastructure/llm/prompts.js"
import type { TuiStatus } from "../types.js"

export interface UseSessionDependencies {
    storage: IStorage
    sessionStorage: ISessionStorage
    llm: ILLMClient
    tools: IToolRegistry
    projectRoot: string
    projectName: string
    projectStructure?: ProjectStructure
}

export interface UseSessionOptions {
    autoApply?: boolean
    onConfirmation?: (message: string, diff?: DiffInfo) => Promise<boolean | ConfirmationResult>
    onError?: (error: Error) => Promise<ErrorOption>
}

export interface UseSessionReturn {
    session: Session | null
    messages: ChatMessage[]
    status: TuiStatus
    isLoading: boolean
    error: Error | null
    sendMessage: (message: string) => Promise<void>
    undo: () => Promise<boolean>
    clearHistory: () => void
    abort: () => void
}

interface SessionRefs {
    session: Session | null
    handleMessage: HandleMessage | null
    undoChange: UndoChange | null
}

type SetStatus = React.Dispatch<React.SetStateAction<TuiStatus>>
type SetMessages = React.Dispatch<React.SetStateAction<ChatMessage[]>>

interface StateSetters {
    setMessages: SetMessages
    setStatus: SetStatus
    forceUpdate: () => void
}

function createEventHandlers(
    setters: StateSetters,
    options: UseSessionOptions,
): Parameters<HandleMessage["setEvents"]>[0] {
    return {
        onMessage: (msg) => {
            setters.setMessages((prev) => [...prev, msg])
        },
        onToolCall: () => {
            setters.setStatus("tool_call")
        },
        onToolResult: () => {
            setters.setStatus("thinking")
        },
        onConfirmation: options.onConfirmation,
        onError: options.onError,
        onStatusChange: (s: HandleMessageStatus) => {
            setters.setStatus(s)
        },
        onUndoEntry: () => {
            setters.forceUpdate()
        },
    }
}

async function initializeSession(
    deps: UseSessionDependencies,
    options: UseSessionOptions,
    refs: React.MutableRefObject<SessionRefs>,
    setters: StateSetters,
): Promise<void> {
    const startSession = new StartSession(deps.sessionStorage)
    const result = await startSession.execute(deps.projectName)
    refs.current.session = result.session
    setters.setMessages([...result.session.history])

    const handleMessage = new HandleMessage(
        deps.storage,
        deps.sessionStorage,
        deps.llm,
        deps.tools,
        deps.projectRoot,
    )
    if (deps.projectStructure) {
        handleMessage.setProjectStructure(deps.projectStructure)
    }
    handleMessage.setOptions({ autoApply: options.autoApply })
    handleMessage.setEvents(createEventHandlers(setters, options))
    refs.current.handleMessage = handleMessage
    refs.current.undoChange = new UndoChange(deps.sessionStorage, deps.storage)
    setters.forceUpdate()
}

export function useSession(
    deps: UseSessionDependencies,
    options: UseSessionOptions = {},
): UseSessionReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [status, setStatus] = useState<TuiStatus>("ready")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [, setTrigger] = useState(0)
    const refs = useRef<SessionRefs>({ session: null, handleMessage: null, undoChange: null })
    const forceUpdate = useCallback(() => {
        setTrigger((v) => v + 1)
    }, [])

    useEffect(() => {
        setIsLoading(true)
        const setters: StateSetters = { setMessages, setStatus, forceUpdate }
        initializeSession(deps, options, refs, setters)
            .then(() => {
                setError(null)
            })
            .catch((err: unknown) => {
                setError(err instanceof Error ? err : new Error(String(err)))
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [deps.projectName, forceUpdate])

    const sendMessage = useCallback(async (message: string): Promise<void> => {
        const { session, handleMessage } = refs.current
        if (!session || !handleMessage) {
            return
        }
        try {
            setStatus("thinking")
            await handleMessage.execute(session, message)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
            setStatus("error")
        }
    }, [])

    const undo = useCallback(async (): Promise<boolean> => {
        const { session, undoChange } = refs.current
        if (!session || !undoChange) {
            return false
        }
        try {
            const result = await undoChange.execute(session)
            if (result.success) {
                forceUpdate()
                return true
            }
            return false
        } catch {
            return false
        }
    }, [forceUpdate])

    const clearHistory = useCallback(() => {
        if (!refs.current.session) {
            return
        }
        refs.current.session.clearHistory()
        setMessages([])
        forceUpdate()
    }, [forceUpdate])

    const abort = useCallback(() => {
        refs.current.handleMessage?.abort()
        setStatus("ready")
    }, [])

    return {
        session: refs.current.session,
        messages,
        status,
        isLoading,
        error,
        sendMessage,
        undo,
        clearHistory,
        abort,
    }
}
