# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sylo V2** is a headless agent configuration and routing engine that acts as secure infrastructure between productivity tools and LLM agents. It does NOT host LLMs or provide user interfaces - instead it generates MCP (Model Context Protocol) configurations that external LLMs can consume to autonomously manage connected services.

## Key Architecture Principles

- **Headless Design**: No user dashboard - only config generation, context compilation, and command routing
- **Security First**: Handles OAuth flows, secure token storage, and permission scoping
- **LLM Agnostic**: Outputs MCP configs that any compatible LLM can consume
- **Service Bridge**: Connects productivity tools (Gmail, Asana, Xero) to AI agents via secure APIs

## Tech Stack

- **Frontend**: Next.js with Vercel hosting
- **Authentication**: Clerk for user management
- **Database**: NeonDB (PostgreSQL) for secure token storage
- **AI Integration**: MCP-compatible JSON generation
- **Automation**: n8n workflows for command execution
- **Media**: Google Veo 2 API for video generation

## Core System Components

### 1. Service Connector UI

OAuth integration layer for Gmail, Asana, Xero, Google Drive with granular permission controls.

### 2. Context Compiler

Generates structured memory files from connected data:

- `project_summary.md` - Current project state
- `studio_state.json` - System status
- `current_tasks.yaml` - Active task list

### 3. MCP Config Generator

Compiles agent payload including connected services, context URLs, and routing webhooks into exportable JSON.

### 4. Command Webhook Router

Accepts structured commands from LLMs, routes to n8n or service APIs, returns execution results.

### 5. LLM-Aided Media Generation

Photo upload → LLM scene interpretation → Google Veo 2 prompt → cinematic video → optional Instagram posting.

## Development Setup

**Note**: This is a new project - implementation files don't exist yet. Follow the PRD roadmap for MVP development.

## MVP Phase Implementation Order

1. **Phase 1**: User auth (Clerk) + service connections + MCP config generation
2. **Phase 2**: Webhook handler + n8n workflow bridge + action logging
3. **Phase 3**: Memory tuning + permissions audit + token refresh
4. **Phase 4**: Image upload + Veo integration + Instagram automation

## Security Requirements

- All OAuth tokens stored securely in NeonDB
- Granular permission scoping for each connected service
- Secure webhook routing with proper authentication
- No sensitive data in client-side code or commits

## Testing Strategy

- Focus on OAuth flow security and token handling
- Test MCP config JSON generation accuracy
- Validate webhook routing and command execution
- End-to-end testing of service integrations
