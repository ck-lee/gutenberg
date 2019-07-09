/**
 * WordPress dependencies
 */

/**
 * Internal dependencies
 */
import { apiFetch } from './controls';
import { setDiscoverBlocks } from './actions';

export default {
	* getDiscoverBlocks() {
		const discoverblocks = yield apiFetch( {
			path: 'http://www.mocky.io/v2/5d23c9d52e0000b7a6c3f1f4',
		} );
		return setDiscoverBlocks( discoverblocks );
	},
};
