/**
 * NoteSys API 服务层
 * 封装笔记整理 API 调用和 SSE 流式进度监听
 */

const API_BASE = 'http://localhost:8000';

// ---- 请求/响应类型 ----

export interface OrganizeParams {
  markdown_content: string;
  enable_image_semantic?: boolean | null;
  enable_note_format?: boolean | null;
  enable_classify_and_save?: boolean | null;
  enable_embedding?: boolean | null;
}

interface OrganizeTaskResponse {
  task_id: string;
  message: string;
}

export interface OrganizeProgress {
  step: string;
  progress: number;
  message: string;
}

export interface OrganizeResult {
  success: boolean;
  /** 处理后的 markdown 内容（未启用 classify_save 时返回） */
  processed_content?: string;
  /** 分类后的存储路径（启用 classify_save 时返回） */
  note_path?: string;
  category?: string;
  subcategory?: string;
  title?: string;
  chunks?: number;
  token_summary?: Record<string, unknown>;
}

export interface OrganizeError {
  step: string;
  error: string;
}

export interface SSECallbacks {
  onProgress?: (data: OrganizeProgress) => void;
  onResult?: (data: OrganizeResult) => void;
  onError?: (data: OrganizeError) => void;
}

// ---- 步骤名称映射 ----

const STEP_LABELS: Record<string, string> = {
  image_semantic: '提取语义',
  note_format: '整理笔记',
  classify_save: '分类存储',
  classify_and_save: '分类存储',
  embedding: '向量嵌入',
};

export function getStepLabel(step: string): string {
  return STEP_LABELS[step] || step;
}

// ---- API 调用 ----

/**
 * 提交笔记整理任务
 */
export async function organizeNote(params: OrganizeParams): Promise<string> {
  const res = await fetch(`${API_BASE}/api/organize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API 请求失败 (${res.status}): ${text}`);
  }

  const data: OrganizeTaskResponse = await res.json();
  return data.task_id;
}

/**
 * 订阅整理任务的 SSE 进度流
 * 返回一个 cleanup 函数用来关闭连接
 */
export function subscribeOrganizeProgress(
  taskId: string,
  callbacks: SSECallbacks,
): () => void {
  const url = `${API_BASE}/api/organize/${taskId}/stream`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('progress', (e) => {
    try {
      const data: OrganizeProgress = JSON.parse(e.data);
      callbacks.onProgress?.(data);
    } catch { /* ignore parse errors */ }
  });

  eventSource.addEventListener('result', (e) => {
    try {
      const data: OrganizeResult = JSON.parse(e.data);
      callbacks.onResult?.(data);
    } catch { /* ignore parse errors */ }
    eventSource.close();
  });

  eventSource.addEventListener('error', (e) => {
    // SSE error event may be a connection error or server-sent error
    if (e instanceof MessageEvent && e.data) {
      try {
        const data: OrganizeError = JSON.parse(e.data);
        callbacks.onError?.(data);
      } catch { /* ignore parse errors */ }
    } else {
      callbacks.onError?.({ step: 'connection', error: '连接中断' });
    }
    eventSource.close();
  });

  return () => eventSource.close();
}

// ======== Query API ========

export interface QueryParams {
  query: string;
  top_k?: number;
  enable_rewrite?: boolean | null;
  enable_synthesis?: boolean | null;
}

export interface RelatedNote {
  note_path: string;
  note_title: string;
  score: number;
}

export interface QueryResult {
  success: boolean;
  answer?: string;
  related_notes?: RelatedNote[];
  token_summary?: Record<string, unknown>;
  error?: string;
}

export interface QueryProgress {
  step: string;
  progress: number;
  message: string;
}

export interface QueryError {
  step: string;
  error: string;
}

export interface QuerySSECallbacks {
  onProgress?: (data: QueryProgress) => void;
  onResult?: (data: QueryResult) => void;
  onError?: (data: QueryError) => void;
}

/**
 * 提交笔记查询任务
 */
export async function queryNote(params: QueryParams): Promise<string> {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`查询请求失败 (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.task_id;
}

/**
 * 订阅查询任务的 SSE 进度流
 */
export function subscribeQueryProgress(
  taskId: string,
  callbacks: QuerySSECallbacks,
): () => void {
  const url = `${API_BASE}/api/query/${taskId}/stream`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('progress', (e) => {
    try {
      const data: QueryProgress = JSON.parse(e.data);
      callbacks.onProgress?.(data);
    } catch { /* ignore */ }
  });

  eventSource.addEventListener('result', (e) => {
    try {
      const data: QueryResult = JSON.parse(e.data);
      callbacks.onResult?.(data);
    } catch { /* ignore */ }
    eventSource.close();
  });

  eventSource.addEventListener('error', (e) => {
    if (e instanceof MessageEvent && e.data) {
      try {
        const data: QueryError = JSON.parse(e.data);
        callbacks.onError?.(data);
      } catch { /* ignore */ }
    } else {
      callbacks.onError?.({ step: 'connection', error: '连接中断' });
    }
    eventSource.close();
  });

  return () => eventSource.close();
}

