#!/usr/bin/env node

import { Command } from "commander"

const program = new Command()

program
    .name("ipuaro")
    .description("Local AI agent for codebase operations with infinite context feeling")
    .version("0.1.0")

program
    .command("start")
    .description("Start ipuaro TUI in the current directory")
    .argument("[path]", "Project path", ".")
    .option("--auto-apply", "Enable auto-apply mode for edits")
    .option("--model <name>", "Override LLM model", "qwen2.5-coder:7b-instruct")
    .action((path: string, options: { autoApply?: boolean; model?: string }) => {
        const model = options.model ?? "default"
        const autoApply = options.autoApply ?? false
        console.warn(`Starting ipuaro in ${path}...`)
        console.warn(`Model: ${model}`)
        console.warn(`Auto-apply: ${autoApply ? "enabled" : "disabled"}`)
        console.warn("\nNot implemented yet. Coming in version 0.11.0!")
    })

program
    .command("init")
    .description("Create .ipuaro.json config file")
    .action(() => {
        console.warn("Creating .ipuaro.json...")
        console.warn("\nNot implemented yet. Coming in version 0.17.0!")
    })

program
    .command("index")
    .description("Index project without starting TUI")
    .argument("[path]", "Project path", ".")
    .action((path: string) => {
        console.warn(`Indexing ${path}...`)
        console.warn("\nNot implemented yet. Coming in version 0.3.0!")
    })

program.parse()
