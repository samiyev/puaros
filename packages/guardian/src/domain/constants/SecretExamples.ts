/**
 * Secret detection constants
 * All hardcoded strings related to secret detection and examples
 */

export const SECRET_KEYWORDS = {
    AWS: "aws",
    GITHUB: "github",
    NPM: "npm",
    SSH: "ssh",
    PRIVATE_KEY: "private key",
    SLACK: "slack",
    API_KEY: "api key",
    APIKEY: "apikey",
    ACCESS_KEY: "access key",
    SECRET: "secret",
    TOKEN: "token",
    PASSWORD: "password",
    USER: "user",
    BOT: "bot",
    RSA: "rsa",
    DSA: "dsa",
    ECDSA: "ecdsa",
    ED25519: "ed25519",
    BASICAUTH: "basicauth",
    GCP: "gcp",
    GOOGLE: "google",
    PRIVATEKEY: "privatekey",
    PERSONAL_ACCESS_TOKEN: "personal access token",
    OAUTH: "oauth",
} as const

export const SECRET_TYPE_NAMES = {
    AWS_ACCESS_KEY: "AWS Access Key",
    AWS_SECRET_KEY: "AWS Secret Key",
    AWS_CREDENTIAL: "AWS Credential",
    GITHUB_PERSONAL_ACCESS_TOKEN: "GitHub Personal Access Token",
    GITHUB_OAUTH_TOKEN: "GitHub OAuth Token",
    GITHUB_TOKEN: "GitHub Token",
    NPM_TOKEN: "NPM Token",
    GCP_SERVICE_ACCOUNT_KEY: "GCP Service Account Key",
    SSH_RSA_PRIVATE_KEY: "SSH RSA Private Key",
    SSH_DSA_PRIVATE_KEY: "SSH DSA Private Key",
    SSH_ECDSA_PRIVATE_KEY: "SSH ECDSA Private Key",
    SSH_ED25519_PRIVATE_KEY: "SSH Ed25519 Private Key",
    SSH_PRIVATE_KEY: "SSH Private Key",
    SLACK_BOT_TOKEN: "Slack Bot Token",
    SLACK_USER_TOKEN: "Slack User Token",
    SLACK_TOKEN: "Slack Token",
    BASIC_AUTH_CREDENTIALS: "Basic Authentication Credentials",
    API_KEY: "API Key",
    AUTHENTICATION_TOKEN: "Authentication Token",
    PASSWORD: "Password",
    SECRET: "Secret",
    SENSITIVE_DATA: "Sensitive Data",
} as const

export const SECRET_EXAMPLE_VALUES = {
    AWS_ACCESS_KEY_ID: "AKIA1234567890ABCDEF",
    AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    GITHUB_TOKEN: "ghp_1234567890abcdefghijklmnopqrstuv",
    NPM_TOKEN: "npm_abc123xyz",
    SLACK_TOKEN: "xoxb-<token-here>",
    API_KEY: "sk_live_XXXXXXXXXXXXXXXXXXXX_example_key",
    HARDCODED_SECRET: "hardcoded-secret-value",
} as const

export const FILE_ENCODING = {
    UTF8: "utf-8",
} as const

export const REGEX_ESCAPE_PATTERN = {
    DOLLAR_AMPERSAND: "\\$&",
} as const

export const DYNAMIC_IMPORT_PATTERN_PARTS = {
    QUOTE_START: '"`][^',
    QUOTE_END: "`]+['\"",
} as const
