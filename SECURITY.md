# Security Policy

## Supported Versions

Nexus is currently in active development. We recommend using the latest stable release for production environments.

| Version | Supported          |
|---------|-------------------|
| Latest  | ✅ Supported      |
| Pre-release | ⚠️ Use with caution |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email security details to: **security@nexus-ai.dev**
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: Within 48 hours, you will receive acknowledgment of your report
- **Timeline**: We aim to provide initial assessment within 7 days
- **Updates**: You will receive updates on the progress of resolving the vulnerability
- **Credit**: With your permission, we will acknowledge your contribution in the security advisory

## Security Principles

### Local-First Security

Nexus is designed to run entirely locally, meaning:

- **No data leaves your machine** by default
- **You control your data** and model access
- **No cloud dependencies** for core functionality

### Sandboxed Execution

Tool execution occurs in isolated environments:

- Filesystem operations are scoped to designated directories
- Network access can be restricted
- Code execution uses sandboxed processes

### Best Practices

When using Nexus, follow these security guidelines:

1. **Environment Variables** — Never commit secrets to version control
2. **File Permissions** — Restrict access to sensitive data directories
3. **Model Sources** — Only use trusted model providers
4. **Network Access** — Limit external connections when possible
5. **Updates** — Keep Nexus updated to receive security patches

## Security Architecture

### Defense Layers

| Layer | Protection |
|-------|------------|
| 🔒 **Authentication** | JWT tokens with secure HTTP-only cookies |
| 🛡️ **Input Validation** | Strict schema validation on all inputs |
| 🔑 **Password Storage** | bcrypt with appropriate salt rounds |
| 🌐 **API Security** | CORS policies, rate limiting, request validation |
| ⚠️ **Error Handling** | Safe error messages, no stack traces in production |
| 🔄 **Circuit Breaker** | Prevents cascade failures from external services |

### Vulnerability Disclosure

We support coordinated vulnerability disclosure. If you find a security issue:

1. Report it privately to us first
2. Allow reasonable time for a fix before public disclosure
3. Do not exploit the vulnerability for any purpose

## Third-Party Dependencies

Nexus uses third-party dependencies. We:

- Regularly update dependencies to patch known vulnerabilities
- Use dependency scanning tools to detect issues
- Review security advisories from npm and other sources

## Contact

For security-related inquiries:

- **Email**: security@nexus-ai.dev
- **PGP Key**: Available upon request

---

*Last updated: March 2026*
