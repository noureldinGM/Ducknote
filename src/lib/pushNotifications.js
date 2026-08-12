import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { callFunction } from "@/lib/callFn";

let initialized = false;
let currentPushToken = null;

export async function initPushNotifications(authToken) {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  if (!authToken) {
    return null;
  }

  if (initialized) {
    return true;
  }

  try {
    console.log(
      "[DUCKNOTE PUSH] Initializing push notifications"
    );

    await PushNotifications.addListener(
      "registration",
      async (token) => {
        currentPushToken = token.value;

        if (!currentPushToken) {
          return;
        }

        try {
          await callFunction("notes", {
            action: "registerPushToken",
            pushToken: currentPushToken,
            platform: "android",
            token: authToken,
          });

          console.log(
            "[DUCKNOTE PUSH] Device token registered"
          );
        } catch (error) {
          console.error(
            "[DUCKNOTE PUSH] Token registration failed:",
            error
          );
        }
      }
    );

    await PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error(
          "[DUCKNOTE PUSH] Registration ERROR:",
          error
        );
      }
    );

    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log(
          "[DUCKNOTE PUSH] Notification received:",
          {
            id: notification.id,
            title: notification.title,
            body: notification.body,
          }
        );
      }
    );

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log(
          "[DUCKNOTE PUSH] Notification action:",
          action.notification?.data || {}
        );
      }
    );

    let permission =
      await PushNotifications.checkPermissions();

    if (permission.receive !== "granted") {
      permission =
        await PushNotifications.requestPermissions();
    }

    if (permission.receive !== "granted") {
      console.warn(
        "[DUCKNOTE PUSH] Push notification permission was not granted."
      );

      return null;
    }

    await PushNotifications.register();

    initialized = true;

    return true;
  } catch (error) {
    console.error(
      "[DUCKNOTE PUSH] INIT ERROR:",
      error
    );

    return null;
  }
}

export function resetPushNotifications() {
  initialized = false;
  currentPushToken = null;
}