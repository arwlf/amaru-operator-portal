---
id: amaru-user-guide
title: "Guide: How to Run an Amaru Node"
sidebar_label: "Guide: Running an Amaru Node"
description: A structured guide to installing, configuring, running, and maintaining an Amaru node.
---

## About this guide

This guide is built with the same Docusaurus setup and conventions as [developers.cardano.org/docs/operators](https://developers.cardano.org/docs/operators/), since parts of it are expected to be merged into that site at some point. Starting from the same template now means less rework when that happens.  

:::important Scope: Amaru is a relay node today
Amaru does **not** yet support block production, there is no key generation, KES/VRF/operational-certificate handling, or stake pool registration. 
Track Block Producing support on the [Amaru roadmap](https://github.com/orgs/pragma-org/projects/3).

:::

This guide has two paths, depending on what you're trying to do:

- **[Fast-Forward on Preprod](/docs/operators/amaru-node/amaru-fast-forward)** — the quickest way to get a synced Amaru node up for testing and development. Installs the binary, bootstraps from a snapshot, starts the node, enjoy **[the Amaru TUI](/docs/operators/amaru-node/amaru-tui)**.
- **[Advanced Installation on Mainnet](/docs/operators/amaru-node/amaru-advanced)** — a production-grade setup for operating Amaru on mainnet, in two parts:
  - **[System Hardening](/docs/operators/amaru-node/amaru-advanced-hardening)**
  - **[Advanced Installation](/docs/operators/amaru-node/amaru-advanced-installation)**

