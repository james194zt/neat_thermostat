package com.neatthermostat.panelhelper

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import org.json.JSONArray
import org.json.JSONObject

/**
 * The panel's own sensors: proximity (someone close), light, and temperature/humidity
 * where the hardware has them. Reported to Neat; proximity can also wake the screen.
 */
class PanelSensors(context: Context, private val onApproach: () -> Unit) : SensorEventListener {
    private val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val proximity: Sensor? = manager.getDefaultSensor(Sensor.TYPE_PROXIMITY)
    private val light: Sensor? = manager.getDefaultSensor(Sensor.TYPE_LIGHT)
    private val temperature: Sensor? = manager.getDefaultSensor(Sensor.TYPE_AMBIENT_TEMPERATURE)
    private val humidity: Sensor? = manager.getDefaultSensor(Sensor.TYPE_RELATIVE_HUMIDITY)

    @Volatile private var proximityValue: Float? = null
    @Volatile private var near = false
    @Volatile private var lastNearAt = 0L
    @Volatile private var lux: Float? = null
    @Volatile private var tempC: Float? = null
    @Volatile private var humidityPct: Float? = null

    fun start() {
        for (sensor in listOfNotNull(proximity, light, temperature, humidity)) {
            manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    fun stop() {
        manager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        val value = event.values.firstOrNull() ?: return
        when (event.sensor.type) {
            Sensor.TYPE_PROXIMITY -> {
                proximityValue = value
                // Most proximity sensors only say near (0) or far (their max range).
                val nowNear = value < (event.sensor.maximumRange.takeIf { it > 0f } ?: 5f)
                if (nowNear && !near) {
                    lastNearAt = System.currentTimeMillis()
                    onApproach()
                }
                near = nowNear
            }
            Sensor.TYPE_LIGHT -> lux = value
            Sensor.TYPE_AMBIENT_TEMPERATURE -> tempC = value
            Sensor.TYPE_RELATIVE_HUMIDITY -> humidityPct = value
        }
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) = Unit

    fun status(): JSONObject {
        val all = JSONArray()
        for (s in manager.getSensorList(Sensor.TYPE_ALL)) {
            all.put(JSONObject().put("name", s.name).put("type", s.stringType).put("vendor", s.vendor))
        }
        return JSONObject()
            .put("proximity", proximity?.let {
                JSONObject()
                    .put("near", near)
                    .put("value", proximityValue?.toDouble())
                    .put("max_range", it.maximumRange.toDouble())
                    .put("last_near_at", if (lastNearAt > 0) lastNearAt else JSONObject.NULL)
            } ?: JSONObject.NULL)
            .put("light_lux", lux?.toDouble() ?: JSONObject.NULL)
            .put("temperature_c", tempC?.toDouble() ?: JSONObject.NULL)
            .put("humidity_pct", humidityPct?.toDouble() ?: JSONObject.NULL)
            .put("available", all)
    }
}
