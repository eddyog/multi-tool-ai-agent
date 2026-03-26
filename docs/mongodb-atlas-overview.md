---
title: MongoDB Atlas — Managed Cluster Overview
source: docs/mongodb-atlas-overview.md
---

# MongoDB Atlas overview

MongoDB Atlas is MongoDB’s fully managed database service. It hosts replica sets in the cloud so teams do not run their own MongoDB servers on VMs unless they choose a self-managed option elsewhere.

## Why teams use Atlas

Atlas automates provisioning, backups, monitoring, and many security defaults. You pick a cloud provider (AWS, GCP, or Azure), a region close to your users, and an instance tier that matches workload size.

## Clusters and replica sets

A **production** Atlas deployment is typically a **replica set**: three or more data-bearing nodes that keep copies of your data. If one node fails, another can serve reads and writes according to your configuration. Atlas hides most of the operational work of keeping that replica set healthy.

## Connection strings

Applications connect with a **connection string** (URI) that includes username, password (or OIDC), hostnames of the cluster, and options such as `retryWrites=true`. You should store credentials in secrets managers or environment variables, never in source control.

## Network access

Atlas lets you restrict which IP addresses or VPCs may reach the cluster. For development, you might temporarily allow your current IP; for production, use private endpoints or tight IP lists.

## When this doc helps

Use this overview when you need to explain what Atlas is, why replica sets matter, and how applications connect securely.
