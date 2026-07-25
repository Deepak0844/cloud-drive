import ActivityKit
import SwiftUI
import WidgetKit

// Widget-extension entry point. A single Live Activity widget, no home-screen/lock-screen widgets.
@main
struct TransferActivityBundle: WidgetBundle {
  var body: some Widget {
    TransferActivityWidget()
  }
}

/// Display-only Live Activity for a background transfer. Progress and terminal state are driven from
/// the app process by TransferActivityController; there are no interactive buttons (Pause/Stop stay
/// on the notification — see the plan's §7 deferral of App Intents). Presentations:
///   - Lock Screen / banner: filename, a linear progress bar, and a percent/status label.
///   - Dynamic Island compact: an up/down icon (leading) + percent (trailing).
///   - Dynamic Island minimal: just the icon.
///   - Dynamic Island expanded: same information as the Lock Screen card.
struct TransferActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TransferActivityAttributes.self) { context in
      TransferLockScreenView(context: context)
        .padding()
        .activityBackgroundTint(Color.black.opacity(0.55))
        .activitySystemActionForegroundColor(Color.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: iconName(for: context.attributes.transferType))
            .foregroundStyle(.tint)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(trailingLabel(for: context.state))
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            Text(context.attributes.fileName)
              .font(.footnote.weight(.medium))
              .lineLimit(1)
            ProgressView(value: clampedProgress(context.state.progress), total: 100)
              .tint(.white)
          }
        }
      } compactLeading: {
        Image(systemName: iconName(for: context.attributes.transferType))
          .foregroundStyle(.tint)
      } compactTrailing: {
        Text(trailingLabel(for: context.state))
          .font(.caption2)
      } minimal: {
        Image(systemName: iconName(for: context.attributes.transferType))
          .foregroundStyle(.tint)
      }
    }
  }
}

/// Lock Screen / banner card and the Dynamic Island expanded bottom region share this presentation.
private struct TransferLockScreenView: View {
  let context: ActivityViewContext<TransferActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 8) {
        Image(systemName: iconName(for: context.attributes.transferType))
          .foregroundStyle(.tint)
        Text(context.attributes.fileName)
          .font(.subheadline.weight(.semibold))
          .lineLimit(1)
        Spacer()
        Text(trailingLabel(for: context.state))
          .font(.caption)
          .foregroundStyle(.secondary)
          .monospacedDigit()
      }
      ProgressView(value: clampedProgress(context.state.progress), total: 100)
        .tint(.white)
    }
  }
}

// MARK: - Presentation helpers (free functions so both the Widget and the subview can reuse them)

private func iconName(for transferType: String) -> String {
  transferType == "download" ? "arrow.down.circle.fill" : "arrow.up.circle.fill"
}

/// The short right-hand label: a live percent while active, otherwise a human word for the terminal
/// state. Keeps the compact Dynamic Island trailing slot and the Lock Screen label in sync.
private func trailingLabel(for state: TransferActivityAttributes.ContentState) -> String {
  switch state.state {
  case "uploaded": return "Uploaded"
  case "downloaded": return "Downloaded"
  case "paused": return "Paused"
  case "failed": return "Failed"
  case "cancelled": return "Cancelled"
  default: return "\(Int(clampedProgress(state.progress)))%"
  }
}

/// ProgressView clamps internally, but guarding here keeps a stray out-of-range update from
/// producing a NaN width in the bar.
private func clampedProgress(_ progress: Double) -> Double {
  min(max(progress, 0), 100)
}
