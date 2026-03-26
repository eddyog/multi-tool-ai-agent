---
title: MongoDB Replica Sets and Read Preference
source: docs/mongodb-replica-sets-and-read-preference.md
---

# Replica sets and read preference

A **replica set** is a group of MongoDB processes that maintain the same data set. One node is the **primary**; others are **secondaries** that replicate the primary’s oplog.

## Writes

All writes go to the **primary** (in a typical deployment). Drivers retry according to retryable write settings when failover occurs.

## Reads and read preference

**Read preference** tells the driver which members may serve **read** operations:

- **primary**: default; strong consistency; reads only from the primary.
- **primaryPreferred**: primary if available, otherwise a secondary.
- **secondary**: load analytics off the primary by reading secondaries (may lag behind).
- **nearest**: minimize latency based on network round trip.

Using secondaries trades **staleness** for **scale** and isolation of heavy read workloads.

## Failover

If the primary fails, an election promotes a secondary. Applications should use a **replica set connection string** so the driver discovers the new primary automatically.

## When this doc helps

Use this document when tuning analytics queries, explaining eventual consistency, or designing services that must never read slightly stale data (stick to primary).
