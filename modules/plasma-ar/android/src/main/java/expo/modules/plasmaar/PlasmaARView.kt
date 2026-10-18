package expo.modules.plasmaar

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Matrix
import android.graphics.Rect
import android.graphics.YuvImage
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.Image
import android.opengl.GLES11Ext
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.Surface
import android.view.WindowManager
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Camera
import com.google.ar.core.CameraConfig
import com.google.ar.core.CameraConfigFilter
import com.google.ar.core.Config
import com.google.ar.core.Coordinates2d
import com.google.ar.core.DepthPoint
import com.google.ar.core.Frame
import com.google.ar.core.Plane
import com.google.ar.core.Point
import com.google.ar.core.Session
import com.google.ar.core.TrackingFailureReason
import com.google.ar.core.TrackingState
import com.google.ar.core.exceptions.CameraNotAvailableException
import com.google.ar.core.exceptions.NotYetAvailableException
import com.google.ar.core.exceptions.UnavailableDeviceNotCompatibleException
import com.google.ar.core.exceptions.UnavailableUserDeclinedInstallationException
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.util.UUID
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

@SuppressLint("ViewConstructor")
class PlasmaARView(context: Context, appContext: AppContext) : ExpoView(context, appContext), GLSurfaceView.Renderer {
  private val onTrackingChange by EventDispatcher<Map<String, Any>>()
  private val onSessionError by EventDispatcher<Map<String, Any>>()
  private val main = Handler(Looper.getMainLooper())
  private val background = BackgroundRenderer()
  private val sessionId = UUID.randomUUID().toString()
  private val surface = GLSurfaceView(context)

  @Volatile private var session: Session? = null
  @Volatile private var pendingCapture: Promise? = null
  private var captureRetries = 0
  private var installRequested = false
  private var depthEnabled = false
  private var viewportChanged = false
  private var viewWidth = 0
  private var viewHeight = 0
  private var lastEmitAt = 0L
  /** Điểm cần đo khoảng cách (vết thương đang khoanh), chuẩn hóa 0–1 theo khung xem. */
  @Volatile var focusPoint: FloatArray? = null
  private var resumed = false
  private var destroyed = false

  init {
    surface.preserveEGLContextOnPause = true
    surface.setEGLContextClientVersion(2)
    surface.setEGLConfigChooser(8, 8, 8, 8, 16, 0)
    surface.setRenderer(this)
    surface.renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
    surface.setWillNotDraw(false)
    addView(surface)
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    surface.layout(0, 0, right - left, bottom - top)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    resume()
  }

  override fun onDetachedFromWindow() {
    pause()
    super.onDetachedFromWindow()
  }

  fun destroy() {
    destroyed = true
    pause()
    session?.close()
    session = null
  }

  private fun resume() {
    if (resumed || destroyed) return
    val activity = appContext.currentActivity
    if (activity == null) {
      emitError("no_activity", "Chưa mở được phiên AR.")
      return
    }
    try {
      if (session == null) {
        when (ArCoreApk.getInstance().requestInstall(activity, !installRequested)) {
          ArCoreApk.InstallStatus.INSTALL_REQUESTED -> {
            installRequested = true
            emitError("install_requested", "Cần cài hoặc cập nhật Dịch vụ Google Play cho AR, sau đó mở lại camera AR.")
            return
          }
          else -> Unit
        }
        val created = Session(activity)
        configure(created)
        session = created
      }
      session!!.resume()
      surface.onResume()
      resumed = true
    } catch (e: UnavailableUserDeclinedInstallationException) {
      emitError("install_declined", "Chưa cài Dịch vụ Google Play cho AR. Dùng camera thường để chụp.")
    } catch (e: UnavailableDeviceNotCompatibleException) {
      emitError("unsupported", "Máy này không hỗ trợ ARCore. Dùng camera thường để chụp.")
    } catch (e: CameraNotAvailableException) {
      emitError("camera_unavailable", "Camera đang bận hoặc chưa được cấp quyền.")
    } catch (e: SecurityException) {
      emitError("camera_permission", "Chưa có quyền camera.")
    } catch (e: Exception) {
      emitError("session_failed", "Chưa mở được phiên AR: ${e.message ?: e.javaClass.simpleName}")
    }
  }

