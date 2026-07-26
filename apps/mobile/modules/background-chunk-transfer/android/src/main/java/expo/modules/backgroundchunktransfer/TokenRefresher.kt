package expo.modules.backgroundchunktransfer

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

/**
 * Mirrors customBaseQuery.js's silent-refresh contract exactly: POST /api/v1/auth/refresh with
 * X-Refresh-Token header, response {data: {accessToken, refreshToken}}, both tokens persisted
 * back to the same SecureStore entries JS reads from.
 */
object TokenRefresher {
  fun refresh(context: Context, httpClient: OkHttpClient, baseUrl: String): String {
    val refreshToken = SecureStoreReader.readValue(context, "refresh_token")
      ?: throw IllegalStateException("No refresh token available")

    val request = Request.Builder()
      .url("$baseUrl/api/v1/auth/refresh")
      .addHeader("X-Platform", "mobile")
      .addHeader("X-Refresh-Token", refreshToken)
      .post("".toRequestBody(null))
      .build()

    httpClient.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        throw IOException("Token refresh failed: HTTP ${response.code}")
      }
      val body = JSONObject(response.body?.string() ?: "{}")
      val data = body.getJSONObject("data")
      val newAccessToken = data.getString("accessToken")
      val newRefreshToken = data.getString("refreshToken")

      SecureStoreWriter.writeValue(context, "access_token", newAccessToken)
      SecureStoreWriter.writeValue(context, "refresh_token", newRefreshToken)

      return newAccessToken
    }
  }
}
