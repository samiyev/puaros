import { ValueObject } from "./ValueObject"
import { SECRET_VIOLATION_MESSAGES } from "../constants/Messages"
import { SEVERITY_LEVELS } from "../../shared/constants"
import { FILE_ENCODING, SECRET_EXAMPLE_VALUES, SECRET_KEYWORDS } from "../constants/SecretExamples"

interface SecretViolationProps {
    readonly file: string
    readonly line: number
    readonly column: number
    readonly secretType: string
    readonly matchedPattern: string
}

/**
 * Represents a secret exposure violation in the codebase
 *
 * Secret violations occur when sensitive data like API keys, tokens, passwords,
 * or credentials are hardcoded in the source code instead of being stored
 * in secure environment variables or secret management systems.
 *
 * All secret violations are marked as CRITICAL severity because they represent
 * serious security risks that could lead to unauthorized access, data breaches,
 * or service compromise.
 *
 * @example
 * ```typescript
 * const violation = SecretViolation.create(
 *     'src/config/aws.ts',
 *     10,
 *     15,
 *     'AWS Access Key',
 *     'AKIA1234567890ABCDEF'
 * )
 *
 * console.log(violation.getMessage())
 * // "Hardcoded AWS Access Key detected"
 *
 * console.log(violation.getSeverity())
 * // "critical"
 * ```
 */
export class SecretViolation extends ValueObject<SecretViolationProps> {
    private constructor(props: SecretViolationProps) {
        super(props)
    }

    public static create(
        file: string,
        line: number,
        column: number,
        secretType: string,
        matchedPattern: string,
    ): SecretViolation {
        return new SecretViolation({
            file,
            line,
            column,
            secretType,
            matchedPattern,
        })
    }

    public get file(): string {
        return this.props.file
    }

    public get line(): number {
        return this.props.line
    }

    public get column(): number {
        return this.props.column
    }

    public get secretType(): string {
        return this.props.secretType
    }

    public get matchedPattern(): string {
        return this.props.matchedPattern
    }

    public getMessage(): string {
        return `Hardcoded ${this.props.secretType} detected`
    }

    public getSuggestion(): string {
        const suggestions: string[] = [
            SECRET_VIOLATION_MESSAGES.USE_ENV_VARIABLES,
            SECRET_VIOLATION_MESSAGES.USE_SECRET_MANAGER,
            SECRET_VIOLATION_MESSAGES.NEVER_COMMIT_SECRETS,
            SECRET_VIOLATION_MESSAGES.ROTATE_IF_EXPOSED,
            SECRET_VIOLATION_MESSAGES.USE_GITIGNORE,
        ]

        return suggestions.join("\n")
    }

    public getExampleFix(): string {
        return this.getExampleFixForSecretType(this.props.secretType)
    }

    public getSeverity(): typeof SEVERITY_LEVELS.CRITICAL {
        return SEVERITY_LEVELS.CRITICAL
    }

    private getExampleFixForSecretType(secretType: string): string {
        const lowerType = secretType.toLowerCase()

        if (lowerType.includes(SECRET_KEYWORDS.AWS)) {
            return `
// ❌ Bad: Hardcoded AWS credentials
const AWS_ACCESS_KEY_ID = "${SECRET_EXAMPLE_VALUES.AWS_ACCESS_KEY_ID}"
const AWS_SECRET_ACCESS_KEY = "${SECRET_EXAMPLE_VALUES.AWS_SECRET_ACCESS_KEY}"

// ✅ Good: Use environment variables
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY

// ✅ Good: Use credentials provider (in infrastructure layer)
// Load credentials from environment or credentials file`
        }

        if (lowerType.includes(SECRET_KEYWORDS.GITHUB)) {
            return `
// ❌ Bad: Hardcoded GitHub token
const GITHUB_TOKEN = "${SECRET_EXAMPLE_VALUES.GITHUB_TOKEN}"

// ✅ Good: Use environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// ✅ Good: GitHub Apps with temporary tokens
// Use GitHub Apps for automated workflows instead of personal access tokens`
        }

        if (lowerType.includes(SECRET_KEYWORDS.NPM)) {
            return `
// ❌ Bad: Hardcoded NPM token in code
const NPM_TOKEN = "${SECRET_EXAMPLE_VALUES.NPM_TOKEN}"

// ✅ Good: Use .npmrc file (add to .gitignore)
// .npmrc
//registry.npmjs.org/:_authToken=\${NPM_TOKEN}

// ✅ Good: Use environment variable
const NPM_TOKEN = process.env.NPM_TOKEN`
        }

        if (
            lowerType.includes(SECRET_KEYWORDS.SSH) ||
            lowerType.includes(SECRET_KEYWORDS.PRIVATE_KEY)
        ) {
            return `
// ❌ Bad: Hardcoded SSH private key
const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...\`

// ✅ Good: Load from secure file (not in repository)
import fs from "fs"
const privateKey = fs.readFileSync(process.env.SSH_KEY_PATH, "${FILE_ENCODING.UTF8}")

// ✅ Good: Use SSH agent
// Configure SSH agent to handle keys securely`
        }

        if (lowerType.includes(SECRET_KEYWORDS.SLACK)) {
            return `
// ❌ Bad: Hardcoded Slack token
const SLACK_TOKEN = "${SECRET_EXAMPLE_VALUES.SLACK_TOKEN}"

// ✅ Good: Use environment variables
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN

// ✅ Good: Use OAuth flow for user tokens
// Implement OAuth 2.0 flow instead of hardcoding tokens`
        }

        if (
            lowerType.includes(SECRET_KEYWORDS.API_KEY) ||
            lowerType.includes(SECRET_KEYWORDS.APIKEY)
        ) {
            return `
// ❌ Bad: Hardcoded API key
const API_KEY = "${SECRET_EXAMPLE_VALUES.API_KEY}"

// ✅ Good: Use environment variables
const API_KEY = process.env.API_KEY

// ✅ Good: Use secret management service (in infrastructure layer)
// AWS Secrets Manager, HashiCorp Vault, Azure Key Vault
// Implement secret retrieval in infrastructure and inject via DI`
        }

        return `
// ❌ Bad: Hardcoded secret
const SECRET = "${SECRET_EXAMPLE_VALUES.HARDCODED_SECRET}"

// ✅ Good: Use environment variables
const SECRET = process.env.SECRET_KEY

// ✅ Good: Use secret management
// AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, etc.`
    }
}
