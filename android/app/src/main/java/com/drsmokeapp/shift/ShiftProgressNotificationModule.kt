package com.drsmokeapp.shift

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.drsmokeapp.R
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShiftProgressNotificationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val CHANNEL_ID = "shift_progress_channel"
    private const val CHANNEL_NAME = "Смена"
    private const val CHANNEL_DESCRIPTION = "Прогресс текущей смены"
    private const val NOTIFICATION_ID = 43001
  }

  override fun getName(): String = "ShiftProgressNotification"

  @ReactMethod
  fun showOrUpdateShiftProgressNotification(
    title: String,
    body: String,
    progress: Int,
    indeterminate: Boolean
  ) {
    if (!canPostNotifications()) {
      return
    }

    createChannelIfNeeded()

    val normalizedProgress = progress.coerceIn(0, 100)
    val builder = NotificationCompat.Builder(reactContext, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title.ifBlank { "Смена" })
      .setContentText(body.ifBlank { "Идет смена" })
      .setStyle(NotificationCompat.BigTextStyle().bigText(body.ifBlank { "Идет смена" }))
      .setProgress(100, normalizedProgress, indeterminate)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setAutoCancel(false)
      .setSilent(true)

    NotificationManagerCompat.from(reactContext).notify(NOTIFICATION_ID, builder.build())
  }

  @ReactMethod
  fun cancelShiftProgressNotification() {
    NotificationManagerCompat.from(reactContext).cancel(NOTIFICATION_ID)
  }

  private fun canPostNotifications(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return true
    }

    val granted = ContextCompat.checkSelfPermission(
      reactContext,
      Manifest.permission.POST_NOTIFICATIONS
    ) == PackageManager.PERMISSION_GRANTED

    return granted
  }

  private fun createChannelIfNeeded() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val existingChannel = manager.getNotificationChannel(CHANNEL_ID)
    if (existingChannel != null) {
      return
    }

    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = CHANNEL_DESCRIPTION
      setShowBadge(false)
    }

    manager.createNotificationChannel(channel)
  }
}

