module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  configurations: {
    'ios.sim.debug': {
      device: {
        type: 'ios.simulator',
        device: {
          type: 'iPhone 14',
        },
      },
      app: {
        type: 'ios.app',
        binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/TeacherHub.app',
        build: 'xcodebuild -workspace ios/TeacherHub.xcworkspace -scheme TeacherHub -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
      },
    },
    'android.emu.debug': {
      device: {
        type: 'android.emulator',
        device: {
          avdName: 'Pixel_3a_API_30_x86',
        },
      },
      app: {
        type: 'android.apk',
        binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
        build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
        reversePorts: [8081],
      },
    },
  },
};