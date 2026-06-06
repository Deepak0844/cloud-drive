---
type: plan-doc
status: draft
date: 2026-06-06
promotes-to: none
---

# Fix 8 code-review findings on docker-setup branch

**Status:** Approved. Execution in progress.
**Branch:** docker-setup
**Plan tier:** Full Design Doc.

## Session log

None.

## Files this plan touches

| File                                          | Op     | Purpose                                                                                                         |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `apps/web/Dockerfile`                         | Modify | Restore `apps/server/package.json` copy; remove `--ignore-scripts` so esbuild/rollup postinstall runs           |
| `apps/server/middlewares/uploadMiddleware.js` | Modify | Add modern IANA MIME aliases alongside legacy x- variants                                                       |
| `apps/server/services/fileService.js`         | Modify | Fix isClaimedText (SVG/XML), add ALLOWED_MIME_TYPES check in null branch, recompute category from finalMimeType |
| `apps/web/nginx.conf`                         | Modify | Fix open redirect ($host → hardcoded hostname), reduce HSTS max-age                                             |
| `apps/server/services/chunkedService.js`      | None   | No change needed — fix 5.3-C makes `finalizeUploadedFile` self-consistent; call site is unaffected              |

## 1. Goal

Fix all 8 confirmed findings from the 2026-06-06 code review of the `docker-setup` branch. The fixes span two Docker build failures, three upload validation regressions (MKV/AVI/AIFF/SVG rejected; MIME allowlist bypassed for text files), one open redirect in nginx, a data-integrity bug in chunked upload category storage, and an HSTS misconfiguration.

## 2. Success criteria

1. `docker build -f apps/web/Dockerfile .` completes without error on Linux (currently fails at `npm ci` with workspace resolution error).
2. `docker build -f apps/server/Dockerfile .` completes without error on Linux (unchanged — verifies no regression).
3. A valid `.mkv` file uploaded returns HTTP 200; its `mime_type` in the DB is `video/matroska` or `video/x-matroska` (not rejected with `FILE_TYPE_NOT_ALLOWED`).
4. A valid `.svg` file uploaded returns HTTP 200 (currently rejected).
5. A file with claimed `Content-Type: text/html` that is not in `ALLOWED_MIME_TYPES` is rejected with `FILE_TYPE_NOT_ALLOWED`.
6. `curl -v -H "Host: evil.com" http://<server>/` returns `301` to `https://localhost/` (not `https://evil.com/`).
7. A chunked upload of a video file whose extension is unknown has `category: VIDEO` in the DB record (not `OTHER`).
8. No existing upload paths regress: PDF, MP4, PNG, plain-text upload all return HTTP 200.

## 3. Architecture

The five changes are independent — each touches a different concern and can be applied in any order. No new abstractions, no new files.

The only coupling is that `finalizeUploadedFile` (fileService.js) now calls `MetadataService.getCategory` internally — but `MetadataService` is already imported in that file (line 30), so no new dependency is introduced.

## 4. Files to create

None.

## 5. Files to modify

### 5.1 `apps/web/Dockerfile`

**Fix A — restore `apps/server/package.json` copy (build failure)**

The root `package.json` declares `workspaces: ["apps/*", "shared/*"]`. npm ci resolves
all workspace members before applying `--workspace` filter. Without `apps/server/package.json`
in the build context, npm exits with a workspace resolution error.

Remove lines 22–24 (the "Do NOT copy" comment) and line 27, and replace with:

```dockerfile
# Must copy ALL workspace package.json files — the root lockfile references every workspace.
# apps/server/package.json is needed for workspace resolution even though we build web only.
COPY package.json package-lock.json turbo.json ./
COPY shared/ ./shared/
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
```

**Fix B — remove `--ignore-scripts` (build failure)**

esbuild and rollup select their platform binary via a `postinstall` script.
`--ignore-scripts` silences those hooks, leaving no Linux native binary; `npm run build` then
fails. The web workspace has no native C++ addons, so `--ignore-scripts` provides no benefit.

Change line 30 from:

```dockerfile
RUN npm ci --workspace=cloud-drive-web --include-workspace-root --ignore-scripts
```

to:

```dockerfile
RUN npm ci --workspace=cloud-drive-web --include-workspace-root
```

### 5.2 `apps/server/middlewares/uploadMiddleware.js`

**Fix — add modern IANA aliases for file-type v22 (upload rejection regression)**

`file-type` v22 returns IANA-standard MIME types. Several formats in `ALLOWED_MIME_TYPES`
use legacy `x-` variants that file-type never returns, so valid files pass multer but are
rejected at the magic bytes check. Add the modern aliases immediately after each x- entry:

