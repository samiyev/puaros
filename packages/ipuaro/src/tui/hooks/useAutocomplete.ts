/**
 * useAutocomplete hook for file path autocomplete.
 * Provides Tab completion for file paths using Redis index.
 */

import { useCallback, useEffect, useState } from "react"
import type { IStorage } from "../../domain/services/IStorage.js"
import type { AutocompleteConfig } from "../../shared/constants/config.js"
import path from "node:path"

export interface UseAutocompleteOptions {
    storage: IStorage
    projectRoot: string
    enabled?: boolean
    maxSuggestions?: number
    config?: AutocompleteConfig
}

export interface UseAutocompleteReturn {
    suggestions: string[]
    complete: (partial: string) => string[]
    accept: (suggestion: string) => string
    reset: () => void
}

/**
 * Normalizes a path by removing leading ./ and trailing /
 */
function normalizePath(p: string): string {
    let normalized = p.trim()
    if (normalized.startsWith("./")) {
        normalized = normalized.slice(2)
    }
    if (normalized.endsWith("/") && normalized.length > 1) {
        normalized = normalized.slice(0, -1)
    }
    return normalized
}

/**
 * Calculates fuzzy match score between partial and candidate.
 * Returns 0 if no match, higher score for better matches.
 */
function fuzzyScore(partial: string, candidate: string): number {
    const partialLower = partial.toLowerCase()
    const candidateLower = candidate.toLowerCase()

    // Exact prefix match gets highest score
    if (candidateLower.startsWith(partialLower)) {
        return 1000 + (1000 - partial.length)
    }

    // Check if all characters from partial appear in order in candidate
    let partialIndex = 0
    let candidateIndex = 0
    let lastMatchIndex = -1
    let consecutiveMatches = 0

    while (partialIndex < partialLower.length && candidateIndex < candidateLower.length) {
        if (partialLower[partialIndex] === candidateLower[candidateIndex]) {
            // Bonus for consecutive matches
            if (candidateIndex === lastMatchIndex + 1) {
                consecutiveMatches++
            } else {
                consecutiveMatches = 0
            }
            lastMatchIndex = candidateIndex
            partialIndex++
        }
        candidateIndex++
    }

    // If we didn't match all characters, no match
    if (partialIndex < partialLower.length) {
        return 0
    }

    // Score based on how tight the match is
    const matchSpread = lastMatchIndex - (partialLower.length - 1)
    const score = 100 + consecutiveMatches * 10 - matchSpread

    return Math.max(0, score)
}

/**
 * Gets the common prefix of all suggestions
 */
function getCommonPrefix(suggestions: string[]): string {
    if (suggestions.length === 0) {
        return ""
    }
    if (suggestions.length === 1) {
        return suggestions[0] ?? ""
    }

    let prefix = suggestions[0] ?? ""
    for (let i = 1; i < suggestions.length; i++) {
        const current = suggestions[i] ?? ""
        let j = 0
        while (j < prefix.length && j < current.length && prefix[j] === current[j]) {
            j++
        }
        prefix = prefix.slice(0, j)
        if (prefix.length === 0) {
            break
        }
    }
    return prefix
}

export function useAutocomplete(options: UseAutocompleteOptions): UseAutocompleteReturn {
    const { storage, projectRoot, enabled, maxSuggestions, config } = options

    // Read from config if provided, otherwise use options, otherwise use defaults
    const isEnabled = config?.enabled ?? enabled ?? true
    const maxSuggestionsCount = config?.maxSuggestions ?? maxSuggestions ?? 10

    const [filePaths, setFilePaths] = useState<string[]>([])
    const [suggestions, setSuggestions] = useState<string[]>([])

    // Load file paths from storage
    useEffect(() => {
        if (!isEnabled) {
            return
        }

        const loadPaths = async (): Promise<void> => {
            try {
                const files = await storage.getAllFiles()
                const paths = Array.from(files.keys()).map((p) => {
                    // Make paths relative to project root
                    const relative = path.relative(projectRoot, p)
                    return normalizePath(relative)
                })
                setFilePaths(paths.sort())
            } catch {
                // Silently fail - autocomplete is non-critical
                setFilePaths([])
            }
        }

        loadPaths().catch(() => {
            // Ignore errors
        })
    }, [storage, projectRoot, isEnabled])

    const complete = useCallback(
        (partial: string): string[] => {
            if (!isEnabled || !partial.trim()) {
                setSuggestions([])
                return []
            }

            const normalized = normalizePath(partial)

            // Score and filter matches
            const scored = filePaths
                .map((p) => ({
                    path: p,
                    score: fuzzyScore(normalized, p),
                }))
                .filter((item) => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, maxSuggestionsCount)
                .map((item) => item.path)

            setSuggestions(scored)
            return scored
        },
        [isEnabled, filePaths, maxSuggestionsCount],
    )

    const accept = useCallback(
        (suggestion: string): string => {
            // If there's only one suggestion, complete with it
            if (suggestions.length === 1) {
                setSuggestions([])
                return suggestions[0] ?? ""
            }

            // If there are multiple suggestions, complete with common prefix
            if (suggestions.length > 1) {
                const prefix = getCommonPrefix(suggestions)
                if (prefix.length > suggestion.length) {
                    return prefix
                }
            }

            return suggestion
        },
        [suggestions],
    )

    const reset = useCallback(() => {
        setSuggestions([])
    }, [])

    return {
        suggestions,
        complete,
        accept,
        reset,
    }
}
