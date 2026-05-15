const globalObject = globalThis as typeof globalThis & {
  WeakRef?: new <T extends object>(value: T) => { deref(): T | undefined };
  FinalizationRegistry?: new <T>(cleanup: (heldValue: T) => void) => {
    register(target: object, heldValue: T, unregisterToken?: object): void;
    unregister(unregisterToken: object): boolean;
  };
};

if (typeof globalObject.WeakRef === 'undefined') {
  class WeakRefPolyfill<T extends object> {
    private value: T | undefined;

    constructor(value: T) {
      this.value = value;
    }

    deref(): T | undefined {
      return this.value;
    }
  }

  globalObject.WeakRef = WeakRefPolyfill as typeof globalObject.WeakRef;
}

if (typeof globalObject.FinalizationRegistry === 'undefined') {
  class FinalizationRegistryPolyfill<T> {
    constructor(_cleanup: (heldValue: T) => void) {}

    register(_target: object, _heldValue: T, _unregisterToken?: object): void {}

    unregister(_unregisterToken: object): boolean {
      return false;
    }
  }

  globalObject.FinalizationRegistry = FinalizationRegistryPolyfill as typeof globalObject.FinalizationRegistry;
}
