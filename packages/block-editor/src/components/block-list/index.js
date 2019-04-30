/**
 * External dependencies
 */
import {
	findLast,
	map,
	invert,
	mapValues,
	sortBy,
	throttle,
} from 'lodash';

/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import {
	withSelect,
	withDispatch,
	__experimentalAsyncModeProvider as AsyncModeProvider,
} from '@wordpress/data';
import { compose } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import BlockAsyncModeProvider from './block-async-mode-provider';
import BlockListBlock from './block';
import BlockListAppender from '../block-list-appender';
import { getBlockDOMNode } from '../../utils/dom';

const forceSyncUpdates = ( WrappedComponent ) => ( props ) => {
	return (
		<AsyncModeProvider value={ false }>
			<WrappedComponent { ...props } />
		</AsyncModeProvider>
	);
};
class BlockList extends Component {
	constructor( props ) {
		super( props );

		this.onSelectionStart = this.onSelectionStart.bind( this );
		this.onSelectionEnd = this.onSelectionEnd.bind( this );
		this.setBlockRef = this.setBlockRef.bind( this );
		this.setLastClientY = this.setLastClientY.bind( this );
		this.onPointerMove = throttle( this.onPointerMove.bind( this ), 100 );
		// Browser does not fire `*move` event when the pointer position changes
		// relative to the document, so fire it with the last known position.
		this.onScroll = () => this.onPointerMove( { clientY: this.lastClientY } );

		this.lastClientY = 0;
		this.nodes = {};
		this.state = {
			notes: [],
		};
	}

	componentDidMount() {
		window.addEventListener( 'mousemove', this.setLastClientY );
	}

	componentWillUnmount() {
		window.removeEventListener( 'mousemove', this.setLastClientY );
	}

	setLastClientY( { clientY } ) {
		this.lastClientY = clientY;
	}

	setBlockRef( node, clientId ) {
		if ( node === null ) {
			delete this.nodes[ clientId ];
		} else {
			this.nodes = {
				...this.nodes,
				[ clientId ]: node,
			};
		}
	}

	/**
	 * Handles a pointer move event to update the extent of the current cursor
	 * multi-selection.
	 *
	 * @param {MouseEvent} event A mousemove event object.
	 *
	 * @return {void}
	 */
	onPointerMove( { clientY } ) {
		// We don't start multi-selection until the mouse starts moving, so as
		// to avoid dispatching multi-selection actions on an in-place click.
		if ( ! this.props.isMultiSelecting ) {
			this.props.onStartMultiSelect();
		}

		const blockContentBoundaries = getBlockDOMNode( this.selectionAtStart ).getBoundingClientRect();

		// prevent multi-selection from triggering when the selected block is a float
		// and the cursor is still between the top and the bottom of the block.
		if ( clientY >= blockContentBoundaries.top && clientY <= blockContentBoundaries.bottom ) {
			return;
		}

		const y = clientY - blockContentBoundaries.top;
		const key = findLast( this.coordMapKeys, ( coordY ) => coordY < y );

		this.onSelectionChange( this.coordMap[ key ] );
	}

	/**
	 * Binds event handlers to the document for tracking a pending multi-select
	 * in response to a mousedown event occurring in a rendered block.
	 *
	 * @param {string} clientId Client ID of block where mousedown occurred.
	 *
	 * @return {void}
	 */
	onSelectionStart( clientId ) {
		if ( ! this.props.isSelectionEnabled ) {
			return;
		}

		const boundaries = this.nodes[ clientId ].getBoundingClientRect();

		// Create a clientId to Y coördinate map.
		const clientIdToCoordMap = mapValues( this.nodes, ( node ) =>
			node.getBoundingClientRect().top - boundaries.top );

		// Cache a Y coördinate to clientId map for use in `onPointerMove`.
		this.coordMap = invert( clientIdToCoordMap );
		// Cache an array of the Y coördinates for use in `onPointerMove`.
		// Sort the coördinates, as `this.nodes` will not necessarily reflect
		// the current block sequence.
		this.coordMapKeys = sortBy( Object.values( clientIdToCoordMap ) );
		this.selectionAtStart = clientId;

		window.addEventListener( 'mousemove', this.onPointerMove );
		// Capture scroll on all elements.
		window.addEventListener( 'scroll', this.onScroll, true );
		window.addEventListener( 'mouseup', this.onSelectionEnd );
	}

	/**
	 * Handles multi-selection changes in response to pointer move.
	 *
	 * @param {string} clientId Client ID of block under cursor in multi-select
	 *                          drag.
	 */
	onSelectionChange( clientId ) {
		const { onMultiSelect, selectionStart, selectionEnd } = this.props;
		const { selectionAtStart } = this;
		const isAtStart = selectionAtStart === clientId;

		if ( ! selectionAtStart || ! this.props.isSelectionEnabled ) {
			return;
		}

		// If multi-selecting and cursor extent returns to the start of
		// selection, cancel multi-select.
		if ( isAtStart && selectionStart ) {
			onMultiSelect( null, null );
		}

		// Expand multi-selection to block under cursor.
		if ( ! isAtStart && selectionEnd !== clientId ) {
			onMultiSelect( selectionAtStart, clientId );
		}
	}

