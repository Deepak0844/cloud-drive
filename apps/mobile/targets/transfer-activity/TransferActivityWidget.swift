import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Widget-extension entry point. A single Live Activity widget, no home-screen/lock-screen widgets.
@main
struct TransferActivityBundle: WidgetBundle {
  var body: some Widget {
    TransferActivityWidget()
  }
}

/// Live Activity for a background transfer. Progress and terminal state are driven from the app
/// process by TransferActivityController. On iOS 17+ the Lock Screen card and Dynamic Island expanded
/// view show interactive Pause/Resume/Stop buttons (TransferControlIntent, which runs in the app
/// process and drives the engine); on iOS 16 it stays display-only.
struct TransferActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TransferActivityAttributes.self) { context in
      // No .activityBackgroundTint → the Lock Screen card uses iOS's default glass/material
      // background. Text uses adaptive .primary/.secondary so it reads on that material in both
      // light and dark; brand colors remain the accents.
      TransferCardView(context: context)
        .padding(16)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          IconChip(transferType: context.attributes.transferType, state: context.state.state)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(trailingLabel(for: context.state))
            .font(.callout.weight(.semibold))
            .monospacedDigit()
            .foregroundStyle(stateColor(for: context.state.state))
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.fileName)
            .font(.footnote.weight(.medium))
            .lineLimit(1)
            .foregroundStyle(.white)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 10) {
            TransferProgressBar(progress: context.state.progress, state: context.state.state)
            if #available(iOS 17.0, *), isControllable(context.state.state) {
              TransferControls(transferId: context.attributes.transferId, state: context.state.state)
            }
          }
          // Inset from the Dynamic Island's rounded corners so the full-width buttons/bar aren't
          // clipped on the left/right edges.
          .padding(.horizontal, 10)
          .padding(.top, 4)
        }
      } compactLeading: {
        Image(systemName: iconName(for: context.attributes.transferType))
          .foregroundStyle(stateColor(for: context.state.state))
      } compactTrailing: {
        Text(trailingLabel(for: context.state))
          .font(.caption2.weight(.semibold))
          .monospacedDigit()
          .foregroundStyle(stateColor(for: context.state.state))
      } minimal: {
        Image(systemName: iconName(for: context.attributes.transferType))
          .foregroundStyle(stateColor(for: context.state.state))
      }
    }
  }
}

/// Lock Screen / banner card, also reused as the Dynamic Island expanded content.
private struct TransferCardView: View {
  let context: ActivityViewContext<TransferActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        IconChip(transferType: context.attributes.transferType, state: context.state.state)
        VStack(alignment: .leading, spacing: 2) {
          Text(context.attributes.fileName)
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .foregroundStyle(.primary)
          Text(subtitle(for: context.state, type: context.attributes.transferType))
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        Spacer(minLength: 8)
        Text(trailingLabel(for: context.state))
          .font(.title3.weight(.bold))
          .monospacedDigit()
          .foregroundStyle(stateColor(for: context.state.state))
      }

      TransferProgressBar(progress: context.state.progress, state: context.state.state)

      if #available(iOS 17.0, *), isControllable(context.state.state) {
        TransferControls(transferId: context.attributes.transferId, state: context.state.state)
      }
    }
  }
}

/// Rounded icon chip — an up/down arrow tinted by state, in a soft translucent circle.
private struct IconChip: View {
  let transferType: String
  let state: String

  var body: some View {
    ZStack {
      Circle().fill(stateColor(for: state).opacity(0.2))
      Image(systemName: iconName(for: transferType))
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(stateColor(for: state))
    }
    .frame(width: 34, height: 34)
  }
}

/// Rounded progress bar with a translucent track and an accent fill; dims/greys out when paused.
private struct TransferProgressBar: View {
  let progress: Double
  let state: String

  var body: some View {
    GeometryReader { geo in
      ZStack(alignment: .leading) {
        Capsule().fill(Color.primary.opacity(0.15))
        Capsule()
          .fill(stateColor(for: state))
          .frame(width: max(0, min(1, clampedProgress(progress) / 100)) * geo.size.width)
      }
    }
    .frame(height: 7)
  }
}

