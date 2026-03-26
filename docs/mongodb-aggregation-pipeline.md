---
title: MongoDB Aggregation Pipeline Essentials
source: docs/mongodb-aggregation-pipeline.md
---

# Aggregation pipeline essentials

The **aggregation pipeline** processes documents through a sequence of **stages**. Each stage transforms the stream of documents and passes results to the next stage.

## Common stages

- **`$match`**: filter documents early (like a `find` query). Putting `$match` first can use indexes and reduce work for later stages.
- **`$group`**: group by one or more fields and compute aggregates (`$sum`, `$avg`, `$max`, etc.).
- **`$project`**: reshape fields—include, exclude, or compute new fields.
- **`$sort`**: order documents. Large sorts may need memory; consider indexing fields you sort on.
- **`$lookup`**: left outer join to another collection (similar to SQL JOIN).

## Example pattern

Match recent orders, group by `customerId` to sum totals, sort by revenue:

1. `$match` on `orderDate` and status.
2. `$group` with `_id: "$customerId"` and `total: { $sum: "$amount" }`.
3. `$sort` on `total` descending.

## Performance tips

Filter and project **early** to reduce document size through the pipeline. Use **explain** plans in Compass or the shell to see whether indexes are used.

## When this doc helps

Reference this for reporting-style queries, analytics inside MongoDB, and explaining how pipeline order affects performance.
