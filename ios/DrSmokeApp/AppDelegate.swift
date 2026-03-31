import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import UserNotifications

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    self.moduleName = "DrSmokeApp"
    self.dependencyProvider = RCTAppDependencyProvider()
    self.initialProps = [:]
    UNUserNotificationCenter.current().delegate = self

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .list, .sound])
    } else {
      completionHandler([.alert, .sound])
    }
  }

  // RN просит sourceURL -> отдаём bundleURL()
  override func sourceURL(for bridge: RCTBridge!) -> URL! {
    return self.bundleURL()
  }

  // Вот это и есть “getBundleURL” по смыслу (без этого и падает)
  override func bundleURL() -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
