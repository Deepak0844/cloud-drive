export const CHUNK_SIZE = 5 * 1024 * 1024;

export function totalChunksFor(fileSize) {
  return Math.ceil(fileSize / CHUNK_SIZE);
}
