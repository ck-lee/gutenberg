/**
 * External dependencies
 */
import {
	findLast,
	invert,
	mapValues,
	sortBy,
	throttle,
} from 'lodash';
import { useSpring, animated, interpolate } from 'react-spring';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Component, useLayoutEffect, useState, useRef } from '@wordpress/element';
import {
	withSelect,
	withDispatch,
	__experimentalAsyncModeProvider as AsyncModeProvider,
} from '@wordpress/data';
import { compose, useReducedMotion } from '@wordpress/compose';

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

const BlockListItemWrapper = ( { blockClientIds, isBlockInSelection, ...props } ) => {
	const ref = useRef( null );
	const [ resetAnimation, updateReset ] = useState( false );
	const [ transform, setTransform ] = useState( { x: 0, y: 0 } );
	const previous = ref.current ? ref.current.getBoundingClientRect() : null;
	const prefersReducedMotion = useReducedMotion();
	useLayoutEffect( () => {
		if ( prefersReducedMotion ) {
			return;
		}
		ref.current.style.transform = 'none';
		const destination = ref.current.getBoundingClientRect();
		const newTransform = {
			x: previous ? previous.left - destination.left : 0,
			y: previous ? previous.top - destination.top : 0,
		};
		ref.current.style.transform = `translate3d(${ newTransform.x }px,${ newTransform.y }px,0)`;
		updateReset( true );
		setTransform( newTransform );
	}, [ blockClientIds ] );
	useLayoutEffect( () => {
		if ( resetAnimation ) {
			updateReset( false );
		}
	}, [ resetAnimation ] );
	const animationProps = useSpring( {
		from: {
			...transform,
		//	opacity: 0,
		//	scale: 0,
		},
		to: {
			x: 0,
			y: 0,
		//	scale: isBlockInSelection ? 1 : 0,
		//	opacity: isBlockInSelection ? 0 : 1,
		},
		reset: resetAnimation,
		config: { mass: 5, tension: 2000, friction: 200 },
		immediate: prefersReducedMotion,
	} );

	return (
		<animated.div
			ref={ ref }
			className={ classnames( 'editor-block-list__block-animated-container', {
				'is-in-selection': isBlockInSelection,
			} ) }
			data-client-id={ props.clientId }
			style={ {
				position: 'relative',
				transformOrigin: 'center',
				/* opacity: animationProps.opacity.interpolate( {
					range: [ 0, 0.2, 0.8, 1 ],
					output: [ 1, 0.5, 0.5, 1 ],
				} ), */
				transform: interpolate(
					[
						animationProps.x,
						// eslint-disable-next-line
						animationProps.y
						/*	animationProps.scale.interpolate( {
							range: [ 0, 0.2, 0.8, 1 ],
							output: [ 1, 1.02, 1.02, 1 ],
						} ),*/
					],
					( x, y/*, scale*/ ) => `translate3d(${ x }px,${ y }px,0)` // +  `scale(${ scale })`
				),
			} }
		>
			<BlockListBlock
				{ ...props }
			/>
		</animated.div>
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
			<div className="editor-block-list__layout block-editor-block-list__layout" style={ { position: 'relative' } }>
				{ blockClientIds.map( ( clientId ) => {
					const isBlockInSelection = hasMultiSelection ?
						multiSelectedBlockClientIds.includes( clientId ) :
						selectedBlockClientId === clientId;

					return (
						<BlockAsyncModeProvider
							key={ 'block-' + clientId }
							clientId={ clientId }
							isBlockInSelection={ isBlockInSelection }
						>
							<BlockListItemWrapper
								rootClientId={ rootClientId }
								clientId={ clientId }
								blockRef={ this.setBlockRef }
								onSelectionStart={ this.onSelectionStart }
								isDraggable={ isDraggable }
								blockClientIds={ blockClientIds }
								isBlockInSelection={ isBlockInSelection }
							/>
						</BlockAsyncModeProvider>
					);
				} ) }

				<BlockListAppender
					rootClientId={ rootClientId }
					renderAppender={ renderAppender }
				/>
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
