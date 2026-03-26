---
title: MongoDB Compass and mongosh Basics
source: docs/mongodb-compass-and-shell.md
---

# Compass and mongosh basics

MongoDB provides graphical and shell tools to inspect data and run commands against a cluster.

## MongoDB Compass

**Compass** is a desktop GUI for browsing databases, collections, and documents. You can:

- Connect with the same URI your app uses (with appropriate permissions).
- Run **aggregations** with a visual pipeline builder.
- Examine **indexes** and query performance hints.

Compass is useful for ad hoc exploration and for sharing screenshots of document shape with teammates.

## mongosh

**mongosh** is the MongoDB Shell. It is a JavaScript-oriented REPL connected to your cluster. Typical uses:

- `show dbs` and `use mydb` to select a database.
- `db.myCollection.find({ status: "active" }).limit(5)` to read documents.
- `db.myCollection.insertOne({ name: "demo", createdAt: new Date() })` for quick tests.

mongosh is ideal for scripts and for learning the query API without writing a full application.

## Read-only vs read-write users

Create database users with the **least privilege** needed. Analysts might get read-only roles; application services get read-write on specific databases only.

## When this doc helps

Reference this when comparing GUI vs shell workflows or when onboarding someone who needs to inspect data without deploying code.
