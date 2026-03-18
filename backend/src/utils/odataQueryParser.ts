/**
 * OData-inspired query parser utility
 *
 * Parses Express req.query into structured options for Mongoose queries.
 *
 * Supported parameters:
 *   $select  → project specific fields         e.g. ?$select=title,location
 *   $expand  → populate related documents      e.g. ?$expand=players
 *   $filter  → simple equality filters         e.g. ?$filter=status eq confirmado
 *   $top     → limit number of results         e.g. ?$top=10
 *   $skip    → offset / pagination             e.g. ?$skip=20
 *
 * NOT implemented (out of scope):
 *   $orderby, $count, $search, logical operators (and/or/not), lambda operators
 */

import { Query as ExpressQuery } from 'express-serve-static-core';

// ─── Expand field mappings ────────────────────────────────────────────────────
// Maps the OData expand name exposed in the API to the Mongoose field name.
const EXPAND_MAP: Record<string, string> = {
  players: 'players',
  organizer: 'createdBy',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ODataOptions {
  /** Mongoose projection object  e.g. { title: 1, location: 1 } */
  select: Record<string, 1> | null;
  /** Array of Mongoose populate paths  e.g. ['players'] */
  expand: string[];
  /** Mongoose filter object built from $filter param */
  filter: Record<string, unknown>;
  /** Mongoose limit value (from $top) */
  top: number | null;
  /** Mongoose skip value (from $skip) */
  skip: number | null;
}

// ─── $select parser ───────────────────────────────────────────────────────────

function parseSelect(raw: string | undefined): ODataOptions['select'] {
  if (!raw) return null;
  const projection: Record<string, 1> = {};
  raw.split(',').forEach((field) => {
    const trimmed = field.trim();
    if (trimmed) projection[trimmed] = 1;
  });
  return Object.keys(projection).length > 0 ? projection : null;
}

// ─── $expand parser ───────────────────────────────────────────────────────────

function parseExpand(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
    .map((key) => EXPAND_MAP[key] ?? key); // resolve alias → real field
}

// ─── $filter parser ───────────────────────────────────────────────────────────
// Supports only simple "field eq value" expressions.
// Value may be quoted with double-quotes (stripped automatically).
// Numeric values are coerced to Number.
//
// Examples:
//   status eq confirmado
//   location eq "Arena XP"
//   maxPlayers eq 10

function parseFilter(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};

  const filter: Record<string, unknown> = {};

  // Each clause is separated by " and " (basic multi-clause support)
  const clauses = raw.split(/ and /i);

  for (const clause of clauses) {
    // Match: <field> eq <value>
    const match = clause.trim().match(/^(\w+)\s+eq\s+"?([^"]+)"?$/i);
    if (!match) continue;

    const [, field, rawValue] = match;
    const value = isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
    filter[field] = value;
  }

  return filter;
}

// ─── $top / $skip parsers ─────────────────────────────────────────────────────

function parseTop(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? null : n;
}

function parseSkip(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? null : n;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parses OData-like query parameters from an Express request query object.
 *
 * Usage:
 *   const odata = parseODataQuery(req.query);
 *   let query = Model.find({ ...odata.filter });
 *   if (odata.select)  query = query.select(odata.select);
 *   if (odata.top)     query = query.limit(odata.top);
 *   if (odata.skip)    query = query.skip(odata.skip);
 *   for (const path of odata.expand) query = query.populate(path);
 */
export function parseODataQuery(query: ExpressQuery): ODataOptions {
  return {
    select: parseSelect(query['$select'] as string | undefined),
    expand: parseExpand(query['$expand'] as string | undefined),
    filter: parseFilter(query['$filter'] as string | undefined),
    top:    parseTop(query['$top'] as string | undefined),
    skip:   parseSkip(query['$skip'] as string | undefined),
  };
}
