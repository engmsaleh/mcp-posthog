#!/usr/bin/env node

/**
 * MCP Server Wrapper for Claude Code
 *
 * This script starts the Wrangler dev server and provides
 * the MCP endpoint for Claude Code to connect to.
 */

const { spawn } = require("node:child_process");
const path = require("node:path");

const serverProcess = spawn("npx", ["wrangler", "dev"], {
	cwd: __dirname,
	stdio: "inherit",
	env: {
		...process.env,
		POSTHOG_PERSONAL_API_KEY: process.env.POSTHOG_PERSONAL_API_KEY || "",
	},
});

serverProcess.on("error", (err) => {
	console.error("Failed to start server:", err);
	process.exit(1);
});

serverProcess.on("exit", (code) => {
	console.log(`Server exited with code ${code}`);
	process.exit(code);
});

// Handle termination
process.on("SIGINT", () => {
	serverProcess.kill("SIGINT");
});

process.on("SIGTERM", () => {
	serverProcess.kill("SIGTERM");
});
