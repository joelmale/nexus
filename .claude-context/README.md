# Claude Context Files

**Golden Rule: Always adhere to the patterns and plans laid out in TECH_STACK.md and IMPLEMENTATION_PLAN.md before writing any code.**

Use these files to quickly understand the Nexus project structure and current state.

## How to Use

When starting a new conversation, reference these files:

```
"Read the files in .claude-context/ to understand my Nexus project, then help me with [your specific task]"
```

## Who to Ask

- **How is the app built?** -> `TECH_STACK.md`
- **What's the project status?** -> `IMPLEMENTATION_PLAN.md`
- **What did we do last?** -> `RECENT_CHANGES.md`
- **What are the core concepts?** -> `KEY_ABSTRACTIONS.md`

## File Descriptions

- **PROJECT_OVERVIEW.md** - High-level project description, features, and user personas.
- **FILE_STRUCTURE.md** - Use this to understand the directory structure and key files.
- **RECENT_CHANGES.md** - A log of the latest updates and current development priorities.
- **TECH_STACK.md** - Use this to understand the technologies and architectural patterns.
- **COMMON_TASKS.md** - A guide for frequent development tasks and file locations.
- **IMPLEMENTATION_PLAN.md** - The complete roadmap with DevOps, testing, and feature implementation phases.
- **KEY_ABSTRACTIONS.md** - Explains the core concepts and business logic.

## Maintenance

After each work session, you and I will update `RECENT_CHANGES.md` to log our progress and decisions. This creates a "project memory" that makes our collaboration more efficient.