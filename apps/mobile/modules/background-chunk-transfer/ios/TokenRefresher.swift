import Foundation

/// Mirrors customBaseQuery.js's silent-refresh contract exactly (see the Android
/// TokenRefresher.kt for the same contract): POST /api/v1/auth/refresh with X-Refresh-Token
/// header, response {data: {accessToken, refreshToken}}, both tokens persisted back to the
/// same Keychain entries JS reads from.
enum TokenRefresher {
  enum RefreshError: Error {
    case noRefreshToken
    case httpFailure(Int)
    case malformedResponse
  }

  static func refresh(session: URLSession, baseUrl: String) throws -> String {
    guard let refreshToken = SecureStoreReader.readValue(key: "refresh_token") else {
      throw RefreshError.noRefreshToken
    }

    guard let url = URL(string: "\(baseUrl)/api/v1/auth/refresh") else {
      throw RefreshError.malformedResponse
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("mobile", forHTTPHeaderField: "X-Platform")
    request.setValue(refreshToken, forHTTPHeaderField: "X-Refresh-Token")

    let semaphore = DispatchSemaphore(value: 0)
    var resultData: Data?
    var resultResponse: URLResponse?
    var resultError: Error?

    session.dataTask(with: request) { data, response, error in
      resultData = data
      resultResponse = response
      resultError = error
      semaphore.signal()
    }.resume()
    semaphore.wait()

    if let resultError {
      throw resultError
    }
    guard let httpResponse = resultResponse as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
      let code = (resultResponse as? HTTPURLResponse)?.statusCode ?? -1
      throw RefreshError.httpFailure(code)
    }
    guard let data = resultData,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let payload = json["data"] as? [String: Any],
          let newAccessToken = payload["accessToken"] as? String,
          let newRefreshToken = payload["refreshToken"] as? String else {
      throw RefreshError.malformedResponse
    }

    SecureStoreWriter.writeValue(key: "access_token", value: newAccessToken)
    SecureStoreWriter.writeValue(key: "refresh_token", value: newRefreshToken)

    return newAccessToken
  }
}
