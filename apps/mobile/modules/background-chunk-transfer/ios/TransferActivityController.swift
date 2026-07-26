import ActivityKit
import Foundation

/// Thin ActivityKit wrapper mirroring the engine's single-transfer model: at most one Live Activity
/// at a time, held in `activity`. The engine calls this at the same points it drives the progress
/// notification (start / progress / pause / complete / cancel / fail), so all ActivityKit access is
/// confined here. Deployment target is 16.4, so ActivityKit is unconditionally available (no
/// `@available` gating). The user can disable Live Activities, so every entry point tolerates
/// `areActivitiesEnabled == false` and a nil `activity` by doing nothing — the progress notification
/// then remains the sole surface.
final class TransferActivityController {
  static let shared = TransferActivityController()

  private var activity: Activity<TransferActivityAttributes>?
  // The engine touches this from URLSession delegate callbacks and the main queue, so the single slot
  // is guarded. ActivityKit's update/end are async (run off the caller via Task); only the slot
  // read/write is synchronized here.
  private let lock = NSLock()

  private init() {}

  /// True while a Live Activity is live. The engine reads this to suppress progress-tick
  /// notifications — the Activity is the progress surface while it exists. Paused/complete
  /// notifications still fire, but by then the Activity has been ended so `isActive` is false anyway.
  var isActive: Bool {
    lock.lock()
    defer { lock.unlock() }
    return activity != nil
  }

  /// Starts a Live Activity for a new transfer. No-op (leaving the notification path as the surface)
  /// if Live Activities are disabled or the request throws. Adopts/ends stale cards first so a
  /// previous transfer's leftover card can't strand a second one alongside the new one.
  func start(transferId: String, fileName: String, type: String) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

    // ActivityKit keeps cards alive across termination and while paused, but this singleton may be
    // fresh (cold/background relaunch) with a nil slot. Adopt the card belonging to THIS transfer
    // (matched by transferId) so resume re-attaches to its own card; end any other stale cards.
    let survivors = Activity<TransferActivityAttributes>.activities
    if let mine = survivors.first(where: { $0.attributes.transferId == transferId }) {
      for other in survivors where other.id != mine.id {
        Task { await other.end(nil, dismissalPolicy: .immediate) }
      }
      lock.lock()
      activity = mine
      lock.unlock()
      return
    }
    for stale in survivors {
      Task { await stale.end(nil, dismissalPolicy: .immediate) }
    }

    let attributes = TransferActivityAttributes(transferId: transferId, fileName: fileName, transferType: type)
    let state = TransferActivityAttributes.ContentState(progress: 0, state: "active")
    let content = ActivityContent(state: state, staleDate: nil)

    do {
      let requested = try Activity<TransferActivityAttributes>.request(
        attributes: attributes, content: content, pushType: nil
      )
      lock.lock()
      activity = requested
      lock.unlock()
    } catch {
      NSLog("[TransferActivityController] #start :: Activity.request failed - \(error.localizedDescription)")
    }
  }

  /// Pushes a new progress value to the live Activity. The engine already throttles to whole-percent
  /// changes, so no additional throttling here.
  func update(progress: Double) {
    guard let current = currentActivity else { return }
    let state = TransferActivityAttributes.ContentState(progress: progress, state: "active")
    let content = ActivityContent(state: state, staleDate: nil)
    Task {
      await current.update(content)
    }
  }

  /// Flips the live Activity to the paused state WITHOUT ending it, so the card stays on screen with
  /// its Resume button. On iOS the Activity is the sole surface (no paused notification), so it must
  /// persist rather than be dismissed.
  func markPaused(progress: Double) {
    guard let current = currentActivity else { return }
    let state = TransferActivityAttributes.ContentState(progress: progress, state: "paused")
    let content = ActivityContent(state: state, staleDate: nil)
    Task {
      await current.update(content)
    }
  }

  /// Ends the live Activity with a terminal state ("uploaded" | "downloaded" | "failed" |
  /// "cancelled"), leaving the final card on screen briefly before the system dismisses it. The slot
  /// is cleared synchronously so `isActive` flips to false immediately, letting the caller's follow-up
  /// notification through.
  func end(state: String, progress: Double) {
    guard let current = currentActivity else { return }
    clearSlot()
    let finalState = TransferActivityAttributes.ContentState(progress: progress, state: state)
    let content = ActivityContent(state: finalState, staleDate: nil)
    Task {
      await current.end(content, dismissalPolicy: .after(.now + 4))
    }
  }

  // MARK: - Helpers

  private var currentActivity: Activity<TransferActivityAttributes>? {
    lock.lock()
    defer { lock.unlock() }
    return activity
  }

  private func clearSlot() {
    lock.lock()
    activity = nil
    lock.unlock()
  }
}
