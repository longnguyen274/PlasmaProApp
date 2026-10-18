import ExpoModulesCore
import ARKit
import CoreImage

final class PlasmaARView: ExpoView, ARSessionDelegate {
  let onTrackingChange = EventDispatcher()
  let onSessionError = EventDispatcher()

  private let sceneView = ARSCNView(frame: .zero)
  private let sessionId = UUID().uuidString
  private let ciContext = CIContext()
  private var lastEmit: TimeInterval = 0
  private var running = false
  private var capturing = false
  /// Điểm cần đo khoảng cách (vết thương đang khoanh), chuẩn hóa 0–1 theo khung xem.
  var focusPoint: CGPoint?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    sceneView.automaticallyUpdatesLighting = false
    sceneView.session.delegate = self
    addSubview(sceneView)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    sceneView.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil { start() } else { stop() }
  }

  private func start() {
    guard !running else { return }
    guard ARWorldTrackingConfiguration.isSupported else {
      emitError("unsupported", "Thiết bị không hỗ trợ ARKit. Dùng camera thường để chụp.")
      return
    }
    let config = ARWorldTrackingConfiguration()
    config.planeDetection = [.horizontal, .vertical]
    config.isAutoFocusEnabled = true
    if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
      config.frameSemantics.insert(.sceneDepth)
    }
    sceneView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
    running = true
  }

  private func stop() {
    guard running else { return }
    sceneView.session.pause()
    running = false
  }

  // MARK: - ARSessionDelegate (main queue)

  func session(_ session: ARSession, didUpdate frame: ARFrame) {
    guard frame.timestamp - lastEmit >= 0.2 else { return }
    lastEmit = frame.timestamp
    onTrackingChange(trackingStatus(frame))
  }

  func session(_ session: ARSession, didFailWithError error: Error) {
    running = false
    emitError("session_failed", "Phiên AR dừng: \(error.localizedDescription)")
  }

  func sessionWasInterrupted(_ session: ARSession) {
    onTrackingChange(["sessionId": sessionId, "state": "limited", "reason": "interrupted", "planes": 0, "depthEnabled": false])
  }

  // MARK: - Tracking

  private func trackingStatus(_ frame: ARFrame) -> [String: Any] {
    var result: [String: Any] = [
      "sessionId": sessionId,
      "timestampNs": frame.timestamp * 1_000_000_000,
      "depthEnabled": frame.sceneDepth != nil,
      "planes": frame.anchors.filter { $0 is ARPlaneAnchor }.count
    ]
    let (state, reason) = describe(frame.camera.trackingState)
    result["state"] = state
    if let reason = reason { result["reason"] = reason }
    if let light = frame.lightEstimate { result["ambientIntensity"] = Double(light.ambientIntensity) }
    if let preview = previewFrame(frame) { result["frame"] = preview }
    if state == "normal" {
      result["cameraForward"] = forward(frame)
      if let hit = centerHit(frame) { result.merge(hit) { _, new in new } }
    }
    return result
  }

  private func describe(_ state: ARCamera.TrackingState) -> (String, String?) {
    switch state {
    case .normal: return ("normal", nil)
    case .notAvailable: return ("not_available", nil)
    case .limited(let reason):
      switch reason {
      case .initializing: return ("limited", "initializing")
      case .excessiveMotion: return ("limited", "excessive_motion")
      case .insufficientFeatures: return ("limited", "insufficient_features")
      case .relocalizing: return ("limited", "relocalizing")
      @unknown default: return ("limited", "unknown")
      }
    }
  }

  private func centerHit(_ frame: ARFrame) -> [String: Any]? {
    guard sceneView.bounds.width > 0 else { return nil }
    let focus = focusPoint ?? CGPoint(x: 0.5, y: 0.5)
    let center = CGPoint(x: focus.x * sceneView.bounds.width, y: focus.y * sceneView.bounds.height)
    let camera = frame.camera.transform.columns.3
    let targets: [(ARRaycastQuery.Target, String)] = [(.existingPlaneGeometry, "plane"), (.estimatedPlane, "estimated_plane")]
    for (target, source) in targets {
      guard let query = sceneView.raycastQuery(from: center, allowing: target, alignment: .any),
            let hit = sceneView.session.raycast(query).first else { continue }
      let point = hit.worldTransform.columns.3
      let normal = hit.worldTransform.columns.1
      return [
        "centerDistanceM": Double(simd_distance(SIMD3(camera.x, camera.y, camera.z), SIMD3(point.x, point.y, point.z))),
        "centerSource": source,
        "focus": [Double(focus.x), Double(focus.y)],
        "planeNormal": [Double(normal.x), Double(normal.y), Double(normal.z)]
      ]
    }
    if let meters = centerDepth(frame) {
      return ["centerDistanceM": Double(meters), "centerSource": "depth"]
    }
    return nil
  }

  private func centerDepth(_ frame: ARFrame) -> Float? {
    guard let map = frame.sceneDepth?.depthMap else { return nil }
    CVPixelBufferLockBaseAddress(map, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(map, .readOnly) }
    guard let base = CVPixelBufferGetBaseAddress(map) else { return nil }
    let row = base.advanced(by: CVPixelBufferGetHeight(map) / 2 * CVPixelBufferGetBytesPerRow(map))
    let value = row.assumingMemoryBound(to: Float32.self)[CVPixelBufferGetWidth(map) / 2]
    return value.isFinite && value > 0 ? value : nil
  }

  // MARK: - Capture

  func capture(promise: Promise) {
    guard running, let frame = sceneView.session.currentFrame else {
      promise.reject("ERR_AR_SESSION", "Phiên AR chưa chạy.")
      return
    }
    guard case .normal = frame.camera.trackingState else {
      promise.reject("ERR_AR_NOT_TRACKING", "Chưa theo dõi ổn định. Di chuyển máy chậm quanh vùng chụp rồi thử lại.")
      return
    }
    guard !capturing else {
      promise.reject("ERR_AR_BUSY", "Đang chụp ảnh trước đó.")
      return
    }
    capturing = true

    let pixelBuffer = frame.capturedImage
    let resolution = frame.camera.imageResolution
    let k = frame.camera.intrinsics
    let fx = Double(k.columns.0.x), fy = Double(k.columns.1.y)
    let cx = Double(k.columns.2.x), cy = Double(k.columns.2.y)
    let w = Double(resolution.width), h = Double(resolution.height)
    var ar: [String: Any] = [
      "framework": "arkit",
      "sessionId": sessionId,
      "frameTimestampNs": frame.timestamp * 1_000_000_000,
      "trackingState": "normal",
      // Captured image is landscape; it is saved rotated 90° clockwise for portrait use.
      "imageRotationDeg": 90,
      "sensorIntrinsics": ["fx": fx, "fy": fy, "cx": cx, "cy": cy, "width": Int(w), "height": Int(h)],
      "intrinsics": ["fx": fy, "fy": fx, "cx": h - cy, "cy": cx, "width": Int(h), "height": Int(w)],
      "cameraPose": ["matrix": flatten(frame.camera.transform)],
      "viewMatrix": flatten(frame.camera.viewMatrix(for: .portrait)),
      "projectionMatrix": flatten(frame.camera.projectionMatrix(for: .portrait, viewportSize: sceneView.bounds.size, zNear: 0.01, zFar: 30)),
      "planesTracked": frame.anchors.filter { $0 is ARPlaneAnchor }.count,
      "depthEnabled": frame.sceneDepth != nil,
      "cameraForward": forward(frame)
    ]
    if let hit = centerHit(frame) { ar["centerHit"] = hit }
    if let light = frame.lightEstimate { ar["ambientIntensity"] = Double(light.ambientIntensity) }
    let depth = frame.sceneDepth.map { (copy($0.depthMap), $0.confidenceMap.map(copy)) }

    DispatchQueue.global(qos: .userInitiated).async {
      defer { DispatchQueue.main.async { self.capturing = false } }
      do {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("PlasmaAR", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let id = UUID().uuidString
        let image = CIImage(cvPixelBuffer: pixelBuffer).oriented(.right)
        guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
              let jpeg = self.ciContext.jpegRepresentation(of: image, colorSpace: colorSpace, options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.95]) else {
          promise.reject("ERR_AR_SAVE", "Không mã hóa được ảnh AR.")
          return
        }
        let photo = dir.appendingPathComponent("\(id).jpg")
        try jpeg.write(to: photo)
        var result = ar
        if let depth = depth {
          let (depthData, confidence) = depth
          let depthURL = dir.appendingPathComponent("\(id).depth32")
          try depthData.data.write(to: depthURL)
          var info: [String: Any] = [
            "uri": depthURL.absoluteString, "width": depthData.width, "height": depthData.height,
            "format": "float32_m_le", "orientation": "sensor"
          ]
          if let confidence = confidence {
            let confidenceURL = dir.appendingPathComponent("\(id).confidence8")
            try confidence.data.write(to: confidenceURL)
            info["confidenceUri"] = confidenceURL.absoluteString
          }
          result["depth"] = info
        }
        promise.resolve(["uri": photo.absoluteString, "width": Int(h), "height": Int(w), "ar": result])
      } catch {
        promise.reject("ERR_AR_SAVE", "Không lưu được ảnh AR: \(error.localizedDescription)")
      }
    }
  }

  // Camera nhìn theo trục -Z cục bộ.
  private func forward(_ frame: ARFrame) -> [Double] {
    let z = frame.camera.transform.columns.2
    return [Double(-z.x), Double(-z.y), Double(-z.z)]
  }

  // Khung nhỏ (RGBA, đã xoay dọc) gửi lên JS để dò vết thương.
  private func previewFrame(_ frame: ARFrame) -> [String: Any]? {
    let image = CIImage(cvPixelBuffer: frame.capturedImage).oriented(.right)
    let scale = 160 / max(image.extent.width, image.extent.height)
    let small = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let width = Int(small.extent.width.rounded(.down)), height = Int(small.extent.height.rounded(.down))
    guard width > 8, height > 8 else { return nil }
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    ciContext.render(small, toBitmap: &bytes, rowBytes: width * 4,
                     bounds: CGRect(x: small.extent.origin.x, y: small.extent.origin.y, width: CGFloat(width), height: CGFloat(height)),
                     format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB))
    return ["width": width, "height": height, "channels": 4, "data": Data(bytes).base64EncodedString()]
  }

  private struct Plane { let data: Data; let width: Int; let height: Int }

  private func copy(_ buffer: CVPixelBuffer) -> Plane {
    CVPixelBufferLockBaseAddress(buffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(buffer, .readOnly) }
    let width = CVPixelBufferGetWidth(buffer), height = CVPixelBufferGetHeight(buffer)
    let rowBytes = CVPixelBufferGetBytesPerRow(buffer)
    let pixelBytes = CVPixelBufferGetPixelFormatType(buffer) == kCVPixelFormatType_OneComponent8 ? 1 : 4
    var data = Data(capacity: width * height * pixelBytes)
    if let base = CVPixelBufferGetBaseAddress(buffer) {
      for row in 0..<height {
        data.append(base.advanced(by: row * rowBytes).assumingMemoryBound(to: UInt8.self), count: width * pixelBytes)
      }
    }
    return Plane(data: data, width: width, height: height)
  }

  private func flatten(_ m: simd_float4x4) -> [Double] {
    [m.columns.0, m.columns.1, m.columns.2, m.columns.3].flatMap { [Double($0.x), Double($0.y), Double($0.z), Double($0.w)] }
  }

  private func emitError(_ code: String, _ message: String) {
    DispatchQueue.main.async { self.onSessionError(["code": code, "message": message]) }
  }
}
