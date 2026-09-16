/**
 * Universal Native Notification Service for KhataGHAR
 * Supports:
 * - Desktop Electron native OS notifications via IPC
 * - Mobile/Web Notification API (PWA / Browser)
 * - Scheduled notifications via @capacitor/local-notifications (Android/iOS)
 * - Android Notification Channels with high importance and vibration
 * - Permission requests and graceful in-app fallback
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeMobile } from './native';
import type { PlannedExpense, SavingsGoal } from '../types';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

/**
 * Deterministically hash any string ID into a 32-bit positive integer for Capacitor local notifications.
 */
export function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647 || 1;
}

let channelInitialized = false;

/**
 * Initialize high-importance Android notification channel for bill and goal reminders.
 */
export async function initNotificationChannels(): Promise<void> {
  if (!isNativeMobile || channelInitialized) return;
  try {
    await LocalNotifications.createChannel({
      id: 'reminders',
      name: 'Bill & Goal Reminders',
      description: 'Scheduled alerts for upcoming bills, commitments, and financial targets',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#12855a',
    });
    channelInitialized = true;
  } catch (err) {
    console.warn('[Notification] Failed to create notification channel:', err);
  }
}

/**
 * Request notification permissions across Electron, Android native, or Web.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Electron always has permission
  if ((window as any).electronAPI?.notification) {
    return true;
  }

  // 2. Android / iOS Native Capacitor
  if (isNativeMobile) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return true;
      const req = await LocalNotifications.requestPermissions();
      return req.display === 'granted';
    } catch {
      return false;
    }
  }

  // 3. Web / PWA Notification API
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Send an immediate native notification.
 */
export async function sendNativeNotification(options: NotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const { title, body, icon = '/favicon.svg', tag } = options;

  // 1. Electron Native OS Notification
  const electronAPI = (window as any).electronAPI;
  if (electronAPI?.notification?.show) {
    try {
      await electronAPI.notification.show({ title, body });
      return true;
    } catch (e) {
      console.warn('[Notification] Electron notification failed:', e);
    }
  }

  // 2. Mobile Native Local Notifications (Capacitor)
  if (isNativeMobile) {
    try {
      await initNotificationChannels();
      const hasPerm = await requestNotificationPermission();
      if (hasPerm) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 1000000) + 1,
              title,
              body,
              channelId: 'reminders',
              schedule: { at: new Date(Date.now() + 500) },
              smallIcon: 'ic_launcher_foreground',
            },
          ],
        });
        return true;
      }
    } catch (e) {
      console.warn('[Notification] Capacitor notification failed:', e);
    }
  }

  // 3. Web / PWA / Browser Notification API
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon,
          tag,
          badge: icon,
        });
        return true;
      } catch (e) {
        console.warn('[Notification] Web notification failed:', e);
      }
    } else if (Notification.permission !== 'denied') {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body, icon, tag });
          return true;
        }
      } catch {}
    }
  }

  return false;
}

/**
 * Schedule a native OS notification for a planned expense / bill.
 * Fires at 9:00 AM on the target day (on due date or N days before).
 */
export async function schedulePlanNotification(
  plan: PlannedExpense,
  reminderDaysBefore: number = 0
): Promise<boolean> {
  if (!isNativeMobile) return false;

  try {
    await initNotificationChannels();
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm) return false;

    const [y, m, d] = plan.dueDate.split('-').map(Number);
    if (!y || !m || !d) return false;

    const targetDate = new Date(y, m - 1, d, 9, 0, 0);
    if (reminderDaysBefore > 0) {
      targetDate.setDate(targetDate.getDate() - reminderDaysBefore);
    }

    const now = new Date();
    // If target timestamp is in the past
    if (targetDate.getTime() <= now.getTime()) {
      const todayStr = now.toISOString().split('T')[0];
      if (plan.dueDate === todayStr) {
        targetDate.setTime(now.getTime() + 5000); // 5s from now for same-day addition
      } else {
        return false;
      }
    }

    const notifId = hashStringToInt(plan.id);
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: `Upcoming Payment: ${plan.name}`,
          body: `₹${plan.amount.toLocaleString('en-IN')} is due ${
            reminderDaysBefore > 0 ? `in ${reminderDaysBefore} day(s)` : 'today'
          } (${plan.dueDate})`,
          channelId: 'reminders',
          schedule: { at: targetDate },
          smallIcon: 'ic_launcher_foreground',
          extra: { planId: plan.id },
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn('[Notification] Failed to schedule plan notification:', err);
    return false;
  }
}

/**
 * Cancel a scheduled notification for a planned expense when paid, deleted, or cancelled.
 */
export async function cancelPlanNotification(planId: string): Promise<void> {
  if (!isNativeMobile) return;
  try {
    const notifId = hashStringToInt(planId);
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
  } catch {}
}

/**
 * Check and notify user of upcoming reminders upon vault unlock / app boot.
 * Scans for pending bills due within 2 days and savings goals approaching target date.
 */
export async function checkAndNotifyUpcomingReminders(
  plannedExpenses: PlannedExpense[],
  goals: SavingsGoal[] = []
): Promise<void> {
  if (typeof window === 'undefined') return;

  const todayStr = new Date().toISOString().split('T')[0];
  const sessionKey = `khataghar_reminders_checked_${todayStr}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, 'true');

  const todayTime = new Date(todayStr + 'T00:00:00').getTime();

  // 1. Pending bills due today or within 2 days
  const duePlans = plannedExpenses.filter((p) => {
    if (p.status !== 'pending') return false;
    const pTime = new Date(p.dueDate + 'T00:00:00').getTime();
    const diffDays = Math.round((pTime - todayTime) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 2;
  });

  for (const plan of duePlans) {
    const pTime = new Date(plan.dueDate + 'T00:00:00').getTime();
    const diffDays = Math.round((pTime - todayTime) / (1000 * 60 * 60 * 24));
    const dueText = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : 'in 2 days';
    await sendNativeNotification({
      title: `Upcoming Payment Due (${dueText})`,
      body: `${plan.name} of ₹${plan.amount.toLocaleString('en-IN')} is due ${dueText}.`,
      tag: `bill-${plan.id}`,
    });
  }

  // 2. Savings goals approaching deadline within 7 days
  const approachingGoals = goals.filter((g) => {
    if (g.isCompleted || !g.targetDate) return false;
    const gTime = new Date(g.targetDate + 'T00:00:00').getTime();
    const diffDays = Math.round((gTime - todayTime) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7 && g.currentAmount < g.targetAmount;
  });

  for (const goal of approachingGoals) {
    await sendNativeNotification({
      title: `Savings Goal Target Approaching`,
      body: `${goal.name}: ₹${goal.currentAmount.toLocaleString('en-IN')} of ₹${goal.targetAmount.toLocaleString('en-IN')} accumulated. Target date: ${goal.targetDate}.`,
      tag: `goal-${goal.id}`,
    });
  }
}