```js
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/vnd.avi",         // file-type v22 returns this for AVI, not video/x-msvideo
  "video/x-matroska",
  "video/matroska",        // file-type v22 returns this for MKV, not video/x-matroska
  "video/x-flv",
  "video/mpeg",
  "video/3gpp",
  "video/ogg",
  "video/x-ms-wmv",
  "video/x-ms-asf",        // file-type v22 returns this for WMV/ASF containers
  "video/mp2t",
  // Audio
  "audio/mpeg",
  "audio/flac",
  "audio/ogg",
  "audio/wav",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/opus",
  "audio/webm",
  "audio/x-aiff",
  "audio/aiff",            // file-type v22 returns this for AIFF, not audio/x-aiff
  "audio/x-ms-wma",
  "audio/x-ms-asf",        // file-type v22 returns this for WMA/ASF containers
```

### 5.3 `apps/server/services/fileService.js`

Three bugs in `finalizeUploadedFile` (lines 462–479), fixed together:

**Fix A+B — SVG rejected + null branch bypasses ALLOWED_MIME_TYPES (combined)**

`image/svg+xml` (and all text/XML types) have no binary magic bytes, so `fileTypeFromFile`
returns null for them. The old `isClaimedText` guard didn't include `image/svg+xml`, causing
SVG rejections. Additionally, even when `isClaimedText` was true, the claimed MIME was never
checked against `ALLOWED_MIME_TYPES`, allowing any `text/*` type through regardless of the
allowlist.

Both issues are resolved by removing the `isClaimedText`/`isNoMagicBytes` variable entirely
and replacing the null branch with a single allowlist check. Delete line 464 and replace
lines 466–471:

```js
// Before (lines 464 and 466–471):
const isClaimedText = mimeType.startsWith("text/") || mimeType === "application/csv" || mimeType === "application/json";

if (!fileTypeResult) {
  if (!isClaimedText) {
    logger.warn(`...`);
    await fs.promises.unlink(finalUploadPath).catch(() => {});
    throw new AppError(ErrorMessages.FILE_TYPE_NOT_ALLOWED, HttpStatus.BAD_REQUEST);
  }
}

// After (lines 464 deleted; replace lines 466–471):
if (!fileTypeResult) {
  // file-type returned null: text/XML/JSON/SVG have no binary signature and are expected.
  // Any other claimed type is rejected unless it is in the allowlist.
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    logger.warn(
      `[Upload] Rejected ${originalName}: no magic bytes detected and '${mimeType}' is not in the allowlist.`
    );
    await fs.promises.unlink(finalUploadPath).catch(() => {});
    throw new AppError(ErrorMessages.FILE_TYPE_NOT_ALLOWED, HttpStatus.BAD_REQUEST);
  }
}
```

This eliminates the hardcoded no-magic-bytes enumeration. Any type added to `ALLOWED_MIME_TYPES`
in the future is automatically accepted in the null branch without a second edit.

**Fix C — category diverges from finalMimeType (data integrity)**

`category` is passed in from the caller (computed from the client-supplied MIME before magic
bytes detection). If `finalMimeType` is updated by detection, `category` is stale. Since
`MetadataService` is already imported (line 30), recompute `finalCategory` from `finalMimeType`
after the magic bytes block and use it for both the video-optimization check and the DB record.

Insert after line 479 (the end of the magic bytes block):

```js
// Recompute category from the verified MIME — the caller's category may have been
// derived from a fallback MIME (e.g. application/octet-stream) before detection ran.
const finalCategory = MetadataService.getCategory(finalMimeType, originalName);
```

Then replace every subsequent reference to `category` in this function with `finalCategory`:

- Line 482: `if (category === FileCategories.VIDEO)` → `if (finalCategory === FileCategories.VIDEO)`
- Line 511: `category` arg in `MetadataService.extractMetadata(finalUploadPath, category)` → `finalCategory`
- Line 559: `category,` in the DB record → `category: finalCategory,`

After this substitution, the `category` parameter in the function's destructured arguments (line 450) is received but never read. It is intentionally kept in the signature to avoid touching both call sites (`processUpload` line 598 and `assembleAndFinalize` line 235) in this PR — callers that already derive category correctly are unaffected. Add a trailing comment on the parameter: `category, // caller-supplied; overridden by finalCategory after magic-bytes verification`.

### 5.4 `apps/web/nginx.conf`

**Fix A — open redirect via `$host` (security)**

`$host` resolves to the incoming `Host` request header. A crafted `Host: evil.com` header
produces a redirect to `https://evil.com/...`. Replace `$host` with `localhost` (the
CN in the self-signed cert) so the redirect target is always the expected hostname.

Replace line 5:

```nginx
# Before:
return 301 https://$host$request_uri;

# After:
return 301 https://localhost$request_uri;
```

**Fix B — HSTS max-age too long for a LAN self-signed cert (availability risk)**

`max-age=31536000` (1 year) means any browser that visits will require HTTPS for a year.
If the cert is regenerated or the Docker image is rebuilt, those browsers get hard security
errors with no override path. Use 5 minutes for a LAN/dev server.

