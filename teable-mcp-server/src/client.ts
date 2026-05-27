export interface TeableRecord {
  id: string;
  name?: string;
  fields: Record<string, unknown>;
  autoNumber?: number;
  createdTime?: string;
  lastModifiedTime?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface TeableRecordsResponse {
  records: TeableRecord[];
  total?: number;
  offset?: number;
}

export interface ListRecordsParams {
  take?: number;
  skip?: number;
  viewId?: string;
  fieldKeyType?: "name" | "id" | "dbFieldName";
  cellFormat?: "json" | "text";
  projection?: string[];
  filter?: string;
  orderBy?: string;
  search?: string;
  ignoreViewQuery?: boolean;
}

export class TeableClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | string[]>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          value.forEach((v) => url.searchParams.append(`${key}[]`, String(v)));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Teable API ${res.status} ${res.statusText}: ${errText}`);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  // ── Spaces ──────────────────────────────────────────────────────────────────
  listSpaces() {
    return this.request<unknown[]>("GET", "/space");
  }

  getSpace(spaceId: string) {
    return this.request<unknown>("GET", `/space/${spaceId}`);
  }

  // ── Bases ───────────────────────────────────────────────────────────────────
  listBases(spaceId: string) {
    return this.request<unknown[]>("GET", `/space/${spaceId}/base`);
  }

  getBase(baseId: string) {
    return this.request<unknown>("GET", `/base/${baseId}`);
  }

  createBase(data: { name: string; spaceId: string; icon?: string }) {
    return this.request<unknown>("POST", "/base", data);
  }

  deleteBase(baseId: string) {
    return this.request<void>("DELETE", `/base/${baseId}`);
  }

  // ── Tables ──────────────────────────────────────────────────────────────────
  listTables(baseId: string) {
    return this.request<unknown[]>("GET", `/base/${baseId}/table`);
  }

  getTable(baseId: string, tableId: string) {
    return this.request<unknown>("GET", `/base/${baseId}/table/${tableId}`);
  }

  createTable(
    baseId: string,
    data: {
      name: string;
      description?: string;
      icon?: string;
      fields?: Array<{ type: string; name: string; [k: string]: unknown }>;
    }
  ) {
    return this.request<unknown>("POST", `/base/${baseId}/table`, data);
  }

  deleteTable(baseId: string, tableId: string) {
    return this.request<void>("DELETE", `/base/${baseId}/table/${tableId}`);
  }

  // ── Fields ──────────────────────────────────────────────────────────────────
  listFields(tableId: string, viewId?: string) {
    return this.request<unknown[]>(
      "GET",
      `/table/${tableId}/field`,
      undefined,
      viewId ? { viewId } : undefined
    );
  }

  getField(tableId: string, fieldId: string) {
    return this.request<unknown>("GET", `/table/${tableId}/field/${fieldId}`);
  }

  createField(tableId: string, data: { type: string; name: string; [k: string]: unknown }) {
    return this.request<unknown>("POST", `/table/${tableId}/field`, data);
  }

  updateField(tableId: string, fieldId: string, data: { name?: string; [k: string]: unknown }) {
    return this.request<unknown>("PATCH", `/table/${tableId}/field/${fieldId}`, data);
  }

  deleteField(tableId: string, fieldId: string) {
    return this.request<void>("DELETE", `/table/${tableId}/field/${fieldId}`);
  }

  // ── Records ─────────────────────────────────────────────────────────────────
  listRecords(tableId: string, params?: ListRecordsParams) {
    const queryParams: Record<string, string | number | boolean | string[]> = {};
    if (params) {
      if (params.take !== undefined) queryParams.take = params.take;
      if (params.skip !== undefined) queryParams.skip = params.skip;
      if (params.viewId) queryParams.viewId = params.viewId;
      if (params.fieldKeyType) queryParams.fieldKeyType = params.fieldKeyType;
      if (params.cellFormat) queryParams.cellFormat = params.cellFormat;
      if (params.projection?.length) queryParams.projection = params.projection;
      if (params.filter) queryParams.filter = params.filter;
      if (params.orderBy) queryParams.orderBy = params.orderBy;
      if (params.search) queryParams.search = params.search;
      if (params.ignoreViewQuery !== undefined)
        queryParams.ignoreViewQuery = params.ignoreViewQuery;
    }
    return this.request<TeableRecordsResponse>(
      "GET",
      `/table/${tableId}/record`,
      undefined,
      queryParams
    );
  }

  getRecord(
    tableId: string,
    recordId: string,
    params?: { fieldKeyType?: string; cellFormat?: string }
  ) {
    return this.request<TeableRecord>(
      "GET",
      `/table/${tableId}/record/${recordId}`,
      undefined,
      params as Record<string, string>
    );
  }

  createRecords(
    tableId: string,
    records: Array<{ fields: Record<string, unknown> }>,
    opts?: { fieldKeyType?: string; typecast?: boolean }
  ) {
    return this.request<TeableRecordsResponse>("POST", `/table/${tableId}/record`, {
      fieldKeyType: opts?.fieldKeyType ?? "name",
      typecast: opts?.typecast ?? true,
      records,
    });
  }

  updateRecord(
    tableId: string,
    recordId: string,
    fields: Record<string, unknown>,
    opts?: { fieldKeyType?: string; typecast?: boolean }
  ) {
    return this.request<TeableRecord>("PATCH", `/table/${tableId}/record/${recordId}`, {
      fieldKeyType: opts?.fieldKeyType ?? "name",
      typecast: opts?.typecast ?? true,
      record: { fields },
    });
  }

  updateRecords(
    tableId: string,
    records: Array<{ id: string; fields: Record<string, unknown> }>,
    opts?: { fieldKeyType?: string; typecast?: boolean }
  ) {
    return this.request<TeableRecordsResponse>("PATCH", `/table/${tableId}/record`, {
      fieldKeyType: opts?.fieldKeyType ?? "name",
      typecast: opts?.typecast ?? true,
      records,
    });
  }

  deleteRecord(tableId: string, recordId: string) {
    return this.request<void>("DELETE", `/table/${tableId}/record/${recordId}`);
  }

  deleteRecords(tableId: string, recordIds: string[]) {
    return this.request<void>("DELETE", `/table/${tableId}/record`, { recordIds });
  }

  // ── Views ───────────────────────────────────────────────────────────────────
  listViews(tableId: string) {
    return this.request<unknown[]>("GET", `/table/${tableId}/view`);
  }

  getView(tableId: string, viewId: string) {
    return this.request<unknown>("GET", `/table/${tableId}/view/${viewId}`);
  }

  createView(tableId: string, data: { name: string; type?: string; [k: string]: unknown }) {
    return this.request<unknown>("POST", `/table/${tableId}/view`, data);
  }

  deleteView(tableId: string, viewId: string) {
    return this.request<void>("DELETE", `/table/${tableId}/view/${viewId}`);
  }
}
