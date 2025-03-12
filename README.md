# MCP Starter Server

A minimal [ModelContextProtocol](https://modelcontextprotocol.io) server template for building AI assistant tools. This starter provides a basic structure for creating MCP tools that can be used with AI assistants like Claude.

## Features

- Simple "hello world" tool example
- TypeScript + esbuild setup
- Development tools preconfigured

## Setup to build and run with Claude

1. Download and install Claude desktop app from [claude.ai/download](https://claude.ai/download)

2. Clone the repo, install dependencies and build:

```
npm install
npm run build
```

3. Configure Claude to use this MCP server. If this is your first MCP server, in the root of this project run:

```bash
echo '{
  "mcpServers": {
    "mcp-starter": {
      "command": "node",
      "args": ["'$PWD'/dist/index.cjs"]
    }
  }
}' > ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

This should result in an entry in your `claude_desktop_config.json` like:

```json
"mcpServers": {
  "mcp-starter": {
    "command": "node",
    "args": ["/Users/matt/code/mcp-starter/dist/index.cjs"]
  }
}
```

If you have existing MCP servers, add the `mcp-starter` block to your existing config. It's an important detail that the `args` is the path to `<path_to_repo_on_your_machine>/mcp-starter/dist/index.cjs`.

4. Restart Claude Desktop.

5. Look for the hammer icon with the number of available tools in Claude's interface to confirm the server is running.

6. If this is all working, you should be able to develop your MCP server using `npm run dev` and test it in Claude. You'll need to restart Claude each time to restart the MCP server.

## Developing with Inspector

For development and debugging purposes, you can use the MCP Inspector tool. The Inspector provides a visual interface for testing and monitoring MCP server interactions.

Visit the [Inspector documentation](https://modelcontextprotocol.io/docs/tools/inspector) for detailed setup instructions.

To test locally with Inspector:
```
npm run inspect
```

To build on file changes run:
```
npm run watch
```

Or run both the watcher and inspector:
```
npm run dev
```

## Publishing

Once you're ready to distribute your server, it's simple! 

1. Set up an [NPM](https://www.npmjs.com/) account.

2. Run `npm publish`. This will publish a package using the project name in `package.json`

3. Once published, others can install the server with a config entry like:

```
"mcpServers": {
  "<your-package-name>": {
    "command": "npx",
    "args": ["<your-package-name>"]
  }
}
```

## Available Tools

The server provides:

- `hello_tool`: A simple example tool that takes a name parameter and returns a greeting

## Creating New Tools

To add new tools:

1. Define the tool schema in `index.ts`
2. Add it to the tools array in the `ListToolsRequestSchema` handler
3. Add the implementation in the `CallToolRequestSchema` handler

See the `hello_tool` implementation as an example.