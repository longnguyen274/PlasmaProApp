package expo.modules.plasmaar

import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.Session
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// ARCore session view and capability probe. Distances and depth are capture metadata,
// not a validated wound-area measurement.
class PlasmaARModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PlasmaAR")

    AsyncFunction("getCapabilities") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context lost")
      var availability = ArCoreApk.getInstance().checkAvailability(context)
      var waited = 0
      while (availability.isTransient && waited < 3000) {
        Thread.sleep(200)
        waited += 200
        availability = ArCoreApk.getInstance().checkAvailability(context)
      }
      var depth: Boolean? = null
      if (availability == ArCoreApk.Availability.SUPPORTED_INSTALLED) {
        try {
          val session = Session(context)
          depth = session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
          session.close()
        } catch (_: Exception) {
          // Depth stays unknown; world tracking support is still reported below.
        }
      }
      val result = mutableMapOf<String, Any>(
        "worldTracking" to availability.isSupported,
        "depthConfidence" to false,
        "sceneMesh" to false,
        "framework" to "arcore",
        "arcoreStatus" to availability.name
      )
      if (depth != null) result["depth"] = depth
      result
    }

    View(PlasmaARView::class) {
      Events("onTrackingChange", "onSessionError")
      Prop("focusPoint") { view: PlasmaARView, point: List<Double>? ->
        view.focusPoint = point?.takeIf { it.size == 2 }?.let { floatArrayOf(it[0].toFloat(), it[1].toFloat()) }
      }
      AsyncFunction("capture") { view: PlasmaARView, promise: Promise ->
        view.capture(promise)
      }
      OnViewDestroys { view -> view.destroy() }
    }
  }
}
