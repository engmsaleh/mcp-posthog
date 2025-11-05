#!/usr/bin/env node

/**
 * MCP Client Wrapper for Local Development
 *
 * This script bridges Claude Code (stdio) to a LOCAL Wrangler dev server (SSE).
 *
 * ⚠️  FOR DEVELOPMENT ONLY - Use mcp-official-wrapper.js for production!
 *
 * USAGE:
 *   1. Start local Wrangler dev server:
 *      cd typescript && pnpm dev
 *
 *   2. Configure in .claude.json:
 *      {
 *        "mcpServers": {
 *          "posthog-dev": {
 *            "command": "node",
 *            "args": ["/path/to/mcp-client-wrapper.js"],
 *            "env": {
 *              "POSTHOG_PERSONAL_API_KEY": "phx_YOUR_API_KEY",
 *              "POSTHOG_MCP_URL": "http://localhost:57024"
 *            }
 *          }
 *        }
 *      }
 *
 * ENVIRONMENT VARIABLES:
 *   POSTHOG_PERSONAL_API_KEY - Your PostHog personal API key (required)
 *   POSTHOG_MCP_URL - Local dev server URL (default: http://localhost:57024)
 *
 * REQUIREMENTS:
 *   - Node.js v18+ (for native fetch support)
 *   - Wrangler dev server running locally
 *   - No npm dependencies required
 *
 * @see mcp-official-wrapper.js for production use
 */

const readline = require("node:readline");

const API_TOKEN = process.env.POSTHOG_PERSONAL_API_KEY;
const BASE_URL = process.env.POSTHOG_MCP_URL || "http://localhost:57024";

if (!API_TOKEN) {
	console.error("Error: POSTHOG_PERSONAL_API_KEY environment variable is required");
	process.exit(1);
}

let messageEndpoint = null;
const sseReader = null;

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
		if (done) return;

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
