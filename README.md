# PostHog MCP

The MCP server has been moved into the PostHog Monorepo - you can find it [here](https://github.com/PostHog/posthog/tree/master/products/mcp).

Documentation: https://posthog.com/docs/model-context-protocol

## Use the MCP Server

### Option 1: Quick Install (Wizard)

You can install the MCP server automatically into Cursor, Claude, Claude Code, VS Code and Zed by running the following command:

```bash
npx @posthog/wizard@latest mcp add
```

**Note**: The wizard uses `mcp-remote` which has [known connection issues](https://github.com/anthropics/claude-code/issues/1663). If you experience connection failures, use Option 2 below.

### Option 2: Direct Connection (Recommended for Claude Code)

Due to known issues with `mcp-remote`, we provide stdio wrappers for reliable connections.

#### Installation

1. Get your PostHog Personal API Key:
   - Go to [PostHog Settings](https://us.posthog.com/settings/user-api-keys)
   - Create a new personal API key
   - Copy the key (starts with `phx_`)

2. **For Global Access** (available in all projects):

```bash
claude mcp add posthog \
  --env POSTHOG_PERSONAL_API_KEY=phx_YOUR_API_KEY \
  -- node /path/to/mcp-posthog/typescript/mcp-official-wrapper.js
```

3. **For Per-Project Access** (specific projects only):

Create `.claude.json` in your project root:

```json
{
  "mcpServers": {
    "posthog": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mcp-posthog/typescript/mcp-official-wrapper.js"],
      "env": {
        "POSTHOG_PERSONAL_API_KEY": "phx_YOUR_API_KEY"
      }
    }
  }
}
```

Replace:
- `/path/to/mcp-posthog` with the actual path to this repository
- `phx_YOUR_API_KEY` with your actual PostHog personal API key

#### Verification

After installation, verify the connection:

```bash
claude mcp list
```

You should see:
```
posthog: node /path/to/mcp-official-wrapper.js - ✓ Connected
```

### Option 3: Local Development

For developing and testing changes to the MCP server:

1. Start the local development server:

```bash
cd typescript
pnpm install
pnpm dev
```

2. In a separate terminal, configure the development wrapper:

```bash
claude mcp add posthog-dev \
  --env POSTHOG_PERSONAL_API_KEY=phx_YOUR_API_KEY \
  --env POSTHOG_MCP_URL=http://localhost:57024 \
  -- node /path/to/mcp-posthog/typescript/mcp-client-wrapper.js
```

## Available Wrappers

This repository includes three wrapper scripts:

- **`typescript/mcp-official-wrapper.js`** - Production wrapper for official PostHog MCP server (`https://mcp.posthog.com`)
- **`typescript/mcp-client-wrapper.js`** - Development wrapper for local Wrangler dev server
- **`typescript/mcp-server.js`** - Helper script to start local dev server

All wrappers:
- Work with Claude Code's stdio transport
- Require Node.js v18+ (no npm dependencies)
- Support environment variable configuration
- Include comprehensive error handling

## Troubleshooting

### Connection Failed

If you see `✗ Failed to connect`:

1. **Check API Key**: Verify your API key is valid and starts with `phx_`
2. **Check Path**: Ensure the path to `mcp-official-wrapper.js` is correct
3. **Check Node Version**: Requires Node.js v18+ for native fetch support
4. **Restart Claude Code**: Changes to MCP config require restart

### Environment Variable Not Available

If the wrapper reports missing `POSTHOG_PERSONAL_API_KEY`:

1. Check your `.claude.json` config includes the `env` section
2. Verify the API key is properly quoted in JSON
3. Restart Claude Code after config changes

### mcp-remote Issues

If you installed via the wizard and experience connection problems:

1. Remove the existing config: `claude mcp remove posthog`
2. Install using Option 2 (Direct Connection) above

## Features

The PostHog MCP server provides 43+ tools for:

- **Dashboards**: Create, update, delete, and manage dashboards
- **Insights**: Create, query, and manage analytics insights
- **Feature Flags**: CRUD operations on feature flags
- **Experiments**: Create and manage A/B tests
- **Surveys**: Create and manage user surveys
- **Error Tracking**: Query and analyze errors
- **Documentation**: Search PostHog docs via AI
- **Analytics**: Query PostHog data with natural language

## Requirements

- Node.js v18 or higher
- PostHog account with Personal API Key
- Claude Code (for stdio wrappers)
