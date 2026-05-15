const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const WHEN_UNLOCKED = 'WHEN_UNLOCKED';
const AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK';
const ALWAYS = 'ALWAYS';
const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY';
const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';
const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY';
const ALWAYS_THIS_DEVICE_ONLY = 'ALWAYS_THIS_DEVICE_ONLY';

const ExpoSecureStore = {
  AFTER_FIRST_UNLOCK,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  ALWAYS,
  ALWAYS_THIS_DEVICE_ONLY,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  WHEN_UNLOCKED,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  canUseBiometricAuthentication() {
    return false;
  },
  async deleteValueWithKeyAsync(key) {
    await AsyncStorage.removeItem(key);
  },
  async getValueWithKeyAsync(key) {
    return AsyncStorage.getItem(key);
  },
  getValueWithKeySync() {
    return null;
  },
  async setValueWithKeyAsync(value, key) {
    await AsyncStorage.setItem(key, value);
  },
  setValueWithKeySync() {
    return null;
  },
};

module.exports = ExpoSecureStore;
module.exports.default = ExpoSecureStore;
