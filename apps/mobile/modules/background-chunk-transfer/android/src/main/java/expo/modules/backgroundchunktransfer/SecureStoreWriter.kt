package expo.modules.backgroundchunktransfer

import android.content.Context
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher

/**
 * Writes values into expo-secure-store's default (unauthenticated, "key_v1") keychain directly,
 * mirroring SecureStoreReader's scheme. Reuses the AndroidKeyStore key expo-secure-store already
 * created on first JS-side write — does not create a new key, since the app already has a
 * session (a fresh install always writes tokens from JS during login, which creates the key
 * before any native code ever runs).
 */
object SecureStoreWriter {
  private const val SHARED_PREFERENCES_NAME = "SecureStore"
  private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
  private const val DEFAULT_KEYCHAIN_SERVICE = "key_v1"
  private const val AES_CIPHER = "AES/GCM/NoPadding"

  fun writeValue(context: Context, key: String, value: String) {
    val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
    keyStore.load(null)
    val alias = "$AES_CIPHER:$DEFAULT_KEYCHAIN_SERVICE:keystoreUnauthenticated"
    val secretKeyEntry = keyStore.getEntry(alias, null) as? KeyStore.SecretKeyEntry
      ?: throw IllegalStateException("No existing SecureStore key found — expected JS to have written a value under this key already")

    val cipher = Cipher.getInstance(AES_CIPHER)
    cipher.init(Cipher.ENCRYPT_MODE, secretKeyEntry.secretKey)
    val ciphertextBytes = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
    val gcmSpec = cipher.parameters.getParameterSpec(javax.crypto.spec.GCMParameterSpec::class.java)

    val encryptedItem = JSONObject().apply {
      put("ct", Base64.encodeToString(ciphertextBytes, Base64.NO_WRAP))
      put("iv", Base64.encodeToString(gcmSpec.iv, Base64.NO_WRAP))
      put("tlen", gcmSpec.tLen)
      put("scheme", "aes")
      put("usesKeystoreSuffix", true)
      put("keystoreAlias", DEFAULT_KEYCHAIN_SERVICE)
      put("requireAuthentication", false)
    }

    val prefs = context.getSharedPreferences(SHARED_PREFERENCES_NAME, Context.MODE_PRIVATE)
    val prefsKey = "$DEFAULT_KEYCHAIN_SERVICE-$key"
    prefs.edit().putString(prefsKey, encryptedItem.toString()).commit()
  }
}
