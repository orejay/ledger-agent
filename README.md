# ledger-agent

A Claude-powered agent for ledger operations, built around two ideas that
matter for putting an LLM in front of real financial data:

- **Human-in-the-loop approval gating** — sensitive tools (e.g. flagging an
  account) never execute without an explicit approval callback returning
  `true`. Denials are recorded in the trace, not silently dropped.
- **Full observability** — every model call and tool call is traced via
  OpenTelemetry and exported to [Langfuse](https://langfuse.com), so a run
  can be replayed and audited step by step.

Tools are exposed to the agent through a `ToolSource` abstraction, so the
same `Agent` can run against an in-process tool registry (`LocalToolSource`)
or a set of tools served over the
[Model Context Protocol](https://modelcontextprotocol.io) (`McpToolSource`)
without any change to the agent loop itself.

## Architecture

```
              ┌─────────┐        tool_use / tool_result       ┌─────────────┐
  user ─────▶ │  Agent  │ ◀────────────────────────────────▶ │  ToolSource  │
              └────┬────┘                                     └──────┬──────┘
                   │ sensitive tool?                                 │
                   ▼                                        ┌────────┴────────┐
            approve(name, input)                            │                 │
                   │                                 LocalToolSource    McpToolSource
                   ▼                                  (in-process)     (stdio → MCP server)
           allow / deny, traced
                   │
                   ▼
        OpenTelemetry spans ──▶ Langfuse
```

- [`src/agent/index.ts`](src/agent/index.ts) — the agentic loop: calls Claude,
  executes tool calls through a `ToolSource`, gates sensitive tools behind an
  `approve` callback, and records a step-by-step trace.
- [`src/tools/`](src/tools/) — tool definitions (`get_transactions`,
  `flag_account`) and two `ToolSource` implementations.
- [`src/mcp/server.ts`](src/mcp/server.ts) — serves the same tools over MCP
  via stdio, so the agent can talk to them as an external process.
- [`src/tracer/`](src/tracer/) — in-memory step trace plus OpenTelemetry/
  Langfuse wiring for spans and generations.

## Getting started

```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY (Langfuse keys are optional)
```

Run the agent against the in-process MCP tool server:

```bash
npm run dev
```

Run the MCP tool server standalone (useful for inspecting it with the
[MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)):

```bash
npm run mcp
```

## Scripts

| Script                 | Purpose                            |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Run the agent CLI                  |
| `npm run mcp`          | Run the MCP tool server standalone |
| `npm test`             | Run the test suite (Vitest)        |
| `npm run typecheck`    | Type-check without emitting        |
| `npm run build`        | Compile to `dist/`                 |
| `npm run lint`         | Lint with ESLint                   |
| `npm run format`       | Format with Prettier               |
| `npm run format:check` | Check formatting in CI             |

## Approval gating

Sensitive tools are declared per-tool (`sensitive: true`, see
[`flag-account.ts`](src/tools/flag-account.ts)) and checked against an
`approve` callback passed into `Agent`. In the CLI entry point
([`src/index.ts`](src/index.ts)) this prompts on stdin; in tests it's a
plain function, so approval behavior is fully unit-testable without mocking
stdin (see [`src/test/agent.test.ts`](src/test/agent.test.ts)).

## Tracing

If `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` are set, every run exports
OpenTelemetry spans to Langfuse: one root span per `agent.run()`, a
generation span per model call (with token usage), and a span per tool
call. Without those env vars, tracing is a no-op — the agent runs the same
way, just untraced.