Replace line 30:

```nginx
# Before:
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# After:
# 5-minute HSTS — safe for LAN/dev where cert may be regenerated.
# Increase to max-age=31536000 only with a stable, externally-trusted certificate.
add_header Strict-Transport-Security "max-age=300" always;
```

Note: `includeSubDomains` is also removed — it applies HSTS to all subdomains of `localhost`,
which is not meaningful and causes unintended effects in some browsers.

### 5.5 `apps/server/services/chunkedService.js`

No change. Fix 5.3-C makes `finalizeUploadedFile` self-consistent: after the magic bytes block,
`finalCategory` replaces _all_ uses of the incoming `category` parameter — including the
video-optimization check (line 482) and the DB record (line 559). The `category` value passed
from `assembleAndFinalize` (line 235) is received by `finalizeUploadedFile` but is not read
after `finalCategory` is computed. The call site does not need to change.

## 6. Approach

Apply fixes in this order (each is independent and verifiable on its own):

1. `apps/server/middlewares/uploadMiddleware.js` — add IANA aliases (most impactful, unblocks upload testing)
2. `apps/server/services/fileService.js` — all three sub-fixes in one edit (they are in the same 17-line block)
3. `apps/web/nginx.conf` — redirect and HSTS fixes
4. `apps/web/Dockerfile` — restore server package.json copy + remove --ignore-scripts

## 7. Open sub-decisions to confirm during execution

1. **nginx hostname**: The plan uses `localhost` as the hardcoded redirect target (matching the CN in the self-signed cert). Confirm before applying 5.4-A whether the LAN hostname in use is `localhost`, an IP, or a custom DNS name — if the server is accessed via `192.168.x.x` or a custom name, the redirect target should match. **Confirm at Stage 2 before touching nginx.conf.**

## 8. Verification

| Criterion                              | Command / check                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| SC1: web Docker build succeeds         | `docker build -f apps/web/Dockerfile . --no-cache` exits 0                                                     |
| SC2: server Docker build no regression | `docker build -f apps/server/Dockerfile . --no-cache` exits 0                                                  |
| SC3: MKV upload accepted               | Upload a `.mkv` file via the API; expect HTTP 200 and `mime_type` in response is `video/matroska`              |
| SC4: SVG upload accepted               | Upload a `.svg` file via the API; expect HTTP 200                                                              |
| SC5: unlisted text MIME rejected       | Upload a file with `Content-Type: text/html` where `text/html` is not in `ALLOWED_MIME_TYPES`; expect HTTP 400 |
| SC6: nginx redirect target fixed       | `curl -v -H "Host: evil.com" http://localhost:80/` → `Location: https://localhost/`                            |
| SC7: chunked video category correct    | Complete a chunked upload of an MP4 with no client mimeType; DB record has `category: VIDEO`                   |
| SC8: regression — PDF, PNG, MP4, text  | Upload one of each; all return HTTP 200                                                                        |

## 9. Out of scope

- Switching from a self-signed cert to Let's Encrypt or a LAN CA — the cert strategy is a separate decision.
- Increasing HSTS max-age for production — requires a stable cert and is a deployment decision.
- Updating `server_name _` to a specific LAN hostname globally — hostname is environment-specific; tracked as open sub-decision 7.1.
- Adding regression tests for the upload paths — no test infrastructure exists for upload integration tests on this branch.
- Fixing the `audio/ogg; codecs=opus` parameterized MIME edge case — `file-type` returns a MIME with a codec parameter for Opus-in-OGG. This requires a normalize/strip-params step that is a separate scope of work.

## 10. Risk register

| Risk                                                                                                               | Likelihood | Impact                                                                                                                                                                                                   | Mitigation                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Adding `apps/server/package.json` to web build context re-introduces the cache bust the author was trying to avoid | High       | Low (slower builds, not broken)                                                                                                                                                                          | Accepted — correctness over cache optimization; a future improvement could use a multi-stage approach with a stub server manifest |
| Removing `--ignore-scripts` runs server's native-addon postinstall scripts in the web builder stage                | Low        | Low — web workspace has no native addons; the only scripts that run belong to esbuild/rollup which are needed                                                                                            | Mitigated by the fact that `--workspace=cloud-drive-web` scopes the install; server scripts do not run in this context            |
| `finalCategory` diverges from the caller's `category` in `processUpload` (single-file upload path)                 | Low        | Low — `processUpload` passes `MetadataService.getCategory(fileObj.mimetype, ...)` which is already MIME-based; if file-type updates `finalMimeType`, `finalCategory` will also reflect that — consistent | No action needed                                                                                                                  |
| nginx redirect to `localhost` breaks access via IP or custom LAN hostname                                          | Medium     | Medium — HTTPS redirect sends users to `localhost` even when they connected via IP                                                                                                                       | Flagged as open sub-decision 7.1; confirm hostname before applying                                                                |