	/**
	 * Handles a mouseup event to end the current cursor multi-selection.
	 *
	 * @return {void}
	 */
	onSelectionEnd() {
		// Cancel throttled calls.
		this.onPointerMove.cancel();

		delete this.coordMap;
		delete this.coordMapKeys;
		delete this.selectionAtStart;

		window.removeEventListener( 'mousemove', this.onPointerMove );
		window.removeEventListener( 'scroll', this.onScroll, true );
		window.removeEventListener( 'mouseup', this.onSelectionEnd );

		// We may or may not be in a multi-selection when mouseup occurs (e.g.
		// an in-place mouse click), so only trigger stop if multi-selecting.
		if ( this.props.isMultiSelecting ) {
			this.props.onStopMultiSelect();
		}
	}

	componentDidUpdate( prevProps ) {
		if ( this.props.blockAttributes === prevProps.blockAttributes ) {
			return;
		}

		const noteAnchors = document.querySelectorAll( '.note-anchor' );
		const notes = Array.from( noteAnchors ).map( ( element ) => {
			return {
				note: element.getAttribute( 'data-note' ) || '',
				id: ( element.getAttribute( 'href' ) || '' ).slice( 1 ),
			};
		} );

		this.setState( { notes } );
	}

	render() {
		const {
			blockClientIds,
			rootClientId,
			isDraggable,
			selectedBlockClientId,
			multiSelectedBlockClientIds,
			hasMultiSelection,
			renderAppender,
		} = this.props;

		return (
			<div className="editor-block-list__layout block-editor-block-list__layout">
				{ map( blockClientIds, ( clientId ) => {
					const isBlockInSelection = hasMultiSelection ?
						multiSelectedBlockClientIds.includes( clientId ) :
						selectedBlockClientId === clientId;

					return (
						<BlockAsyncModeProvider
							key={ 'block-' + clientId }
							clientId={ clientId }
							isBlockInSelection={ isBlockInSelection }
						>
							<BlockListBlock
								clientId={ clientId }
								blockRef={ this.setBlockRef }
								onSelectionStart={ this.onSelectionStart }
								rootClientId={ rootClientId }
								isDraggable={ isDraggable }
							/>
						</BlockAsyncModeProvider>
					);
				} ) }

				<BlockListAppender
					rootClientId={ rootClientId }
					renderAppender={ renderAppender }
				/>

				{ /* This needs to become a slot/fill */ }
				{ this.state.notes.length > 0 && ! rootClientId &&
					<footer>
						<h2><small>Notes</small></h2>
						<style
							dangerouslySetInnerHTML={ {
								__html: `
	body {
		counter-reset: footnotes;
	}

	.editor-styles-wrapper a.note-anchor {
		counter-increment: footnotes;
	}

	.note-anchor:after {
		margin-left: 2px;
		content: '[' counter( footnotes ) ']';
		vertical-align: super;
		font-size: smaller;
	}
	`,
							} }
						/>
						<ol>
							{ this.state.notes.map( ( { note, id } ) =>
								<li id={ id } key={ id }>
									<span
										dangerouslySetInnerHTML={ {
											__html: note,
										} }
									/>
									{ ' ' }
									<a
										href={ `#${ id }-anchor` }
										aria-label={ __( 'Back to content' ) }
									>
										↩
									</a>
								</li>
							) }
						</ol>
					</footer>
				}
			</div>
		);
	}
}

export default compose( [
	// This component needs to always be synchronous
	// as it's the one changing the async mode
	// depending on the block selection.
	forceSyncUpdates,
	withSelect( ( select, ownProps ) => {
		const {
			getBlockOrder,
			isSelectionEnabled,
			isMultiSelecting,
			getMultiSelectedBlocksStartClientId,
			getMultiSelectedBlocksEndClientId,
			getSelectedBlockClientId,
			getMultiSelectedBlockClientIds,
			hasMultiSelection,
			getBlockAttributesRef,
		} = select( 'core/block-editor' );

		const { rootClientId } = ownProps;

		return {
			blockClientIds: getBlockOrder( rootClientId ),
			selectionStart: getMultiSelectedBlocksStartClientId(),
			selectionEnd: getMultiSelectedBlocksEndClientId(),
			isSelectionEnabled: isSelectionEnabled(),
			isMultiSelecting: isMultiSelecting(),
			selectedBlockClientId: getSelectedBlockClientId(),
			multiSelectedBlockClientIds: getMultiSelectedBlockClientIds(),
			hasMultiSelection: hasMultiSelection(),
			blockAttributes: getBlockAttributesRef(),
		};
	} ),
	withDispatch( ( dispatch ) => {
		const {
			startMultiSelect,
			stopMultiSelect,
			multiSelect,
		} = dispatch( 'core/block-editor' );

		return {
			onStartMultiSelect: startMultiSelect,
			onStopMultiSelect: stopMultiSelect,
			onMultiSelect: multiSelect,
		};
	} ),
] )( BlockList );
