/**
 * NoteSys + ragData API 服务层
 * - notesys: 笔记整理 API（端口 48002）
 * - ragdata: 向量检索 API（端口 48001）
 */

const NOTESYS_BASE = 'http://localhost:48002';
const RAGDATA_BASE = 'http://localhost:48001';

// ======== Organize API (notesys) ========

// ---- 请求/响应类型 ----

export interface OrganizeParams {
  markdown_content: string;
  notes_root_path?: string | null;
  images_dir?: string | null;
  enable_image_semantic?: boolean | null;
  enable_note_format?: boolean | null;
  enable_classify_and_save?: boolean | null;
  add_date_stamp?: boolean;
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
  note_classify: '分类存储',
  classify_save: '分类存储',
  classify_and_save: '分类存储',
  file_save: '保存文件',
};

export function getStepLabel(step: string): string {
  return STEP_LABELS[step] || step;
}

// ---- API 调用 ----

/**
 * 提交笔记整理任务
 */
export async function organizeNote(params: OrganizeParams): Promise<string> {
  const res = await fetch(`${NOTESYS_BASE}/api/organize`, {
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
  const url = `${NOTESYS_BASE}/api/organize/${taskId}/stream`;
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

// ======== Search API (ragdata) ========

export interface RagdataSearchParams {
  q: string;
  collections?: string[];
  top_k?: number;
}

export interface RagdataFileResult {
  file: string;
  collection: string;
  max_score: number;
  chunk_count: number;
}

export interface RagdataSearchResponse {
  query: string;
  by_file: RagdataFileResult[];
  by_chunk: Array<{
    file: string;
    collection: string;
    score: number;
    heading: string;
    text: string;
  }>;
}

/** UI 层使用的搜索结果类型 */
export interface RelatedNote {
  note_path: string;
  note_title: string;
  score: number;
}

/**
 * 向 ragdata 发起同步向量检索，返回 RelatedNote[] 供 UI 使用
 */
export async function searchNotes(
  query: string,
  topK: number = 10,
): Promise<RelatedNote[]> {
  const res = await fetch(`${RAGDATA_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, top_k: topK }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`搜索请求失败 (${res.status}): ${text}`);
  }

  const data: RagdataSearchResponse = await res.json();

  // 将 ragdata by_file 结果映射为 RelatedNote 格式
  return data.by_file.map(f => ({
    note_path: f.file,
    note_title: extractTitle(f.file),
    score: Math.round(f.max_score * 100),
  }));
}

function extractTitle(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  return fileName.replace(/\.\w+$/, '');
}
