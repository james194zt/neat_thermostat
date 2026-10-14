package com.neatthermostat.panelhelper

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Start the helper at boot and after an update. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        HelperService.start(context)
    }
}
