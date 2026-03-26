---
title: MongoDB Schema Design Patterns
source: docs/mongodb-schema-design-patterns.md
---

# Schema design patterns

MongoDB is **document-oriented**: related data can live in one document or be split across collections. Design choices affect read/write patterns and consistency.

## Embedding vs referencing

- **Embed** sub-documents or arrays when data is read **together** and grows **bounded** (e.g., a few addresses on a user profile).
- **Reference** other documents by `_id` when data is **large**, **unbounded**, or **shared** across many parents (e.g., a `users` collection and a `posts` collection).

## One-to-many

For a **few** children, embedding an array may be fine. For **many** children (e.g., millions of events per user), store children in a separate collection with a foreign key field pointing to the parent.

## Bucketing / time series

For high-volume time series events, use **bucket** patterns: group many readings into one document per time window to reduce index and document overhead.

## Anti-patterns to avoid

Unbounded arrays that grow without limit can hit the **16 MB document size limit** and slow updates. Model unbounded lists as separate collections.

## When this doc helps

Use this when modeling new features, reviewing PRs that change document shape, or explaining why embedded arrays were accepted or rejected.
