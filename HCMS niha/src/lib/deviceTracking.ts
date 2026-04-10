import { UserDevice } from './models';
import { db } from './services/db';
import { Collections } from './constants';

interface DeviceInfo {
  deviceId: string;
  deviceModel: string;
  deviceType: string;
  browser: string;
  os: string;
}

const generateDeviceId = (): string => {
  const nav = navigator as any;
  const screen = window.screen;

  const components = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 'unknown',
    nav.deviceMemory || 'unknown',
  ].join('|');

  return btoa(components).substring(0, 64);
};

const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent;

  let deviceType = 'desktop';
  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  let browser = 'Unknown';
  if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (userAgent.indexOf('Chrome') > -1) {
    browser = 'Chrome';
  } else if (userAgent.indexOf('Safari') > -1) {
    browser = 'Safari';
  } else if (userAgent.indexOf('Edge') > -1) {
    browser = 'Edge';
  }

  let os = 'Unknown';
  if (userAgent.indexOf('Windows') > -1) {
    os = 'Windows';
  } else if (userAgent.indexOf('Mac') > -1) {
    os = 'macOS';
  } else if (userAgent.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (userAgent.indexOf('Android') > -1) {
    os = 'Android';
  } else if (userAgent.indexOf('iOS') > -1 || userAgent.indexOf('iPhone') > -1) {
    os = 'iOS';
  }

  const deviceModel = `${os} ${deviceType}`;

  return {
    deviceId: generateDeviceId(),
    deviceModel,
    deviceType,
    browser,
    os,
  };
};

export const trackDeviceLogin = async (userId: string): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const deviceInfo = getDeviceInfo();

    const existingDevice = await db.findOne<UserDevice>(Collections.USER_DEVICES, {
      user_id: userId,
      device_id: deviceInfo.deviceId,
    });

    if (existingDevice) {
      if (existingDevice.is_blocked) {
        return {
          allowed: false,
          reason: 'This device has been blocked by an administrator. Please contact support.'
        };
      }

      if (!existingDevice.is_approved) {
        return {
          allowed: false,
          reason: 'This device is pending approval by an administrator. Please contact your admin or try again later.'
        };
      }

      await db.updateById<UserDevice>(
        Collections.USER_DEVICES,
        existingDevice.id!,
        {
          last_login: new Date().toISOString(),
          login_count: (existingDevice.login_count || 0) + 1,
        }
      );

      return { allowed: true };
    }

    // New device - create with is_approved: false
    await db.insertOne<UserDevice>(Collections.USER_DEVICES, {
      user_id: userId,
      device_id: deviceInfo.deviceId,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      device_type: deviceInfo.deviceType,
      user_agent: navigator.userAgent,
      ip_address: null,
      location: null,
      last_login: new Date().toISOString(),
      login_count: 1,
      is_blocked: false,
      is_approved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    return {
      allowed: false,
      reason: 'New device detected. Your device has been registered and is pending approval by an administrator. Please contact your admin.'
    };
  } catch (error) {
    console.error('Error in device tracking:', error);
    return { allowed: true };
  }
};

export const getCurrentDeviceId = (): string => {
  return getDeviceInfo().deviceId;
};

export const updateDeviceLastSeen = async (userId: string): Promise<void> => {
  try {
    const deviceId = getCurrentDeviceId();

    // Find device
    const existingDevice = await db.findOne<UserDevice>(Collections.USER_DEVICES, {
      user_id: userId,
      device_id: deviceId,
    });

    if (existingDevice && existingDevice.id) {
      await db.updateById(
        Collections.USER_DEVICES,
        existingDevice.id,
        {
          last_login: new Date().toISOString(),
        }
      );
    }
  } catch (error) {
    // Silent fail for heartbeat
    console.error('Error updating device last seen:', error);
  }
};
