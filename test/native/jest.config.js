/** @flow
 * @format */

const defaultPlatform = 'android';
const rnPlatform = process.env.TEST_RN_PLATFORM || defaultPlatform;
if ( process.env.TEST_RN_PLATFORM ) {
	// eslint-disable-next-line no-console
	console.log( 'Setting RN platform to: ' + process.env.TEST_RN_PLATFORM );
} else {
	// eslint-disable-next-line no-console
	console.log( 'Setting RN platform to: default (' + defaultPlatform + ')' );
}

const configPath = 'test/native';

module.exports = {
	verbose: true,
	rootDir: '../../',
	// Automatically clear mock calls and instances between every test
	clearMocks: true,
	preset: 'react-native',
	setupFiles: [
		'<rootDir>/' + configPath + '/setup.js',
		'<rootDir>/' + configPath + '/enzyme.config.js',
	],
	testEnvironment: 'jsdom',
	testMatch: [
		'**/test/*.native.[jt]s?(x)',
	],
	testPathIgnorePatterns: [
		'/node_modules/',
		'/__device-tests__/',
	],
	testURL: 'http://localhost/',
	moduleDirectories: [ 'node_modules', 'symlinked-packages' ],
	moduleNameMapper: {
		// Mock the CSS modules. See https://facebook.github.io/jest/docs/en/webpack.html#handling-static-assets
		'\\.(scss)$': '<rootDir>/' + configPath + '/__mocks__/styleMock.js',
	},
	haste: {
		defaultPlatform: rnPlatform,
		platforms: [
			'android',
			'ios',
			'native',
		],
		hasteImplModulePath: '<rootDir>/node_modules/react-native/jest/hasteImpl.js',
		providesModuleNodeModules: [
			'react-native',
			'react-native-svg',
		],
	},
	transformIgnorePatterns: [
		// This is required for now to have jest transform some of our modules
		// See: https://github.com/wordpress-mobile/gutenberg-mobile/pull/257#discussion_r234978268
		// There is no overloading in jest so we need to rewrite the config from react-native-jest-preset:
		// https://github.com/facebook/react-native/blob/master/jest-preset.json#L20
		'node_modules/(?!(simple-html-tokenizer|(jest-)?react-native|react-clone-referenced-element))',
	],
	snapshotSerializers: [
		'enzyme-to-json/serializer',
	],
	reporters: [ 'default', 'jest-junit' ],
};
