import { describe, it, expect } from "vitest"
import { SecretViolation } from "../../../src/domain/value-objects/SecretViolation"

describe("SecretViolation", () => {
    describe("create", () => {
        it("should create a secret violation with all properties", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "AKIA1234567890ABCDEF",
            )

            expect(violation.file).toBe("src/config/aws.ts")
            expect(violation.line).toBe(10)
            expect(violation.column).toBe(15)
            expect(violation.secretType).toBe("AWS Access Key")
            expect(violation.matchedPattern).toBe("AKIA1234567890ABCDEF")
        })

        it("should create a secret violation with GitHub token", () => {
            const violation = SecretViolation.create(
                "src/config/github.ts",
                5,
                20,
                "GitHub Personal Access Token",
                "ghp_1234567890abcdefghijklmnopqrstuv",
            )

            expect(violation.secretType).toBe("GitHub Personal Access Token")
            expect(violation.file).toBe("src/config/github.ts")
        })

        it("should create a secret violation with NPM token", () => {
            const violation = SecretViolation.create(".npmrc", 1, 1, "NPM Token", "npm_abc123xyz")

            expect(violation.secretType).toBe("NPM Token")
        })
    })

    describe("getters", () => {
        it("should return file path", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            expect(violation.file).toBe("src/config/aws.ts")
        })

        it("should return line number", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            expect(violation.line).toBe(10)
        })

        it("should return column number", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            expect(violation.column).toBe(15)
        })

        it("should return secret type", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            expect(violation.secretType).toBe("AWS Access Key")
        })

        it("should return matched pattern", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "AKIA1234567890ABCDEF",
            )

            expect(violation.matchedPattern).toBe("AKIA1234567890ABCDEF")
        })
    })

    describe("getMessage", () => {
        it("should return formatted message for AWS Access Key", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            expect(violation.getMessage()).toBe("Hardcoded AWS Access Key detected")
        })

        it("should return formatted message for GitHub token", () => {
            const violation = SecretViolation.create(
                "src/config/github.ts",
                5,
                20,
                "GitHub Token",
                "test",
            )

            expect(violation.getMessage()).toBe("Hardcoded GitHub Token detected")
        })

        it("should return formatted message for NPM token", () => {
            const violation = SecretViolation.create(".npmrc", 1, 1, "NPM Token", "test")

            expect(violation.getMessage()).toBe("Hardcoded NPM Token detected")
        })
    })

    describe("getSuggestion", () => {
        it("should return multi-line suggestion", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            const suggestion = violation.getSuggestion()

            expect(suggestion).toContain("1. Use environment variables")
            expect(suggestion).toContain("2. Use secret management services")
            expect(suggestion).toContain("3. Never commit secrets")
            expect(suggestion).toContain("4. If secret was committed, rotate it immediately")
            expect(suggestion).toContain("5. Add secret files to .gitignore")
        })

        it("should return the same suggestion for all secret types", () => {
            const awsViolation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            const githubViolation = SecretViolation.create(
                "src/config/github.ts",
                5,
                20,
                "GitHub Token",
                "test",
            )

            expect(awsViolation.getSuggestion()).toBe(githubViolation.getSuggestion())
        })
    })

    describe("getExampleFix", () => {
        it("should return AWS-specific example for AWS Access Key", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            const example = violation.getExampleFix()

            expect(example).toContain("AWS")
            expect(example).toContain("process.env.AWS_ACCESS_KEY_ID")
            expect(example).toContain("credentials provider")
        })

        it("should return GitHub-specific example for GitHub token", () => {
            const violation = SecretViolation.create(
                "src/config/github.ts",
                5,
                20,
                "GitHub Token",
                "test",
            )

            const example = violation.getExampleFix()

            expect(example).toContain("GitHub")
            expect(example).toContain("process.env.GITHUB_TOKEN")
            expect(example).toContain("GitHub Apps")
        })

        it("should return NPM-specific example for NPM token", () => {
            const violation = SecretViolation.create(".npmrc", 1, 1, "NPM Token", "test")

            const example = violation.getExampleFix()

            expect(example).toContain("NPM")
            expect(example).toContain(".npmrc")
            expect(example).toContain("process.env.NPM_TOKEN")
        })

        it("should return SSH-specific example for SSH Private Key", () => {
            const violation = SecretViolation.create(
                "src/config/ssh.ts",
                1,
                1,
                "SSH Private Key",
                "test",
            )

            const example = violation.getExampleFix()

            expect(example).toContain("SSH")
            expect(example).toContain("readFileSync")
            expect(example).toContain("SSH_KEY_PATH")
        })

        it("should return SSH RSA-specific example for SSH RSA Private Key", () => {
            const violation = SecretViolation.create(
                "src/config/ssh.ts",
                1,
                1,
                "SSH RSA Private Key",
                "test",
            )

            const example = violation.getExampleFix()

            expect(example).toContain("SSH")
            expect(example).toContain("RSA PRIVATE KEY")
        })

        it("should return Slack-specific example for Slack token", () => {
            const violation = SecretViolation.create(
                "src/config/slack.ts",
                1,
                1,
                "Slack Bot Token",
                "test",
            )

            const example = violation.getExampleFix()

            expect(example).toContain("Slack")
            expect(example).toContain("process.env.SLACK_BOT_TOKEN")
        })

        it("should return API Key example for generic API key", () => {
            const violation = SecretViolation.create("src/config/api.ts", 1, 1, "API Key", "test")

            const example = violation.getExampleFix()

            expect(example).toContain("API")
            expect(example).toContain("process.env.API_KEY")
            expect(example).toContain("secret management service")
        })

        it("should return generic example for unknown secret type", () => {
            const violation = SecretViolation.create(
                "src/config/unknown.ts",
                1,
                1,
                "Unknown Secret",
                "test",
            )

            const example = violation.getExampleFix()

            expect(example).toContain("process.env.SECRET_KEY")
            expect(example).toContain("secret management")
        })
    })

    describe("getSeverity", () => {
        it("should always return critical severity", () => {
            const violation = SecretViolation.create(
                "src/config/aws.ts",
                10,
                15,
                "AWS Access Key",
                "test",
            )

            expect(violation.getSeverity()).toBe("critical")
        })

        it("should return critical severity for all secret types", () => {
            const types = [
                "AWS Access Key",
                "GitHub Token",
                "NPM Token",
                "SSH Private Key",
                "Slack Token",
                "API Key",
            ]

            types.forEach((type) => {
                const violation = SecretViolation.create("test.ts", 1, 1, type, "test")
                expect(violation.getSeverity()).toBe("critical")
            })
        })
    })
})
