---
title: MongoDB Indexing for Developers
source: docs/mongodb-indexing-guide.md
---

# Indexing guide

Indexes speed up queries by avoiding full collection scans. In MongoDB, you create indexes on one or more fields.

## Single-field indexes

A single-field index supports queries that filter or sort on that field. Example: an index on `{ email: 1 }` helps `find({ email: "user@example.com" })`.

## Compound indexes

A **compound** index includes multiple keys, e.g. `{ department: 1, lastName: 1 }`. Order matters: the index supports queries that use a prefix of the indexed fields efficiently—often `department` alone, or `department` plus `lastName`, but not `lastName` alone in the same way.

## Multikey indexes

When a field holds an **array**, MongoDB can use a **multikey** index so queries like `{ tags: "mongodb" }` can use the index. Each array element is indexed.

## Unique indexes

`createIndex({ username: 1 }, { unique: true })` enforces uniqueness and prevents duplicate usernames at the database level.

## Trade-offs

Indexes improve read performance but **slow writes** slightly and use **disk space**. Monitor index usage and drop unused indexes when safe.

## When this doc helps

Use this document to explain index types, compound key order, and the cost/benefit of indexing for application developers.
