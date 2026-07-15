package expo.modules.backgroundchunktransfer

import android.content.Context
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec

/**
 * Reads values written by expo-secure-store's default (unauthenticated, "key_v1") keychain
 * directly, without going through the JS bridge. Mirrors the storage scheme in
 * expo-secure-store's SecureStoreModule/AESEncryptor exactly: same SharedPreferences file,
 * same key-derivation, same AndroidKeyStore alias, same AES/GCM/NoPadding cipher.
 */
object SecureStoreReader {
  private const val SHARED_PREFERENCES_NAME = "SecureStore"
  private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
  private const val DEFAULT_KEYCHAIN_SERVICE = "key_v1"
  private const val AES_CIPHER = "AES/GCM/NoPadding"

  fun readValue(context: Context, key: String): String? {
    val prefs = context.getSharedPreferences(SHARED_PREFERENCES_NAME, Context.MODE_PRIVATE)
    val prefsKey = "$DEFAULT_KEYCHAIN_SERVICE-$key"
    val encryptedItemString = prefs.getString(prefsKey, null) ?: return null

    val encryptedItem = JSONObject(encryptedItemString)
    val ciphertext = Base64.decode(encryptedItem.getString("ct"), Base64.DEFAULT)
    val iv = Base64.decode(encryptedItem.getString("iv"), Base64.DEFAULT)
    val tagLength = encryptedItem.getInt("tlen")

    val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
    keyStore.load(null)
    val alias = "$AES_CIPHER:$DEFAULT_KEYCHAIN_SERVICE:keystoreUnauthenticated"
    val secretKeyEntry = keyStore.getEntry(alias, null) as? KeyStore.SecretKeyEntry ?: return null

    val cipher = Cipher.getInstance(AES_CIPHER)
    cipher.init(Cipher.DECRYPT_MODE, secretKeyEntry.secretKey, GCMParameterSpec(tagLength, iv))
    return String(cipher.doFinal(ciphertext), Charsets.UTF_8)
  }
}
