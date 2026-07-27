import { Haptics } from "@capacitor/haptics";
import { isNativePlatform } from "@/native/platform";
import {
  cancelHostAlertNotifications,
  scheduleUrgentHostAlert,
} from "@/native/services/notifications";

export type HostAlertPayload = {
  event?: string;
  visitor_entry?: string;
  visitor_name?: string;
  host?: string;
  host_user?: string;
  message?: string;
};

export type ActiveHostAlert = {
  visitorEntry: string;
  visitorName: string;
  message: string;
  hostName: string;
  receivedAt: number;
  reminderCount: number;
};

const REMINDER_INTERVAL_MS = 45_000;
const MAX_REMINDERS = 20;

type ReminderState = {
  timer: ReturnType<typeof setInterval>;
  notificationIds: number[];
};

const reminders = new Map<string, ReminderState>();
let audioContext: AudioContext | null = null;

function baseNotificationId(visitorEntry: string): number {
  let hash = 0;
  for (let i = 0; i < visitorEntry.length; i += 1) {
    hash = (hash << 5) - hash + visitorEntry.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 2_000_000_000) + 1;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

/** Two-tone delivery-app style alert using Web Audio (no asset file). */
export function playHostAlertSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  void ctx.resume().then(() => {
    const now = ctx.currentTime;
    const tones = [
      { freq: 880, start: 0, duration: 0.14 },
      { freq: 660, start: 0.18, duration: 0.14 },
      { freq: 880, start: 0.36, duration: 0.2 },
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.22, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    });
  });
}

export async function triggerHostAlertHaptic(): Promise<void> {
  if (isNativePlatform()) {
    try {
      await Haptics.vibrate({ duration: 420 });
      window.setTimeout(() => {
        void Haptics.vibrate({ duration: 280 });
      }, 520);
    } catch {
      /* haptics unavailable */
    }
    return;
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([0, 220, 120, 220, 120, 360]);
  }
}

export async function fireHostAlertFeedback(): Promise<void> {
  playHostAlertSound();
  await triggerHostAlertHaptic();
}

function nextNotificationId(visitorEntry: string, reminderCount: number): number {
  return baseNotificationId(visitorEntry) + reminderCount;
}

export async function pushHostAlertNotification(
  visitorEntry: string,
  title: string,
  body: string,
  reminderCount: number,
): Promise<number> {
  const id = nextNotificationId(visitorEntry, reminderCount);
  await scheduleUrgentHostAlert({
    id,
    title,
    body,
    visitorEntry,
    reminderCount,
  });
  return id;
}

export function startHostAlertReminders(
  alert: ActiveHostAlert,
  onReminder: (next: ActiveHostAlert) => void,
): void {
  stopHostAlertReminders(alert.visitorEntry);

  const notificationIds: number[] = [];
  let count = alert.reminderCount;

  const timer = setInterval(() => {
    count += 1;
    if (count > MAX_REMINDERS) {
      stopHostAlertReminders(alert.visitorEntry);
      return;
    }

    const next: ActiveHostAlert = { ...alert, reminderCount: count };
    void fireHostAlertFeedback();
    void pushHostAlertNotification(
      alert.visitorEntry,
      "Visitor still waiting",
      next.message,
      count,
    ).then((id) => {
      const state = reminders.get(alert.visitorEntry);
      if (state) state.notificationIds.push(id);
    });
    onReminder(next);
  }, REMINDER_INTERVAL_MS);

  reminders.set(alert.visitorEntry, { timer, notificationIds });
}

export function stopHostAlertReminders(visitorEntry: string): void {
  const state = reminders.get(visitorEntry);
  if (!state) return;
  clearInterval(state.timer);
  void cancelHostAlertNotifications(state.notificationIds);
  reminders.delete(visitorEntry);
}

export function stopAllHostAlertReminders(): void {
  for (const key of [...reminders.keys()]) {
    stopHostAlertReminders(key);
  }
}