  private fun pause() {
    if (!resumed) return
    resumed = false
    surface.onPause()
    session?.pause()
    pendingCapture?.reject("ERR_AR_PAUSED", "Phiên AR đã dừng trước khi chụp.", null)
    pendingCapture = null
  }

  private fun configure(s: Session) {
    // Highest CPU image resolution so the saved photo is usable clinically, not the 640x480 default.
    val configs = s.getSupportedCameraConfigs(CameraConfigFilter(s).setFacingDirection(CameraConfig.FacingDirection.BACK))
    configs.maxByOrNull { it.imageSize.width * it.imageSize.height }?.let { s.cameraConfig = it }
    val config = Config(s)
    config.focusMode = Config.FocusMode.AUTO
    config.updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
    config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
    config.lightEstimationMode = Config.LightEstimationMode.AMBIENT_INTENSITY
    depthEnabled = s.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
    if (depthEnabled) config.depthMode = Config.DepthMode.AUTOMATIC
    s.configure(config)
  }

  fun capture(promise: Promise) {
    if (session == null || !resumed) {
      promise.reject("ERR_AR_SESSION", "Phiên AR chưa chạy.", null)
      return
    }
    if (pendingCapture != null) {
      promise.reject("ERR_AR_BUSY", "Đang chụp ảnh trước đó.", null)
      return
    }
    captureRetries = 0
    pendingCapture = promise
  }

  // GL thread

