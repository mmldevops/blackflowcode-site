#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TeableClient } from "./client.js";

const TOKEN = process.env.TEABLE_API_TOKEN;
const BASE_URL = process.env.TEABLE_BASE_URL ?? "https://app.teable.io/api";

if (!TOKEN) {
  console.error("Error: TEABLE_API_TOKEN environment variable is required.");
  process.exit(1);
}

const client = new TeableClient(BASE_URL, TOKEN);

const server = new McpServer({
  name: "teable-mcp-server",
  version: "1.0.0",
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

async function run<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${msg}` }],
      isError: true,
    };
  }
}

// ── Spaces ───────────────────────────────────────────────────────────────────

server.registerTool(
  "teable_list_spaces",
  {
    description: "List all Teable spaces the authenticated user has access to.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  () => run(() => client.listSpaces())
);

server.registerTool(
  "teable_get_space",
  {
    description: "Get details of a specific Teable space by its ID.",
    inputSchema: z.object({
      spaceId: z.string().describe("The space ID (prefix: spc...)"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ spaceId }) => run(() => client.getSpace(spaceId))
);

// ── Bases ────────────────────────────────────────────────────────────────────

server.registerTool(
  "teable_list_bases",
  {
    description: "List all bases (databases) within a Teable space.",
    inputSchema: z.object({
      spaceId: z.string().describe("The space ID (prefix: spc...)"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ spaceId }) => run(() => client.listBases(spaceId))
);

server.registerTool(
  "teable_get_base",
  {
    description: "Get details of a specific Teable base.",
    inputSchema: z.object({
      baseId: z.string().describe("The base ID (prefix: bse...)"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ baseId }) => run(() => client.getBase(baseId))
);

server.registerTool(
  "teable_create_base",
  {
    description: "Create a new base (database) inside a space.",
    inputSchema: z.object({
      spaceId: z.string().describe("The space to create the base in"),
      name: z.string().describe("Name of the new base"),
      icon: z.string().optional().describe("Emoji icon for the base"),
    }),
    annotations: { readOnlyHint: false },
  },
  ({ spaceId, name, icon }) => run(() => client.createBase({ spaceId, name, icon }))
);

server.registerTool(
  "teable_delete_base",
  {
    description: "Permanently delete a Teable base and all its tables.",
    inputSchema: z.object({
      baseId: z.string().describe("The base ID to delete"),
    }),
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  ({ baseId }) => run(async () => { await client.deleteBase(baseId); return { deleted: true }; })
);

// ── Tables ───────────────────────────────────────────────────────────────────

server.registerTool(
  "teable_list_tables",
  {
    description: "List all tables in a Teable base.",
    inputSchema: z.object({
      baseId: z.string().describe("The base ID (prefix: bse...)"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ baseId }) => run(() => client.listTables(baseId))
);

server.registerTool(
  "teable_get_table",
  {
    description: "Get details of a specific table.",
    inputSchema: z.object({
      baseId: z.string().describe("The base ID"),
      tableId: z.string().describe("The table ID (prefix: tbl...)"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ baseId, tableId }) => run(() => client.getTable(baseId, tableId))
);

server.registerTool(
  "teable_create_table",
  {
    description: "Create a new table in a Teable base with optional initial fields.",
    inputSchema: z.object({
      baseId: z.string().describe("The base ID"),
      name: z.string().describe("Table name"),
      description: z.string().optional().describe("Table description"),
      icon: z.string().optional().describe("Emoji icon"),
      fields: z
        .array(
          z.object({
            type: z
              .string()
              .describe(
                "Field type: singleLineText | longText | number | date | checkbox | singleSelect | multipleSelect | link | formula | rating | user | autoNumber"
              ),
            name: z.string().describe("Field name"),
          })
        )
        .optional()
        .describe("Initial fields to create with the table"),
    }),
    annotations: { readOnlyHint: false },
  },
  ({ baseId, name, description, icon, fields }) =>
    run(() => client.createTable(baseId, { name, description, icon, fields }))
);

server.registerTool(
  "teable_delete_table",
  {
    description: "Permanently delete a table and all its records.",
    inputSchema: z.object({
      baseId: z.string().describe("The base ID"),
      tableId: z.string().describe("The table ID to delete"),
    }),
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  ({ baseId, tableId }) =>
    run(async () => { await client.deleteTable(baseId, tableId); return { deleted: true }; })
);

// ── Fields ───────────────────────────────────────────────────────────────────

server.registerTool(
  "teable_list_fields",
  {
    description: "List all fields (columns) in a table. Optionally filter by view.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID (prefix: tbl...)"),
      viewId: z.string().optional().describe("Filter fields shown in this view"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ tableId, viewId }) => run(() => client.listFields(tableId, viewId))
);

server.registerTool(
  "teable_create_field",
  {
    description: "Add a new field (column) to a table.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      name: z.string().describe("Field name"),
      type: z
        .string()
        .describe(
          "Field type: singleLineText | longText | number | date | checkbox | singleSelect | multipleSelect | link | formula | rating | user | autoNumber"
        ),
      options: z
        .record(z.unknown())
        .optional()
        .describe("Type-specific options (e.g. choices for singleSelect)"),
    }),
    annotations: { readOnlyHint: false },
  },
  ({ tableId, name, type, options }) =>
    run(() => client.createField(tableId, { name, type, ...options }))
);

server.registerTool(
  "teable_update_field",
  {
    description: "Update a field's name or type-specific options.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      fieldId: z.string().describe("The field ID (prefix: fld...)"),
      name: z.string().optional().describe("New field name"),
      options: z
        .record(z.unknown())
        .optional()
        .describe("Options to update (merged with existing)"),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true },
  },
  ({ tableId, fieldId, name, options }) =>
    run(() => client.updateField(tableId, fieldId, { name, ...options }))
);

server.registerTool(
  "teable_delete_field",
  {
    description: "Delete a field and its data from all records.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      fieldId: z.string().describe("The field ID to delete"),
    }),
    annotations: { destructiveHint: true },
  },
  ({ tableId, fieldId }) =>
    run(async () => { await client.deleteField(tableId, fieldId); return { deleted: true }; })
);

// ── Records ──────────────────────────────────────────────────────────────────

server.registerTool(
  "teable_list_records",
  {
    description:
      "List records in a table with optional filtering, sorting, searching, and pagination. Returns up to 1000 records per call.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID (prefix: tbl...)"),
      take: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe("Number of records to return (1–1000, default 100)"),
      skip: z.number().int().min(0).optional().default(0).describe("Offset for pagination"),
      viewId: z.string().optional().describe("Apply this view's filters and sorts"),
      fieldKeyType: z
        .enum(["name", "id", "dbFieldName"])
        .optional()
        .default("name")
        .describe("Key format for field names in response (default: name)"),
      cellFormat: z
        .enum(["json", "text"])
        .optional()
        .default("json")
        .describe("Value format: json (structured) or text (plain string)"),
      filter: z
        .string()
        .optional()
        .describe(
          'JSON-stringified filter: {"conjunction":"and","filterSet":[{"fieldId":"fldXXX","operator":"contains","value":"text"}]}'
        ),
      orderBy: z
        .string()
        .optional()
        .describe(
          'JSON-stringified sort: [{"fieldId":"fldXXX","direction":"asc"}]'
        ),
      search: z
        .string()
        .optional()
        .describe("Full-text search string across all fields"),
      ignoreViewQuery: z
        .boolean()
        .optional()
        .describe("If true, ignore the view's built-in filters"),
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  ({ tableId, take, skip, viewId, fieldKeyType, cellFormat, filter, orderBy, search, ignoreViewQuery }) =>
    run(() =>
      client.listRecords(tableId, {
        take,
        skip,
        viewId,
        fieldKeyType,
        cellFormat,
        filter,
        orderBy,
        search,
        ignoreViewQuery,
      })
    )
);

server.registerTool(
  "teable_get_record",
  {
    description: "Get a single record by its ID.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      recordId: z.string().describe("The record ID (prefix: rec...)"),
      fieldKeyType: z
        .enum(["name", "id", "dbFieldName"])
        .optional()
        .default("name")
        .describe("Key format for field names"),
      cellFormat: z
        .enum(["json", "text"])
        .optional()
        .default("json")
        .describe("Value format"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ tableId, recordId, fieldKeyType, cellFormat }) =>
    run(() => client.getRecord(tableId, recordId, { fieldKeyType, cellFormat }))
);

server.registerTool(
  "teable_create_records",
  {
    description: "Create one or more records in a table. Field keys default to field names.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      records: z
        .array(
          z.object({
            fields: z
              .record(z.unknown())
              .describe("Field name → value pairs for this record"),
          })
        )
        .min(1)
        .describe("Array of records to create"),
      fieldKeyType: z
        .enum(["name", "id"])
        .optional()
        .default("name")
        .describe("Whether fields keys are field names or IDs"),
      typecast: z
        .boolean()
        .optional()
        .default(true)
        .describe("Auto-coerce values to the correct field type"),
    }),
    annotations: { readOnlyHint: false, idempotentHint: false },
  },
  ({ tableId, records, fieldKeyType, typecast }) =>
    run(() => client.createRecords(tableId, records, { fieldKeyType, typecast }))
);

server.registerTool(
  "teable_update_record",
  {
    description: "Update fields of a single record.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      recordId: z.string().describe("The record ID to update"),
      fields: z.record(z.unknown()).describe("Field name → new value pairs to update"),
      fieldKeyType: z
        .enum(["name", "id"])
        .optional()
        .default("name")
        .describe("Key format"),
      typecast: z
        .boolean()
        .optional()
        .default(true)
        .describe("Auto-coerce values to field type"),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true },
  },
  ({ tableId, recordId, fields, fieldKeyType, typecast }) =>
    run(() => client.updateRecord(tableId, recordId, fields, { fieldKeyType, typecast }))
);

server.registerTool(
  "teable_update_records",
  {
    description: "Update multiple records in a single request.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      records: z
        .array(
          z.object({
            id: z.string().describe("The record ID to update"),
            fields: z.record(z.unknown()).describe("Field name → new value pairs"),
          })
        )
        .min(1)
        .describe("Records to update"),
      fieldKeyType: z
        .enum(["name", "id"])
        .optional()
        .default("name")
        .describe("Key format"),
      typecast: z.boolean().optional().default(true),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true },
  },
  ({ tableId, records, fieldKeyType, typecast }) =>
    run(() => client.updateRecords(tableId, records, { fieldKeyType, typecast }))
);

server.registerTool(
  "teable_delete_record",
  {
    description: "Delete a single record from a table.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      recordId: z.string().describe("The record ID to delete"),
    }),
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  ({ tableId, recordId }) =>
    run(async () => { await client.deleteRecord(tableId, recordId); return { deleted: true }; })
);

server.registerTool(
  "teable_delete_records",
  {
    description: "Delete multiple records from a table in one request.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      recordIds: z
        .array(z.string())
        .min(1)
        .describe("Array of record IDs to delete"),
    }),
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  ({ tableId, recordIds }) =>
    run(async () => { await client.deleteRecords(tableId, recordIds); return { deleted: recordIds.length }; })
);

// ── Views ────────────────────────────────────────────────────────────────────

server.registerTool(
  "teable_list_views",
  {
    description: "List all views in a table (grid, form, calendar, kanban, gallery, etc.).",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ tableId }) => run(() => client.listViews(tableId))
);

server.registerTool(
  "teable_get_view",
  {
    description: "Get details of a specific view including its filters and sorts.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      viewId: z.string().describe("The view ID (prefix: viw...)"),
    }),
    annotations: { readOnlyHint: true },
  },
  ({ tableId, viewId }) => run(() => client.getView(tableId, viewId))
);

server.registerTool(
  "teable_create_view",
  {
    description:
      "Create a new view for a table. View types: grid | form | calendar | kanban | gallery | gantt | plugin.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      name: z.string().describe("View name"),
      type: z
        .enum(["grid", "form", "calendar", "kanban", "gallery", "gantt", "plugin"])
        .optional()
        .default("grid")
        .describe("View type (default: grid)"),
    }),
    annotations: { readOnlyHint: false },
  },
  ({ tableId, name, type }) => run(() => client.createView(tableId, { name, type }))
);

server.registerTool(
  "teable_delete_view",
  {
    description: "Delete a view from a table.",
    inputSchema: z.object({
      tableId: z.string().describe("The table ID"),
      viewId: z.string().describe("The view ID to delete"),
    }),
    annotations: { destructiveHint: true },
  },
  ({ tableId, viewId }) =>
    run(async () => { await client.deleteView(tableId, viewId); return { deleted: true }; })
);

// ── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
