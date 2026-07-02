# NXT Link WAT Framework

NXT Link uses the **Workflows, Agents, and Tools (WAT)** architecture.

The complete project instructions, safety boundaries, human approval gates, directory conventions, recommended MVP workflows, and deterministic tool standards are maintained in:

- [docs/AGENT_INSTRUCTIONS.md](docs/AGENT_INSTRUCTIONS.md)

Treat that document as the canonical WAT operating guide for this repository.

## Quick Rule

- **Workflows** define objectives, inputs, steps, tools, approvals, outputs, and edge cases.
- **Agents** reason, coordinate, explain, and recover.
- **Tools** validate and execute deterministically.
- **Humans** approve confidential, legal, financial, identity-reveal, quote, outreach, and transaction decisions.

AI must never automatically send, sign, accept, purchase, disclose protected data, or finalize fees.
