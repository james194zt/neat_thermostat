package com.neatthermostat.panelhelper

import android.content.Context
import java.security.SecureRandom

/** Settings the helper keeps on the panel (Neat changes them over the local API). */
class HelperPrefs(context: Context) {
    private val prefs = context.getSharedPreferences("neat_panel_helper", Context.MODE_PRIVATE)
    private val random = SecureRandom()

    /** Key Neat sends with every request; blank until paired. */
    var apiKey: String
        get() = prefs.getString("api_key", "") ?: ""
        set(value) = prefs.edit().putString("api_key", value).apply()

    /** 6 digits shown on the helper's screen; typed into Neat once to pair. */
    val pairingCode: String
        get() {
            val saved = prefs.getString("pairing_code", null)
            if (saved != null) return saved
            return newPairingCode()
        }

    fun newPairingCode(): String {
        val code = (random.nextInt(900_000) + 100_000).toString()
        prefs.edit().putString("pairing_code", code).apply()
        return code
    }

    fun newApiKey(): String {
        val bytes = ByteArray(24)
        random.nextBytes(bytes)
        val key = bytes.joinToString("") { "%02x".format(it) }
        apiKey = key
        return key
    }

    /**
     * Accessibility services to keep switched off (flattened component names).
     * null = automatic: whatever is labelled "Return to main program" (Sonoff's floating button).
     */
    var blockedServices: Set<String>?
        get() = if (prefs.contains("blocked_services")) prefs.getStringSet("blocked_services", emptySet()) else null
        set(value) {
            if (value == null) prefs.edit().remove("blocked_services").apply()
            else prefs.edit().putStringSet("blocked_services", value).apply()
        }

    /** Hold a CPU + Wi-Fi lock so the panel stays reachable with the screen off. */
    var stayAwake: Boolean
        get() = prefs.getBoolean("stay_awake", true)
        set(value) = prefs.edit().putBoolean("stay_awake", value).apply()

    /** Turn the screen on when the proximity sensor sees someone (off: the panel does its own). */
    var wakeOnApproach: Boolean
        get() = prefs.getBoolean("wake_on_approach", false)
        set(value) = prefs.edit().putBoolean("wake_on_approach", value).apply()
}