  override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
    GLES20.glClearColor(0f, 0f, 0f, 1f)
    background.create()
  }

  override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
    GLES20.glViewport(0, 0, width, height)
    viewWidth = width
    viewHeight = height
    viewportChanged = true
  }

  override fun onDrawFrame(gl: GL10?) {
    GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
    val s = session ?: return
    if (!resumed) return
    if (viewportChanged) {
      s.setDisplayGeometry(displayRotation(), viewWidth, viewHeight)
      viewportChanged = false
    }
    s.setCameraTextureName(background.textureId)
    val frame = try {
      s.update()
    } catch (e: Exception) {
      emitError("frame_failed", "Mất hình ảnh camera AR: ${e.message ?: e.javaClass.simpleName}")
      return
    }
    background.draw(frame)
    val camera = frame.camera
    pendingCapture?.let { promise ->
      pendingCapture = null
      captureFrame(s, frame, camera, promise)
    }
    val now = System.currentTimeMillis()
    if (now - lastEmitAt >= 200) {
      lastEmitAt = now
      val status = trackingStatus(s, frame, camera)
      main.post { if (!destroyed) onTrackingChange(status) }
    }
  }

  private fun trackingStatus(s: Session, frame: Frame, camera: Camera): Map<String, Any> {
    val status = mutableMapOf<String, Any>(
      "sessionId" to sessionId,
      "state" to trackingState(camera),
      "planes" to 0,
      "depthEnabled" to depthEnabled,
      "timestampNs" to frame.timestamp.toDouble()
    )
    reason(camera)?.let { status["reason"] = it }
    frame.lightEstimate.takeIf { it.state == com.google.ar.core.LightEstimate.State.VALID }?.let { status["pixelIntensity"] = it.pixelIntensity.toDouble() }
    previewFrame(s, frame)?.let { status["frame"] = it }
    if (camera.trackingState != TrackingState.TRACKING) return status
    status["cameraForward"] = forward(camera)
    status["planes"] = s.getAllTrackables(Plane::class.java).count { it.trackingState == TrackingState.TRACKING && it.subsumedBy == null }
    centerHit(frame)?.let { status.putAll(it) }
    return status
  }

  private fun trackingState(camera: Camera) = when (camera.trackingState) {
    TrackingState.TRACKING -> "normal"
    TrackingState.PAUSED -> "limited"
    else -> "not_available"
  }

  private fun reason(camera: Camera): String? = when (camera.trackingFailureReason) {
    TrackingFailureReason.NONE -> if (camera.trackingState == TrackingState.PAUSED) "initializing" else null
    TrackingFailureReason.INSUFFICIENT_LIGHT -> "insufficient_light"
    TrackingFailureReason.EXCESSIVE_MOTION -> "excessive_motion"
    TrackingFailureReason.INSUFFICIENT_FEATURES -> "insufficient_features"
    TrackingFailureReason.CAMERA_UNAVAILABLE -> "camera_unavailable"
    else -> "unknown"
  }

  private fun centerHit(frame: Frame): Map<String, Any>? {
    if (viewWidth == 0 || viewHeight == 0) return null
    val focus = focusPoint
    val hits = frame.hitTest((focus?.get(0) ?: 0.5f) * viewWidth, (focus?.get(1) ?: 0.5f) * viewHeight)
    val hit = hits.firstOrNull { (it.trackable is Plane && (it.trackable as Plane).isPoseInPolygon(it.hitPose)) || it.trackable is DepthPoint }
      ?: hits.firstOrNull { it.trackable is Point }
      ?: return null
    val result = mutableMapOf<String, Any>(
      "focus" to (focus?.map { it.toDouble() } ?: listOf(0.5, 0.5)),
      "centerDistanceM" to hit.distance.toDouble(),
      "centerSource" to when (hit.trackable) {
        is Plane -> "plane"
        is DepthPoint -> "depth"
        else -> "feature_point"
      }
    )
    if (hit.trackable is Plane) {
      // Plane normal is the hit pose's local +Y axis in world space.
      result["planeNormal"] = hit.hitPose.yAxis.map { it.toDouble() }
      result["planeType"] = (hit.trackable as Plane).type.name.lowercase()
    }
    return result
  }

  private fun captureFrame(s: Session, frame: Frame, camera: Camera, promise: Promise) {
    if (camera.trackingState != TrackingState.TRACKING) {
      promise.reject("ERR_AR_NOT_TRACKING", "Chưa theo dõi ổn định. Di chuyển máy chậm quanh vùng chụp rồi thử lại.", null)
      return
    }
    val image = try {
      frame.acquireCameraImage()
    } catch (e: NotYetAvailableException) {
      if (++captureRetries < 30) pendingCapture = promise
      else promise.reject("ERR_AR_IMAGE", "Camera AR chưa trả ảnh.", null)
      return
    } catch (e: Exception) {
      promise.reject("ERR_AR_IMAGE", "Không lấy được ảnh từ phiên AR.", e)
      return
    }
    val width = image.width
    val height = image.height
    val nv21 = try { yuvToNv21(image) } finally { image.close() }

    val intrinsics = camera.imageIntrinsics
    val focal = intrinsics.focalLength
    val principal = intrinsics.principalPoint
    val pose = camera.pose
    val view = FloatArray(16).also { camera.getViewMatrix(it, 0) }
    val projection = FloatArray(16).also { camera.getProjectionMatrix(it, 0, 0.01f, 30f) }
    val hit = centerHit(frame)
    val planes = s.getAllTrackables(Plane::class.java).count { it.trackingState == TrackingState.TRACKING && it.subsumedBy == null }
    val light = frame.lightEstimate.takeIf { it.state == com.google.ar.core.LightEstimate.State.VALID }?.pixelIntensity
    val depth = if (depthEnabled) readDepth(frame) else null
    val rotation = (sensorOrientation(s) - displayRotationDegrees() + 360) % 360
    val timestamp = frame.timestamp
    val cameraForward = forward(camera)

    Thread {
      try {
        val dir = File(context.cacheDir, "PlasmaAR").apply { mkdirs() }
        val id = UUID.randomUUID().toString()
        val jpeg = encodeJpeg(nv21, width, height, rotation)
        val photo = File(dir, "$id.jpg")
        FileOutputStream(photo).use { it.write(jpeg.bytes) }
        val ar = mutableMapOf<String, Any>(
          "framework" to "arcore",
          "sessionId" to sessionId,
          "frameTimestampNs" to timestamp.toDouble(),
          "trackingState" to "normal",
          "imageRotationDeg" to rotation,
          "sensorIntrinsics" to mapOf(
            "fx" to focal[0].toDouble(), "fy" to focal[1].toDouble(),
            "cx" to principal[0].toDouble(), "cy" to principal[1].toDouble(),
            "width" to width, "height" to height
          ),
          "intrinsics" to rotateIntrinsics(focal, principal, width, height, rotation),
          "cameraPose" to mapOf(
            "translation" to pose.translation.map { it.toDouble() },
            "rotation" to pose.rotationQuaternion.map { it.toDouble() }
          ),
          "viewMatrix" to view.map { it.toDouble() },
          "projectionMatrix" to projection.map { it.toDouble() },
          "planesTracked" to planes,
          "depthEnabled" to depthEnabled,
          "cameraForward" to cameraForward
        )
        hit?.let { ar["centerHit"] = it }
        light?.let { ar["ambientIntensity"] = it.toDouble() }
        depth?.let { d ->
          val depthFile = File(dir, "$id.depth16")
          FileOutputStream(depthFile).use { it.write(d.bytes) }
          ar["depth"] = mapOf(
            "uri" to android.net.Uri.fromFile(depthFile).toString(),
            "width" to d.width, "height" to d.height,
            "format" to "uint16_mm_le", "orientation" to "sensor",
            "centerMm" to d.centerMm
          )
        }
        promise.resolve(mapOf(
          "uri" to android.net.Uri.fromFile(photo).toString(),
          "width" to jpeg.width,
          "height" to jpeg.height,
          "ar" to ar
        ))
      } catch (e: Exception) {
        promise.reject("ERR_AR_SAVE", "Không lưu được ảnh AR.", e)
      }
    }.start()
  }

  // Camera nhìn theo trục -Z cục bộ.
  private fun forward(camera: Camera): List<Double> = camera.pose.zAxis.map { -it.toDouble() }

  // Khung nhỏ (RGB, đã xoay theo màn hình) gửi lên JS để dò vết thương.
  private fun previewFrame(s: Session, frame: Frame): Map<String, Any>? {
    val image = try { frame.acquireCameraImage() } catch (_: Exception) { return null }
    try {
      val w = image.width
      val h = image.height
      val step = maxOf(1, maxOf(w, h) / 160)
      val sw = w / step
      val sh = h / step
      val rotation = (sensorOrientation(s) - displayRotationDegrees() + 360) % 360
      val ow = if (rotation % 180 == 0) sw else sh
      val oh = if (rotation % 180 == 0) sh else sw
      val y = image.planes[0]; val u = image.planes[1]; val v = image.planes[2]
      val yb = y.buffer; val ub = u.buffer; val vb = v.buffer
      val out = ByteArray(ow * oh * 3)
      var o = 0
      for (oy in 0 until oh) {
        for (ox in 0 until ow) {
          val sx: Int
          val sy: Int
          when (rotation) {
            90 -> { sx = oy; sy = sh - 1 - ox }
            180 -> { sx = sw - 1 - ox; sy = sh - 1 - oy }
            270 -> { sx = sw - 1 - oy; sy = ox }
            else -> { sx = ox; sy = oy }
          }
          val px = sx * step
          val py = sy * step
          val lum = (yb.get(py * y.rowStride + px * y.pixelStride).toInt() and 0xFF).toFloat()
          val cu = (ub.get((py / 2) * u.rowStride + (px / 2) * u.pixelStride).toInt() and 0xFF) - 128f
          val cv = (vb.get((py / 2) * v.rowStride + (px / 2) * v.pixelStride).toInt() and 0xFF) - 128f
          out[o++] = (lum + 1.402f * cv).toInt().coerceIn(0, 255).toByte()
          out[o++] = (lum - 0.344f * cu - 0.714f * cv).toInt().coerceIn(0, 255).toByte()
          out[o++] = (lum + 1.772f * cu).toInt().coerceIn(0, 255).toByte()
        }
      }
      return mapOf("width" to ow, "height" to oh, "channels" to 3, "data" to Base64.encodeToString(out, Base64.NO_WRAP))
    } catch (_: Exception) {
      return null
    } finally {
      image.close()
    }
  }

  private class Depth(val bytes: ByteArray, val width: Int, val height: Int, val centerMm: Int)

  private fun readDepth(frame: Frame): Depth? {
    val image = try { frame.acquireDepthImage16Bits() } catch (e: Exception) { return null }
    try {
      val plane = image.planes[0]
      val buffer = plane.buffer.order(ByteOrder.LITTLE_ENDIAN)
      val w = image.width
      val h = image.height
      val out = ByteArray(w * h * 2)
      val rowBytes = w * 2
      for (row in 0 until h) {
        buffer.position(row * plane.rowStride)
        buffer.get(out, row * rowBytes, rowBytes)
      }
      val centerIndex = (h / 2) * plane.rowStride + (w / 2) * plane.pixelStride
      val center = buffer.getShort(centerIndex).toInt() and 0xFFFF
      return Depth(out, w, h, center)
    } finally {
      image.close()
    }
  }

  private class Jpeg(val bytes: ByteArray, val width: Int, val height: Int)

  private fun encodeJpeg(nv21: ByteArray, width: Int, height: Int, rotation: Int): Jpeg {
    val raw = ByteArrayOutputStream()
    YuvImage(nv21, ImageFormat.NV21, width, height, null).compressToJpeg(Rect(0, 0, width, height), 100, raw)
    if (rotation == 0) return Jpeg(raw.toByteArray(), width, height)
    val bitmap = BitmapFactory.decodeByteArray(raw.toByteArray(), 0, raw.size())
    val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, Matrix().apply { postRotate(rotation.toFloat()) }, true)
    val out = ByteArrayOutputStream()
    rotated.compress(Bitmap.CompressFormat.JPEG, 95, out)
    val result = Jpeg(out.toByteArray(), rotated.width, rotated.height)
    if (rotated !== bitmap) rotated.recycle()
    bitmap.recycle()
    return result
  }

  // Map pinhole intrinsics from the sensor image into the rotated (saved) image.
  private fun rotateIntrinsics(focal: FloatArray, principal: FloatArray, w: Int, h: Int, rotation: Int): Map<String, Any> {
    val fx = focal[0].toDouble(); val fy = focal[1].toDouble()
    val cx = principal[0].toDouble(); val cy = principal[1].toDouble()
    return when (rotation) {
      90 -> mapOf("fx" to fy, "fy" to fx, "cx" to h - cy, "cy" to cx, "width" to h, "height" to w)
      180 -> mapOf("fx" to fx, "fy" to fy, "cx" to w - cx, "cy" to h - cy, "width" to w, "height" to h)
      270 -> mapOf("fx" to fy, "fy" to fx, "cx" to cy, "cy" to w - cx, "width" to h, "height" to w)
      else -> mapOf("fx" to fx, "fy" to fy, "cx" to cx, "cy" to cy, "width" to w, "height" to h)
    }
  }

  private fun yuvToNv21(image: Image): ByteArray {
    val w = image.width
    val h = image.height
    val out = ByteArray(w * h * 3 / 2)
    val y = image.planes[0]
    val u = image.planes[1]
    val v = image.planes[2]
    val yBuffer = y.buffer
    var pos = 0
    for (row in 0 until h) {
      if (y.pixelStride == 1) {
        yBuffer.position(row * y.rowStride)
        yBuffer.get(out, pos, w)
        pos += w
      } else {
        for (col in 0 until w) out[pos++] = yBuffer.get(row * y.rowStride + col * y.pixelStride)
      }
    }
    val uBuffer = u.buffer
    val vBuffer = v.buffer
    for (row in 0 until h / 2) {
      for (col in 0 until w / 2) {
        out[pos++] = vBuffer.get(row * v.rowStride + col * v.pixelStride)
        out[pos++] = uBuffer.get(row * u.rowStride + col * u.pixelStride)
      }
    }
    return out
  }

  private fun sensorOrientation(s: Session): Int = try {
    val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    manager.getCameraCharacteristics(s.cameraConfig.cameraId).get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 90
  } catch (_: Exception) {
    90
  }

  @Suppress("DEPRECATION")
  private fun displayRotation(): Int = (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay.rotation

  private fun displayRotationDegrees() = when (displayRotation()) {
    Surface.ROTATION_90 -> 90
    Surface.ROTATION_180 -> 180
    Surface.ROTATION_270 -> 270
    else -> 0
  }

  private fun emitError(code: String, message: String) {
    main.post { if (!destroyed) onSessionError(mapOf("code" to code, "message" to message)) }
  }
}

