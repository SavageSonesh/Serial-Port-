import type {
  Clip,
  GenerationSettings,
  HealthStatus,
  Project,
  ProjectStatusPayload,
  Transcript,
} from "../types";

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers:
        options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json", ...(options.headers || {}) }
          : options.headers,
      ...options,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the ViralCut AI backend. Make sure it is running at http://localhost:8000.",
      0
    );
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => request<HealthStatus>("/health"),

  listProjects: () => request<Project[]>("/projects"),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  renameProject: (id: string, name: string) =>
    request<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteProject: (id: string) => request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),
  transcript: (id: string) => request<Transcript>(`/projects/${id}/transcript`),

  uploadProject: (file: File, onProgress?: (pct: number) => void): Promise<Project> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}/projects/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          let detail = `Upload failed (${xhr.status})`;
          try {
            detail = JSON.parse(xhr.responseText).detail || detail;
          } catch {
            // ignore
          }
          reject(new ApiError(detail, xhr.status));
        }
      };
      xhr.onerror = () => reject(new ApiError("Upload failed. Check your connection to the backend.", 0));
      const form = new FormData();
      form.append("file", file);
      xhr.send(form);
    });
  },

  startProcessing: (projectId: string, settings: GenerationSettings) =>
    request<ProjectStatusPayload>(`/projects/${projectId}/process`, {
      method: "POST",
      body: JSON.stringify(settings),
    }),
  getStatus: (projectId: string) => request<ProjectStatusPayload>(`/projects/${projectId}/status`),

  listClips: (projectId: string) => request<Clip[]>(`/projects/${projectId}/clips`),
  getClip: (clipId: string) => request<Clip>(`/clips/${clipId}`),
  updateClip: (clipId: string, patch: Partial<Clip> & { subtitle_settings?: object }) =>
    request<Clip>(`/clips/${clipId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  regenerateClip: (clipId: string) => request<Clip>(`/clips/${clipId}/regenerate`, { method: "POST" }),
  deleteClip: (clipId: string) => request<{ ok: boolean }>(`/clips/${clipId}`, { method: "DELETE" }),
  uploadWatermark: (clipId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Clip>(`/clips/${clipId}/watermark`, { method: "POST", body: form });
  },

  clipVideoUrl: (clipId: string) => `${BASE}/clips/${clipId}/video`,
  clipThumbnailUrl: (clipId: string) => `${BASE}/clips/${clipId}/thumbnail`,
  clipDownloadUrl: (clipId: string) => `${BASE}/clips/${clipId}/download`,
  clipSrtUrl: (clipId: string) => `${BASE}/clips/${clipId}/srt`,
  clipVttUrl: (clipId: string) => `${BASE}/clips/${clipId}/vtt`,
  projectVideoUrl: (projectId: string) => `${BASE}/projects/${projectId}/video`,
  projectThumbnailUrl: (projectId: string) => `${BASE}/projects/${projectId}/thumbnail`,
  projectExportZipUrl: (projectId: string) => `${BASE}/projects/${projectId}/export/zip`,
};
