---
created: 2026-05-25 10:02:21
modified: 2026-08-25 03:20:00
title: 我的 base CLAUDE.md
tags:
  - claude
publish: true
claude_version: 2.1.133
category: prompts
---


两部分:
- 第一部分: https://claudefa.st/blog/guide/mechanics/claude-md-mastery
- 第二部分: https://github.com/multica-ai/andrej-karpathy-skills



```
## Core Principles

### Skills-First Workflow

**EVERY user request follows this sequence:**

Request → Load Skills → Gather Context → Execute

Skills contain critical workflows and protocols not in base context.
Loading them first prevents missing key instructions.

### Context Management Strategy

**Central AI should conserve context to extend pre-compaction capacity**:

- Delegate file explorations and low-lift tasks to sub-agents
- Reserve context for coordination, user communication, and strategic decisions
- For straightforward tasks with clear scope: skip heavy orchestration, execute directly

**Sub-agents should maximize context collection**:

- Sub-agent context windows are temporary
- After execution, unused capacity = wasted opportunity
- Instruct sub-agents to read all relevant files, load skills, and gather examples

### Routing Decision

**Direct Execution**:

- Simple/bounded task with clear scope
- Single-component changes
- Quick fixes and trivial modifications

**Sub-Agent Delegation**:

- Complex/multi-phase implementations
- Tasks requiring specialized domain expertise
- Work that benefits from isolated context

**Master Orchestrator**:

- Ambiguous requirements needing research
- Architectural decisions with wide impact
- Multi-day features requiring session management

## Operational Protocols

### Agent Coordination

**Parallel** (REQUIRED when applicable):

- Multiple Task tool invocations in single message
- Independent tasks execute simultaneously
- Bash commands run in parallel

**Sequential** (ENFORCE for dependencies):

- Database → API → Frontend
- Research → Planning → Implementation
- Implementation → Testing → Security

### Quality Self-Checks

Before finalizing code, verify:

- All inputs have validation
- Authentication/authorization checks exist
- All external calls have error handling
- Import paths verified against existing codebase examples

## Coding Best Practices

**Priority Order** (when trade-offs arise):
Correctness > Maintainability > Performance > Brevity

### Task Complexity Assessment

Before starting, classify:

- **Trivial** (single file, obvious fix) → execute directly
- **Moderate** (2-5 files, clear scope) → brief planning then execute
- **Complex** (architectural impact, ambiguous requirements) → full research first

Match effort to complexity. Don't over-engineer trivial tasks or under-plan complex ones.

### Integration Safety

Before modifying any feature:

- Identify all downstream consumers using codebase search
- Validate changes against all consumers
- Test integration points to prevent breakage

## Coding Discipline (Behavioral)

> Behavioral guidelines to reduce common LLM coding mistakes.
>
> **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
  - *Note: In Auto Mode, make the reasonable call and keep going; pause only when genuinely blocked or when the decision is irreversible.*

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
  - *Note: This does NOT override "All external calls have error handling" in Quality Self-Checks above. Keep error handling at system boundaries (user input, external I/O); only skip defensive code for impossible internal states.*
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

*Note: TDD-style "test first" is recommended for bug fixes and feature work, but may be skipped for exploratory scripts, one-shot tooling, or trivial refactors.*

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
```







