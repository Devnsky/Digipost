import {
  User,
  Department,
  DocumentListItem,
  DocumentDetailResponse,
  PaginationResponse,
  DashboardStats,
  NotificationItem,
} from "./types";

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      `Permintaan gagal dengan status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data?.code);
  }

  return data as T;
}

export const api = {
  // Authentication
  auth: {
    login: (username: string, password: string) =>
      request<{ message: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    logout: () =>
      request<{ message: string }>("/api/auth/logout", {
        method: "POST",
      }),
    me: () => request<{ user: User }>("/api/auth/me"),
    changePassword: (old_password: string, new_password: string) =>
      request<{ message: string }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ old_password, new_password }),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, new_password: string) =>
      request<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password }),
      }),
  },

  // Master Data
  departments: {
    list: () => request<Department[]>("/api/departments"),
  },

  // Documents
  documents: {
    getMyDocuments: (params: {
      status?: string;
      search?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params.status) query.set("status", params.status);
      if (params.search) query.set("search", params.search);
      if (params.date_from) query.set("date_from", params.date_from);
      if (params.date_to) query.set("date_to", params.date_to);
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));
      return request<PaginationResponse<DocumentListItem>>(
        `/api/documents/my?${query.toString()}`,
      );
    },

    getCheckerQueue: (params: {
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));
      return request<PaginationResponse<DocumentListItem>>(
        `/api/documents/checker-queue?${query.toString()}`,
      );
    },

    getDepartmentQueue: (params: {
      status?: string;
      search?: string;
      date_from?: string;
      date_to?: string;
      applicant_department_id?: number;
      scope?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params.status) query.set("status", params.status);
      if (params.search) query.set("search", params.search);
      if (params.date_from) query.set("date_from", params.date_from);
      if (params.date_to) query.set("date_to", params.date_to);
      if (params.applicant_department_id)
        query.set("applicant_department_id", String(params.applicant_department_id));
      if (params.scope) query.set("scope", params.scope);
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));
      return request<PaginationResponse<DocumentListItem>>(
        `/api/documents/department-queue?${query.toString()}`,
      );
    },

    getStats: () => request<DashboardStats>("/api/documents/stats"),

    getDetail: (id: number) =>
      request<DocumentDetailResponse>(`/api/documents/${id}`),

    create: (formData: FormData) =>
      request<{ message: string; document: any }>("/api/documents", {
        method: "POST",
        body: formData,
      }),

    updateMetadata: (
      id: number,
      data: { title: string; description?: string; expected_version?: number },
    ) =>
      request<{ message: string; document: any }>(`/api/documents/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    uploadVersion: (id: number, formData: FormData) =>
      request<{ message: string; version: any }>(
        `/api/documents/${id}/versions`,
        {
          method: "POST",
          body: formData,
        },
      ),

    addDepartmentDraft: (
      id: number,
      departmentId: number,
      expectedVersion?: number,
    ) =>
      request<{ message: string }>(`/api/documents/${id}/departments`, {
        method: "POST",
        body: JSON.stringify({
          department_id: departmentId,
          expected_version: expectedVersion,
        }),
      }),

    removeDepartmentDraft: (
      id: number,
      departmentId: number,
      expectedVersion?: number,
    ) => {
      const query = expectedVersion
        ? `?expected_version=${expectedVersion}`
        : "";
      return request<{ message: string }>(
        `/api/documents/${id}/departments/${departmentId}${query}`,
        {
          method: "DELETE",
        },
      );
    },

    submit: (id: number, expectedVersion?: number) =>
      request<{ message: string }>(`/api/documents/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ expected_version: expectedVersion }),
      }),

    deleteDraft: (id: number, expectedVersion?: number) => {
      const query = expectedVersion
        ? `?expected_version=${expectedVersion}`
        : "";
      return request<{ message: string }>(`/api/documents/${id}${query}`, {
        method: "DELETE",
      });
    },

    cancel: (id: number, expectedVersion?: number) =>
      request<{ message: string }>(`/api/documents/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ expected_version: expectedVersion }),
      }),
  },

  // Workflow
  workflow: {
    checkerDecide: (
      id: number,
      data: {
        action: "approve" | "reject" | "revision";
        note?: string;
        expected_version?: number;
      },
    ) =>
      request<{ message: string; document: any }>(
        `/api/workflow/${id}/checker/decide`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),

    checkerComment: (id: number, body: string) =>
      request<{ message: string; response: any }>(
        `/api/workflow/${id}/checker/comment`,
        {
          method: "POST",
          body: JSON.stringify({ body }),
        },
      ),

    deptDecision: (
      id: number,
      deptId: number,
      data: { decision: "approved" | "rejected"; expected_version?: number },
    ) =>
      request<{ message: string; document: any }>(
        `/api/workflow/${id}/departments/${deptId}/decision`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),

    addDepartmentPending: (
      id: number,
      departmentId: number,
      expectedVersion?: number,
    ) =>
      request<{ message: string; department: any }>(
        `/api/workflow/${id}/departments/add-pending`,
        {
          method: "POST",
          body: JSON.stringify({
            department_id: departmentId,
            expected_version: expectedVersion,
          }),
        },
      ),

    deptResponse: (id: number, departmentId: number, body: string) =>
      request<{ message: string; response: any }>(
        `/api/workflow/${id}/departments/response`,
        {
          method: "POST",
          body: JSON.stringify({ department_id: departmentId, body }),
        },
      ),
  },

  // Notifications
  notifications: {
    list: (params: {
      is_read?: boolean;
      event_type?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params.is_read !== undefined)
        query.set("is_read", String(params.is_read));
      if (params.event_type) query.set("event_type", params.event_type);
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));
      return request<{
        items: NotificationItem[];
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/api/notifications?${query.toString()}`);
    },

    markRead: (id: number) =>
      request<{ message: string }>(`/api/notifications/${id}/read`, {
        method: "PATCH",
      }),

    markAllRead: () =>
      request<{ message: string; updatedCount: number }>(
        "/api/notifications/read-all",
        {
          method: "PATCH",
        },
      ),
  },

  // Files
  files: {
    downloadUrl: (documentId: number, versionId: number) =>
      `/api/documents/${documentId}/files/${versionId}/download`,
    previewUrl: (documentId: number, versionId: number, stamped = false) =>
      `/api/documents/${documentId}/files/${versionId}/preview${stamped ? "?stamp=true" : ""}`,
    getDocxPreview: (documentId: number, versionId: number) =>
      request<{ type: "docx"; fileName: string; html: string }>(
        `/api/documents/${documentId}/files/${versionId}/preview`,
      ),
  },
};