/// Pause/Resume/Stop buttons for the Live Activity (iOS 17+). Each button fires TransferControlIntent,
/// which the system runs in the app process to drive the transfer engine. Shown only while the
/// transfer is controllable (active or paused).
@available(iOS 17.0, *)
private struct TransferControls: View {
  let transferId: String
  let state: String

  var body: some View {
    HStack(spacing: 10) {
      if state == "active" {
        Button(intent: TransferControlIntent(transferId: transferId, action: "pause")) {
          controlLabel("Pause", "pause.fill")
        }
        .tint(brandPrimary)
      } else if state == "paused" {
        Button(intent: TransferControlIntent(transferId: transferId, action: "resume")) {
          controlLabel("Resume", "play.fill")
        }
        .tint(brandPrimary)
      }
      Button(intent: TransferControlIntent(transferId: transferId, action: "stop")) {
        controlLabel("Stop", "xmark")
      }
      .tint(brandDanger.opacity(0.9))
    }
    .buttonStyle(.borderedProminent)
    .controlSize(.small)
    .foregroundStyle(.white)
    .padding(.top, 2)
  }

  private func controlLabel(_ title: String, _ icon: String) -> some View {
    Label(title, systemImage: icon)
      .font(.caption.weight(.semibold))
      .frame(maxWidth: .infinity)
  }
}

/// Whether the transfer's current state has controls (active → Pause/Stop, paused → Resume/Stop).
private func isControllable(_ state: String) -> Bool {
  state == "active" || state == "paused"
}

// MARK: - Presentation helpers (free functions so the Widget and its subviews can reuse them)

private func iconName(for transferType: String) -> String {
  transferType == "download" ? "arrow.down" : "arrow.up"
}

/// Left-aligned status verb under the filename, e.g. "Uploading" / "Paused" / "Uploaded".
private func subtitle(for state: TransferActivityAttributes.ContentState, type: String) -> String {
  switch state.state {
  case "paused": return "Paused"
  case "uploaded": return "Upload complete"
  case "downloaded": return "Download complete"
  case "failed": return "Failed"
  case "cancelled": return "Cancelled"
  default: return type == "download" ? "Downloading" : "Uploading"
  }
}

/// The right-hand label: a live percent while active/paused, otherwise a human word for the terminal
/// state. Keeps the compact Dynamic Island slot and the card label in sync.
private func trailingLabel(for state: TransferActivityAttributes.ContentState) -> String {
  switch state.state {
  case "uploaded": return "Done"
  case "downloaded": return "Done"
  case "paused": return "\(Int(clampedProgress(state.progress)))%"
  case "failed": return "Failed"
  case "cancelled": return "Stopped"
  default: return "\(Int(clampedProgress(state.progress)))%"
  }
}

// App theme (from global.css design tokens): primary violet, amber warning, green success, red
// danger, on a dark slate background.
private let brandPrimary = Color(red: 0.655, green: 0.545, blue: 0.980)  // --primary-light  #a78bfa
private let brandWarning = Color(red: 0.961, green: 0.620, blue: 0.043)  // --warning-light  #f59e0b
private let brandSuccess = Color(red: 0.133, green: 0.773, blue: 0.369)  // --success-light  #22c55e
private let brandDanger = Color(red: 0.937, green: 0.267, blue: 0.267)  // --danger-light   #ef4444

/// Accent color per state — violet while transferring, amber when paused, green on success, red on
/// failure/cancel. Used for the icon, progress fill, and percent so the card reads at a glance.
private func stateColor(for state: String) -> Color {
  switch state {
  case "paused": return brandWarning
  case "uploaded", "downloaded": return brandSuccess
  case "failed", "cancelled": return brandDanger
  default: return brandPrimary
  }
}

/// ProgressView clamps internally, but guarding here keeps a stray out-of-range update from
/// producing a NaN width in the bar.
private func clampedProgress(_ progress: Double) -> Double {
  min(max(progress, 0), 100)
}
