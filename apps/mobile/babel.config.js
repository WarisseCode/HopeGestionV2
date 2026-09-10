module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@hopegestion/api-client': '../../packages/api-client/src/index.ts',
            '@hopegestion/shared-types': '../../packages/shared-types/src/index.ts',
            '@hopegestion/utils': '../../packages/utils/src/index.ts',
          },
        },
      ],
    ],
  };
};