// Draws the ARCore camera texture full screen.
private class BackgroundRenderer {
  var textureId = -1
    private set
  private var program = 0
  private var positionAttr = 0
  private var texCoordAttr = 0
  private val quad: FloatBuffer = floatBuffer(floatArrayOf(-1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f))
  private val texCoords: FloatBuffer = floatBuffer(FloatArray(8))

  fun create() {
    val textures = IntArray(1)
    GLES20.glGenTextures(1, textures, 0)
    textureId = textures[0]
    val target = GLES11Ext.GL_TEXTURE_EXTERNAL_OES
    GLES20.glBindTexture(target, textureId)
    GLES20.glTexParameteri(target, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
    GLES20.glTexParameteri(target, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
    GLES20.glTexParameteri(target, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
    GLES20.glTexParameteri(target, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
    program = GLES20.glCreateProgram()
    GLES20.glAttachShader(program, shader(GLES20.GL_VERTEX_SHADER, VERTEX))
    GLES20.glAttachShader(program, shader(GLES20.GL_FRAGMENT_SHADER, FRAGMENT))
    GLES20.glLinkProgram(program)
    positionAttr = GLES20.glGetAttribLocation(program, "a_Position")
    texCoordAttr = GLES20.glGetAttribLocation(program, "a_TexCoord")
  }

  fun draw(frame: Frame) {
    if (frame.hasDisplayGeometryChanged()) {
      quad.position(0)
      texCoords.position(0)
      frame.transformCoordinates2d(Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES, quad, Coordinates2d.TEXTURE_NORMALIZED, texCoords)
    }
    if (frame.timestamp == 0L) return
    quad.position(0)
    texCoords.position(0)
    GLES20.glDisable(GLES20.GL_DEPTH_TEST)
    GLES20.glDepthMask(false)
    GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, textureId)
    GLES20.glUseProgram(program)
    GLES20.glVertexAttribPointer(positionAttr, 2, GLES20.GL_FLOAT, false, 0, quad)
    GLES20.glVertexAttribPointer(texCoordAttr, 2, GLES20.GL_FLOAT, false, 0, texCoords)
    GLES20.glEnableVertexAttribArray(positionAttr)
    GLES20.glEnableVertexAttribArray(texCoordAttr)
    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
    GLES20.glDisableVertexAttribArray(positionAttr)
    GLES20.glDisableVertexAttribArray(texCoordAttr)
    GLES20.glDepthMask(true)
    GLES20.glEnable(GLES20.GL_DEPTH_TEST)
  }

  private fun shader(type: Int, source: String): Int {
    val id = GLES20.glCreateShader(type)
    GLES20.glShaderSource(id, source)
    GLES20.glCompileShader(id)
    return id
  }

  companion object {
    private const val VERTEX = """
      attribute vec4 a_Position;
      attribute vec2 a_TexCoord;
      varying vec2 v_TexCoord;
      void main() { gl_Position = a_Position; v_TexCoord = a_TexCoord; }
    """
    private const val FRAGMENT = """
      #extension GL_OES_EGL_image_external : require
      precision mediump float;
      varying vec2 v_TexCoord;
      uniform samplerExternalOES sTexture;
      void main() { gl_FragColor = texture2D(sTexture, v_TexCoord); }
    """

    private fun floatBuffer(values: FloatArray): FloatBuffer =
      ByteBuffer.allocateDirect(values.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply {
        put(values)
        position(0)
      }
  }
}
