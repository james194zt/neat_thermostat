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

    // Stay-awake locks, both off by default: on the NSPanel Pro (Rockchip) a held lock
    // stopped Fully turning the screen off (14 Oct). Separate so each can be tried.
    /** CPU wake lock: the panel keeps running with the screen off. */
    var cpuLock: Boolean
        get() = prefs.getBoolean("cpu_lock", false)
        set(value) = prefs.edit().putBoolean("cpu_lock", value).apply()

    /** High-performance Wi-Fi lock: Wi-Fi stays fully up with the screen off. */
    var wifiLock: Boolean
        get() = prefs.getBoolean("wifi_lock", false)
        set(value) = prefs.edit().putBoolean("wifi_lock", value).apply()

    /** Self-update progress, shown to Neat ("Downloading", "Installed 0.2.1", "Failed: …"). */
    var updateState: String
        get() = prefs.getString("update_state", "") ?: ""
        set(value) = prefs.edit().putString("update_state", value).apply()

    /** Version code an update is heading for (0 = none). */
    var updateTarget: Long
        get() = prefs.getLong("update_target", 0L)
        set(value) = prefs.edit().putLong("update_target", value).apply()

    /** Turn the screen on when the proximity sensor sees someone (off: the panel does its own). */
    var wakeOnApproach: Boolean
        get() = prefs.getBoolean("wake_on_approach", false)
        set(value) = prefs.edit().putBoolean("wake_on_approach", value).apply()
}
