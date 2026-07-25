import ActivityKit
import Foundation

/// Thin ActivityKit wrapper mirroring the engine's single-transfer model: at most one Live Activity
/// exists at a time, held in `activity`. BackgroundChunkTransferManager calls this at exactly the
/// points it drives the progress notification (start / progress / pause / complete / cancel / fail),
/// so all ActivityKit access is confined to this file.
///
/// The module's deployment target is 16.4 (see BackgroundChunkTransfer.podspec and ios/Podfile), so
/// ActivityKit and the ActivityContent API are unconditionally available — no `@available` gating is
/// needed. Live Activities can still be turned off by the user, so every entry point tolerates
/// `areActivitiesEnabled == false` and a nil `activity` by doing nothing; in that case the engine's
/// progress notification (which is only suppressed while `isActive`) remains the sole progress
/// surface, exactly as before this feature existed.
final class TransferActivityController {
  static let shared = TransferActivityController()

  private var activity: Activity<TransferActivityAttributes>?
  // The engine touches this controller from URLSession delegate callbacks (a background queue) as
  // well as the main queue, so the single slot is guarded. ActivityKit's own update/end are async
  // and run off the caller via Task; only the slot read/write is synchronized here.
  private let lock = NSLock()

  private init() {}

  /// True while a Live Activity is live. The engine reads this to suppress progress-tick
  /// notifications — the Activity is the progress surface while it exists. Only progress ticks are
  /// suppressed; paused and complete notifications (which carry the action buttons / tap-to-open
  /// that the display-only Activity lacks) still fire, and by the time those run the Activity has
  /// already been ended so `isActive` is false anyway.
  var isActive: Bool {
    lock.lock()
    defer { lock.unlock() }
    return activity != nil
  }

  /// Starts a Live Activity for a new transfer. No-op — leaving the notification path as the
  /// progress surface — if Live Activities are disabled or the request throws. Ends any stale
  /// Activity first, so a previous transfer whose `end` was somehow missed can't strand a second
  /// card alongside the new one.
  func start(transferId: String, fileName: String, type: String) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

    // Reconcile Activities that outlived a previous process, or a paused card still on screen.
    // ActivityKit keeps Live Activities alive across termination and while paused, but this singleton
    // may be fresh (cold/background relaunch) with a nil slot. Adopt the card that belongs to THIS
    // transfer (matched by transferId, now carried in the attributes) so the resume flow re-attaches
    // to its own card instead of stacking a second one; end any other stale cards so a previous
    // transfer's leftover card can't be mistaken for this one.
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
  /// changes before calling this, so no additional throttling is done here.
  func update(progress: Double) {
    guard let current = currentActivity else { return }
    let state = TransferActivityAttributes.ContentState(progress: progress, state: "active")
    let content = ActivityContent(state: state, staleDate: nil)
    Task {
      await current.update(content)
    }
  }

  /// Flips the live Activity to the paused state WITHOUT ending it, so the card stays on screen with
  /// its Resume button. Used on pause: on iOS the Activity is the sole surface (no paused
  /// notification), so the card must persist rather than being dismissed.
  func markPaused(progress: Double) {
    guard let current = currentActivity else { return }
    let state = TransferActivityAttributes.ContentState(progress: progress, state: "paused")
    let content = ActivityContent(state: state, staleDate: nil)
    Task {
      await current.update(content)
    }
  }

  /// Ends the live Activity with a terminal state ("uploaded" | "downloaded" | "failed"
  /// | "cancelled"), leaving the final card on screen briefly before the system dismisses it. The
  /// slot is cleared synchronously so `isActive` flips to false immediately (before the async end
  /// resolves), letting the caller's follow-up notification through.
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
