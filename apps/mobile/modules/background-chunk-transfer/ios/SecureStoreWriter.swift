import Foundation
import Security

/// Writes values into expo-secure-store's default (unauthenticated) keychain directly,
/// mirroring SecureStoreReader's query format and expo-secure-store's own set()/update()
/// logic (SecItemAdd, falling back to SecItemUpdate on errSecDuplicateItem). Default
/// accessibility (.whenUnlocked, per SecureStoreOptions.swift's default) is used since
/// tokenStorage.js never passes custom options.
enum SecureStoreWriter {
  private static let defaultService = "app:no-auth"

  static func writeValue(key: String, value: String) {
    let encodedKey = Data(key.utf8)
    let valueData = Data(value.utf8)

    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: defaultService,
      kSecAttrGeneric as String: encodedKey,
      kSecAttrAccount as String: encodedKey
    ]

    let addQuery = query.merging([
      kSecValueData as String: valueData,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked
    ]) { _, new in new }

    let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
    if addStatus == errSecSuccess {
      return
    }
    if addStatus == errSecDuplicateItem {
      let updateDictionary: [String: Any] = [kSecValueData as String: valueData]
      SecItemUpdate(query as CFDictionary, updateDictionary as CFDictionary)
    }
  }
}
