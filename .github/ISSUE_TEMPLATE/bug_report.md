---
name: 🐛 Bug report
about: Create a report to help us improve Sentinel 🛡️
title: '[BUG] '
labels: bug
assignees: ''

---

> [!IMPORTANT]
> Please review our [Contributing Guidelines](https://github.com/rayrishu19-wq/sentinel-api-gateway/blob/main/CONTRIBUTING.md) before submitting. Ensure that you have tested your setup with either a local Redis instance or with the internal Redis mock server active.

### Describe the bug
A clear and concise description of what the bug is.

### To Reproduce
Steps to reproduce the behavior:
1. Start Redis (or specify if relying on the in-memory mock): `...`
2. Start downstream microservices (e.g. `npm run service:users`, `npm run service:products`, or `npm run service:restaurant`): `...`
3. Start the Sentinel API Gateway: `npm start`
4. Send test request (e.g., `curl` command or dynamic request): `...`
5. See error output: `...`

### Expected behavior
A clear and concise description of what you expected to happen.

### Environment Information
- **Node.js Version:** [e.g., v18.16.0]
- **Redis Version:** [e.g., v7.0.11 or mock]
- **OS:** [e.g., Windows 11, macOS, Ubuntu]

### Logs / Screenshots
If applicable, paste terminal console logs, stack traces, or screenshots to help explain your problem.

### Additional context
Add any other context about the problem here (e.g., custom modifications, gateway.json config block, custom route mappings).
