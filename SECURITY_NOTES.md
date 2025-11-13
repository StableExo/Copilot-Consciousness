# Security Notes (Accepted Advisories and Rationale)

This document tracks known advisories that are either:
- Not applicable to our runtime surface (dev-only tooling), or
- Temporarily accepted with a concrete mitigation plan.

Last updated: 2025-11-13

## Accepted (Dev Tooling Only)

- `cookie` via `@sentry/node` (transitive through Hardhat) – Dev-only
  - Context: Brought by Hardhat dev stack. Not shipped in production runtime.
  - Action: Monitor upstream; accept in dev.

- `tmp` via `solc` – Dev-only
  - Context: Solidity compiler dependency used only during local development/testing.
  - Action: Accept in dev; monitor upstream.

## Accepted (Runtime with Mitigation Plan)

- `elliptic` lineage via `ethers@5.x` (@ethersproject/*)
  - Risk: Multiple cryptography advisories.
  - Plan: Migrate to Ethers v6 (see issue: “Migrate to Ethers v6 and @nomicfoundation/hardhat-ethers”).
  - Status: Planned.

## Advisory Noise Through Transitive Solidity Packages

- `@openzeppelin/contracts` (<=4.8.2) via `@uniswap/v3-periphery` / `@uniswap/v3-staker`
  - Context: Referenced for ABIs; we are not deploying these contracts.
  - Plan: Evaluate dependency surface (see issue: “Evaluate and Rationalize Uniswap SDK Dependency Surface”).
  - Status: Under evaluation.

## Audit Commands

- Production-focused audit:
  - `npm run audit:prod` (runs `npm audit --omit=dev --audit-level=high`)

## Notes

- We do not use `npm audit fix --force` to avoid breaking pinned versions.
- All accepted advisories are either dev-only or have a mitigation plan.
