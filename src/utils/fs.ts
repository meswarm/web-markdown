export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite'
    });
    return dirHandle;
  } catch (error) {
    console.error('Directory picking cancelled or failed:', error);
    return null;
  }
}

// Minimal interface for file system entries we care about
export interface FSEntry {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  children?: FSEntry[]; 
  path: string; // convenient path identifier
  parentDirHandle: FileSystemDirectoryHandle;
}

const IGNORED_DIRS = ['node_modules', 'dist', 'build', '.git', '.vscode', '.idea'];

export async function readDirectoryRecursive(
  dirHandle: FileSystemDirectoryHandle,
  pathPrefix = ''
): Promise<FSEntry[]> {
  const entries: FSEntry[] = [];
  try {
    // @ts-ignore: TS doesn't always know about async iterable dir handles
    for await (const entry of dirHandle.values()) {
      if (entry.name.startsWith('.')) continue; // ignore hidden files/folders

      if (entry.kind === 'file') {
        entries.push({
          name: entry.name,
          kind: 'file',
          handle: entry,
          path: `${pathPrefix}/${entry.name}`,
          parentDirHandle: dirHandle
        });
      } else if (entry.kind === 'directory' && !IGNORED_DIRS.includes(entry.name)) {
        const children = await readDirectoryRecursive(entry as FileSystemDirectoryHandle, `${pathPrefix}/${entry.name}`);
        entries.push({
          name: entry.name,
          kind: 'directory',
          handle: entry,
          children,
          path: `${pathPrefix}/${entry.name}`,
          parentDirHandle: dirHandle
        });
      }
    }
  } catch (err) {
    console.warn('Failed to read directory:', err);
  }
  
  // Sort: directories first, then files alphabetically
  entries.sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });
  
  return entries;
}

export async function readFileText(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}

export async function writeFileText(fileHandle: FileSystemFileHandle, contents: string): Promise<void> {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
  } catch (err) {
    console.error('Failed to write file:', err);
    throw err;
  }
}

/**
 * Ensure the text ends with at least `minLines` empty lines.
 * If the content is empty (new file), we don't add trailing lines.
 * Only appends newlines when the tail doesn't already have enough.
 */
const MIN_TRAILING_LINES = 5;

export function ensureTrailingEmptyLines(text: string): string {
  // Don't touch truly empty content
  if (!text || text.trim().length === 0) return text;

  // Count trailing newlines
  let trailingNewlines = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '\n') {
      trailingNewlines++;
    } else {
      break;
    }
  }

  if (trailingNewlines >= MIN_TRAILING_LINES) return text;

  const needed = MIN_TRAILING_LINES - trailingNewlines;
  return text + '\n'.repeat(needed);
}

export async function copyDirectory(srcHandle: FileSystemDirectoryHandle, destHandle: FileSystemDirectoryHandle): Promise<void> {
  // @ts-ignore
  for await (const entry of srcHandle.values()) {
    if (entry.kind === 'file') {
      const srcFile = await srcHandle.getFileHandle(entry.name);
      const destFile = await destHandle.getFileHandle(entry.name, { create: true });
      const fileData = await srcFile.getFile();
      const writable = await destFile.createWritable();
      await writable.write(fileData);
      await writable.close();
    } else if (entry.kind === 'directory') {
      const srcSubDir = await srcHandle.getDirectoryHandle(entry.name);
      const destSubDir = await destHandle.getDirectoryHandle(entry.name, { create: true });
      await copyDirectory(srcSubDir, destSubDir);
    }
  }
}

export async function renameEntry(
  parentDirHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string,
  kind: 'file' | 'directory'
): Promise<void> {
  if (kind === 'file') {
    const srcFile = await parentDirHandle.getFileHandle(oldName);
    const destFile = await parentDirHandle.getFileHandle(newName, { create: true });
    const fileData = await srcFile.getFile();
    const writable = await destFile.createWritable();
    await writable.write(fileData);
    await writable.close();
    await parentDirHandle.removeEntry(oldName);
  } else if (kind === 'directory') {
    const srcDir = await parentDirHandle.getDirectoryHandle(oldName);
    const destDir = await parentDirHandle.getDirectoryHandle(newName, { create: true });
    await copyDirectory(srcDir, destDir);
    await parentDirHandle.removeEntry(oldName, { recursive: true });
  }
}

// --- Media classification helpers ---

export type MediaType = 'image' | 'video' | 'audio';

const MEDIA_DIR_MAP: Record<MediaType, string> = {
  video: 'videos',
  audio: 'audios',
  image: 'imgs',
};

const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'mkv'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'flac'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'];

export function detectMediaType(fileName: string): MediaType | null {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  return null;
}

export function generateTimestampedName(originalName: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${stamp}_${originalName}`;
}

/**
 * Copy a media file to the classified subdirectory (videos/, audios/, imgs/)
 * with a timestamped name. Supports both FileSystemFileHandle and raw File as source.
 *
 * @returns { relativePath, newFileName } — relative path from vault root for Markdown use.
 */
export async function copyMediaToClassifiedDir(
  rootHandle: FileSystemDirectoryHandle,
  source: FileSystemFileHandle | File,
  mediaType: MediaType,
): Promise<{ relativePath: string; newFileName: string }> {
  const dirName = MEDIA_DIR_MAP[mediaType];
  const targetDir = await rootHandle.getDirectoryHandle(dirName, { create: true });

  // Resolve original name and file data
  let originalName: string;
  let fileData: File;

  if (source instanceof File) {
    originalName = source.name;
    fileData = source;
  } else {
    originalName = source.name;
    fileData = await source.getFile();
  }

  const newFileName = generateTimestampedName(originalName);

  // Write to target directory
  const destHandle = await targetDir.getFileHandle(newFileName, { create: true });
  const writable = await destHandle.createWritable();
  await writable.write(fileData);
  await writable.close();

  return {
    relativePath: `${dirName}/${newFileName}`,
    newFileName,
  };
}
