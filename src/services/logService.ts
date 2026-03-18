import axios from 'axios';

const LOG_FUNCTION_URL = process.env.LOG_FUNCTION_URL || '/__/functions/logCustom';

export async function logToCloud(message: string, level: 'info' | 'warn' | 'error' = 'info', context?: any) {
  try {
    await axios.post(LOG_FUNCTION_URL, {
      message,
      level,
      context,
    });
  } catch (err) {
    // fallback to console
    console.error('Failed to send log to cloud function:', err);
  }
}
