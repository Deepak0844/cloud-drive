import Foundation
import SQLite3

/// Writes directly to the `transfers` table in the same app.db that expo-sqlite/Drizzle manages
/// on the JS side, so progress and status survive while JS isn't running — mirrors
/// SqliteProgressWriter.kt on Android exactly (same table, same column names, same semantics).
/// This is what makes UploadProgressSheet/FileDetailScreen's SQLite-backed UI correct on iOS: a
/// JS-side "write to SQLite when I receive an event" approach would miss the case where a
/// notification action tap cold-relaunches the app specifically to service it — there is no
/// pre-existing JS listener for that transfer in the fresh process, but this Swift code path
/// still runs and persists the state change regardless.
enum SqliteProgressWriter {
  private static let busyTimeoutMs: Int32 = 5000

  private static func nowIso() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    formatter.timeZone = TimeZone(identifier: "UTC")
    formatter.locale = Locale(identifier: "en_US_POSIX")
    return formatter.string(from: Date())
  }

  private static func withDatabase(_ body: (OpaquePointer) -> Void) {
    guard let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
      NSLog("[BackgroundChunkTransfer] #SqliteProgressWriter :: cannot resolve Documents directory")
      return
    }
    let dbPath = documentsDir.appendingPathComponent("SQLite/app.db").path

    var db: OpaquePointer?
    guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK, let db else {
      NSLog("[BackgroundChunkTransfer] #SqliteProgressWriter :: cannot open database - \(dbPath)")
      return
    }
    defer { sqlite3_close(db) }
    sqlite3_busy_timeout(db, busyTimeoutMs)
    body(db)
  }

  private static func exec(_ db: OpaquePointer, sql: String, bind: (OpaquePointer) -> Void) {
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
      NSLog("[BackgroundChunkTransfer] #SqliteProgressWriter :: prepare failed - \(String(cString: sqlite3_errmsg(db)))")
      return
    }
    defer { sqlite3_finalize(statement) }
    bind(statement)
    if sqlite3_step(statement) != SQLITE_DONE {
      NSLog("[BackgroundChunkTransfer] #SqliteProgressWriter :: step failed - \(String(cString: sqlite3_errmsg(db)))")
    }
  }

  // SQLITE_TRANSIENT tells sqlite3 to copy the string immediately, since the Swift String's
  // underlying buffer isn't guaranteed to stay alive for the statement's lifetime otherwise.
  private static let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

  private static func bindText(_ statement: OpaquePointer, _ index: Int32, _ value: String) {
    sqlite3_bind_text(statement, index, value, -1, SQLITE_TRANSIENT)
  }

  static func updateProgress(transferId: String, progress: Double, uploadedChunks: Int) {
    withDatabase { db in
      exec(db, sql: "UPDATE transfers SET progress = ?, uploaded_chunks = ?, updated_at = ? WHERE id = ?") { statement in
        sqlite3_bind_double(statement, 1, progress)
        sqlite3_bind_int(statement, 2, Int32(uploadedChunks))
        bindText(statement, 3, nowIso())
        bindText(statement, 4, transferId)
      }
    }
  }

  static func markComplete(transferId: String) {
    withDatabase { db in
      exec(
        db,
        sql: "UPDATE transfers SET status = 'complete', resume_data = NULL, uploaded_chunks = NULL, updated_at = ? WHERE id = ?"
      ) { statement in
        bindText(statement, 1, nowIso())
        bindText(statement, 2, transferId)
      }
    }
  }

  static func markFailed(transferId: String, retryCount: Int) {
    withDatabase { db in
      exec(db, sql: "UPDATE transfers SET status = 'failed', retry_count = ?, updated_at = ? WHERE id = ?") { statement in
        sqlite3_bind_int(statement, 1, Int32(retryCount))
        bindText(statement, 2, nowIso())
        bindText(statement, 3, transferId)
      }
    }
  }

  static func markPaused(transferId: String) {
    withDatabase { db in
      exec(db, sql: "UPDATE transfers SET status = 'paused', updated_at = ? WHERE id = ?") { statement in
        bindText(statement, 1, nowIso())
        bindText(statement, 2, transferId)
      }
    }
  }

  static func markCancelled(transferId: String) {
    withDatabase { db in
      exec(db, sql: "UPDATE transfers SET status = 'cancelled', updated_at = ? WHERE id = ?") { statement in
        bindText(statement, 1, nowIso())
        bindText(statement, 2, transferId)
      }
    }
  }
}
