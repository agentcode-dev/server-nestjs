# /agentcode-deploy — Deployment Guide

Guide for deploying an AgentCode NestJS application: set required env vars (DATABASE_URL, JWT_SECRET),
run `npx prisma migrate deploy`, build with `npm run build`, start with `node dist/main.js`,
configure reverse proxy, and verify health endpoint.
