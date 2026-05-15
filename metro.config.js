const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList =
  require('metro-config/private/defaults/exclusionList').default;

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  /parser-backend\/node_modules\/.*/,
  /parser-backend\/_node_modules_hold\/.*/,
]);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-secure-store' || moduleName.startsWith('expo-secure-store/')) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'shims/expo-secure-store.js'),
    };
  }

  if (moduleName.startsWith('@/')) {
    const resolvedModuleName = path.resolve(__dirname, moduleName.slice(2));

    if (typeof defaultResolveRequest === 'function') {
      return defaultResolveRequest(context, resolvedModuleName, platform);
    }

    return context.resolveRequest(context, resolvedModuleName, platform);
  }

  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
