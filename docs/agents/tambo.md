# Tambo AI Framework

This project uses **Tambo AI** for building AI assistants with generative UI and MCP support.

**Documentation**: https://docs.tambo.co/llms.txt

## CLI Commands (Non-Interactive)

The Tambo CLI auto-detects non-interactive environments.

```bash
# Initialize (requires API key from https://console.tambo.co)
npx tambo init --api-key=sk_...

# Add components
npx tambo add <component> --yes

# List available components
npx tambo list --yes

# Create new app
npx tambo create-app <name> --template=standard

# Get help
npx tambo --help
npx tambo <command> --help
```

**Exit codes**: 0=success, 1=error, 2=requires flags (check stderr for exact command)

## Generative UI Rules

- Props are `undefined` during streaming — always use `?.` and `??`
- Use `useTamboComponentState` for state the assistant needs to see
- Use `useTamboStreamStatus` to control UI behavior based on streaming state (disabling buttons, showing section-level loading, waiting for required fields before rendering)
- String props can render as they stream; structured data (arrays/objects) may stream progressively or wait for completion
- Generate array item IDs client-side — React keys must be stable, AI-generated IDs are unreliable during streaming
- If item IDs are used to fetch data, use `useTamboStreamStatus` to wait until the array is complete before rendering
- Fetch server data or derive from app state; don't have AI generate what already exists
- Use `.describe()` to guide prop generation
