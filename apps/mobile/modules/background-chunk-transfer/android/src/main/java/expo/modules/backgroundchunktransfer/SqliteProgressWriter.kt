package expo.modules.backgroundchunktransfer

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Writes directly to the `transfers` table in the same app.db that expo-sqlite/Drizzle manages on
 * the JS side, so progress survives while JS isn't running. app.db is in rollback-journal mode (not
 * WAL), so writes use a busy timeout and stay single-statement/autocommit to minimize lock contention.
 */
object SqliteProgressWriter {
  private const val DB_NAME = "app.db"
  private const val BUSY_TIMEOUT_MS = 5000

  private fun nowIso(): String {
    val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(Date())
  }

  private fun open(context: Context): SQLiteDatabase {
    // expo-sqlite stores databases under files/SQLite, not the default databases/ dir
    // (confirmed on-device: /data/data/<pkg>/files/SQLite/app.db).
    val dbPath = java.io.File(context.filesDir, "SQLite/$DB_NAME")
    val db = SQLiteDatabase.openDatabase(dbPath.path, null, SQLiteDatabase.OPEN_READWRITE)
    // PRAGMA busy_timeout returns a result row; Android's execSQL() rejects any statement that does.
    db.rawQuery("PRAGMA busy_timeout = $BUSY_TIMEOUT_MS", null).use { it.moveToFirst() }
    return db
  }

  fun updateProgress(context: Context, transferId: String, progress: Double, uploadedChunks: Int) {
    open(context).use { db ->
      val values = ContentValues().apply {
        put("progress", progress)
        put("uploaded_chunks", uploadedChunks)
        put("updated_at", nowIso())
      }
      db.update("transfers", values, "id = ?", arrayOf(transferId))
    }
  }

  fun markComplete(context: Context, transferId: String) {
    open(context).use { db ->
      val values = ContentValues().apply {
        put("status", "complete")
        putNull("resume_data")
        putNull("uploaded_chunks")
        put("updated_at", nowIso())
      }
      db.update("transfers", values, "id = ?", arrayOf(transferId))
    }
  }

  fun markFailed(context: Context, transferId: String, retryCount: Int) {
    open(context).use { db ->
      val values = ContentValues().apply {
        put("status", "failed")
        put("retry_count", retryCount)
        put("updated_at", nowIso())
      }
      db.update("transfers", values, "id = ?", arrayOf(transferId))
    }
  }

  fun markPaused(context: Context, transferId: String) {
    open(context).use { db ->
      val values = ContentValues().apply {
        put("status", "paused")
        put("updated_at", nowIso())
      }
      db.update("transfers", values, "id = ?", arrayOf(transferId))
    }
  }

  fun markCancelled(context: Context, transferId: String) {
    open(context).use { db ->
      val values = ContentValues().apply {
        put("status", "cancelled")
        put("updated_at", nowIso())
      }
      db.update("transfers", values, "id = ?", arrayOf(transferId))
    }
  }
}
