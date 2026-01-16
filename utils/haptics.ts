export const haptic = {
  // Subtle tap for keypad/buttons
  tap: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
    }
  },
  // Medium feedback for important buttons
  button: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
    }
  },
  // Success pattern (e.g. unlock, safe check-in)
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
    }
  },
  // Error pattern (wrong pin)
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 50, 50, 50, 50]);
    }
  },
  // Warning pattern (timer running out)
  warning: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
  },
  // SOS pattern (Heavy vibration)
  sos: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([500, 100, 500, 100, 500, 100, 1000]);
    }
  }
};