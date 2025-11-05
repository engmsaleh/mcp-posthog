#!/usr/bin/env node

/**
 * MCP Client Wrapper for Official PostHog Server
 *
 * This script bridges Claude Code (stdio) to the official PostHog MCP server (SSE).
 *
 * USAGE:
 *   Configure in .claude.json:
 *   {
 *     "mcpServers": {
 *       "posthog": {
 *         "command": "node",
 *         "args": ["/path/to/mcp-official-wrapper.js"],
 *         "env": {
 *           "POSTHOG_PERSONAL_API_KEY": "phx_YOUR_API_KEY"
 *         }
 *       }
 *     }
 *   }
 *
 * ENVIRONMENT VARIABLES:
 *   POSTHOG_PERSONAL_API_KEY - Your PostHog personal API key (required)
 *                              Get it from: https://us.posthog.com/settings/user-api-keys
 *
 * REQUIREMENTS:
 *   - Node.js v18+ (for native fetch support)
 *   - No npm dependencies required
 *
 * HOW IT WORKS:
 *   1. Connects to https://mcp.posthog.com/sse via Server-Sent Events
 *   2. Receives message endpoint from server
 *   3. Reads JSON-RPC messages from stdin (Claude Code)
 *   4. Forwards messages to PostHog server via HTTP POST
 *   5. Streams responses back to stdout (Claude Code)
 *
 * TROUBLESHOOTING:
 *   - "POSTHOG_PERSONAL_API_KEY environment variable is required"
 *     → Set your API key in .claude.json env section
 *
 *   - "SSE connection failed: 401"
 *     → Invalid or missing API key
 *
 *   - "SSE connection failed: 403"
 *     → API key doesn't have required permissions
 *
 *   - "Not connected - no message endpoint"
 *     → SSE stream didn't provide endpoint (server issue)
 *
 * @see https://github.com/PostHog/mcp-posthog
 */

const readline = require("node:readline");

const API_TOKEN = process.env.POSTHOG_PERSONAL_API_KEY;
const BASE_URL = "https://mcp.posthog.com";

if (!API_TOKEN) {
	console.error("Error: POSTHOG_PERSONAL_API_KEY environment variable is required");
	process.exit(1);
}

let messageEndpoint = null;

// Connect to SSE endpoint
async function connectSSE() {
	const response = await fetch(`${BASE_URL}/sse`, {
		headers: {
			Authorization: `Bearer ${API_TOKEN}`,
			Accept: "text/event-stream",
		},
	});

	if (!response.ok) {
		throw new Error(`SSE connection failed: ${response.status}`);
	}

	const decoder = new TextDecoder();
	const reader = response.body.getReader();
	let buffer = "";
	let eventType = "";

	// Read SSE stream
	async function read() {
		const { done, value } = await reader.read();
		if (done) {
			process.exit(0);
			return;
		}

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop();

		for (const line of lines) {
			if (line.startsWith("event:")) {
				eventType = line.substring(6).trim();
			} else if (line.startsWith("data:")) {
				const data = line.substring(5).trim();

				if (eventType === "endpoint") {
					messageEndpoint = `${BASE_URL}${data}`;
				} else if (eventType === "message") {
					// Forward message to stdout for Claude Code
					console.log(data);
				}
			}
		}

		read();
	}

	read().catch((err) => {
		console.error("SSE error:", err);
		process.exit(1);
	});
}

// Send message to server
async function sendMessage(message) {
	if (!messageEndpoint) {
		throw new Error("Not connected - no message endpoint");
	}

	const response = await fetch(messageEndpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${API_TOKEN}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	});

	if (!response.ok) {
		throw new Error(`Send message failed: ${response.status}`);
	}
}

// Read from stdin and send to server
function setupStdin() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});

	rl.on("line", async (line) => {
		try {
			const message = JSON.parse(line);
			await sendMessage(message);
		} catch (err) {
			console.error("Error processing message:", err.message);
		}
	});
}

// Main
async function main() {
	try {
		await connectSSE();
		setupStdin();
	} catch (err) {
		console.error("Failed to start MCP client:", err.message);
		process.exit(1);
	}
}

main();
