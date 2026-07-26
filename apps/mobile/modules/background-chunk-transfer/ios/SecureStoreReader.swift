import Foundation
import Security

/// Reads values written by expo-secure-store's default (unauthenticated, no custom
/// keychainService) keychain directly, without going through the JS bridge. Mirrors
/// expo-secure-store's own SecureStoreModule.swift query format exactly: same kSecClass,
/// same "app:no-auth" service string, same generic/account attributes keyed by the raw key
/// bytes. Unlike Android, iOS's Keychain stores the value as plain UTF8 data directly — no
/// extra encryption layer to replicate, since the Keychain itself handles that transparently.
enum SecureStoreReader {
  private static let defaultService = "app:no-auth"

  static func readValue(key: String) -> String? {
    let encodedKey = Data(key.utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: defaultService,
      kSecAttrGeneric as String: encodedKey,
      kSecAttrAccount as String: encodedKey,
      kSecMatchLimit as String: kSecMatchLimitOne,
      kSecReturnData as String: kCFBooleanTrue as Any
    ]

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)

    guard status == errSecSuccess, let data = item as? Data else {
      return nil
    }
    return String(data: data, encoding: .utf8)
  }
}
