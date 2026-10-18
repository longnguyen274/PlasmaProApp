import ExpoModulesCore
import ARKit

// ARKit session view and capability probe. Distances and depth are capture metadata,
// not a validated wound-area measurement. Requires a development build (not Expo Go).
public final class PlasmaARModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PlasmaAR")

    AsyncFunction("getCapabilities") { () -> [String: Any] in
      let worldTracking = ARWorldTrackingConfiguration.isSupported
      let depth = worldTracking && ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
      return [
        "worldTracking": worldTracking,
        "depth": depth,
        "depthConfidence": depth,
        "sceneMesh": worldTracking && ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh),
        "framework": "arkit"
      ]
    }

    View(PlasmaARView.self) {
      Events("onTrackingChange", "onSessionError")
      Prop("focusPoint") { (view: PlasmaARView, point: [Double]?) in
        view.focusPoint = point.flatMap { $0.count == 2 ? CGPoint(x: $0[0], y: $0[1]) : nil }
      }
      AsyncFunction("capture") { (view: PlasmaARView, promise: Promise) in
        view.capture(promise: promise)
      }.runOnQueue(.main)
    }
  }
}
