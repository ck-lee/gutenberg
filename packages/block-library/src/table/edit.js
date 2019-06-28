/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Component } from '@wordpress/element';
import {
	InspectorControls,
	BlockControls,
	RichText,
	PanelColorSettings,
	createCustomColorsHOC,
	BlockIcon,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	ToggleControl,
	TextControl,
	Button,
	Toolbar,
	DropdownMenu,
	Placeholder,
	IconButton,
} from '@wordpress/components';

/**
 * Internal dependencies
 */
import {
	createTable,
	updateCellContent,
	insertRow,
	deleteRow,
	insertColumn,
	deleteColumn,
	toggleSection,
} from './state';
import icon from './icon';
import captionTopIcon from './caption-top-icon';
import captionBottomIcon from './caption-bottom-icon';

const BACKGROUND_COLORS = [
	{
		color: '#f3f4f5',
		name: 'Subtle light gray',
		slug: 'subtle-light-gray',
	},
	{
		color: '#e9fbe5',
		name: 'Subtle pale green',
		slug: 'subtle-pale-green',
	},
	{
		color: '#e7f5fe',
		name: 'Subtle pale blue',
		slug: 'subtle-pale-blue',
	},
	{
		color: '#fcf0ef',
		name: 'Subtle pale pink',
		slug: 'subtle-pale-pink',
	},
];

const withCustomBackgroundColors = createCustomColorsHOC( BACKGROUND_COLORS );

export class TableEdit extends Component {
	constructor() {
		super( ...arguments );

		this.onCreateTable = this.onCreateTable.bind( this );
		this.onChangeFixedLayout = this.onChangeFixedLayout.bind( this );
		this.onChange = this.onChange.bind( this );
		this.onChangeInitialColumnCount = this.onChangeInitialColumnCount.bind( this );
		this.onChangeInitialRowCount = this.onChangeInitialRowCount.bind( this );
		this.renderSection = this.renderSection.bind( this );
		this.getTableControls = this.getTableControls.bind( this );
		this.onInsertRow = this.onInsertRow.bind( this );
		this.onInsertRowBefore = this.onInsertRowBefore.bind( this );
		this.onInsertRowAfter = this.onInsertRowAfter.bind( this );
		this.onDeleteRow = this.onDeleteRow.bind( this );
		this.onInsertColumn = this.onInsertColumn.bind( this );
		this.onInsertColumnBefore = this.onInsertColumnBefore.bind( this );
		this.onInsertColumnAfter = this.onInsertColumnAfter.bind( this );
		this.onDeleteColumn = this.onDeleteColumn.bind( this );
		this.onToggleHeaderSection = this.onToggleHeaderSection.bind( this );
		this.onToggleFooterSection = this.onToggleFooterSection.bind( this );

		this.state = {
			initialRowCount: 2,
			initialColumnCount: 2,
			selectedCell: null,
		};
	}

	/**
	 * Updates the initial column count used for table creation.
	 *
	 * @param {number} initialColumnCount New initial column count.
	 */
	onChangeInitialColumnCount( initialColumnCount ) {
		this.setState( { initialColumnCount } );
	}

	/**
	 * Updates the initial row count used for table creation.
	 *
	 * @param {number} initialRowCount New initial row count.
	 */
	onChangeInitialRowCount( initialRowCount ) {
		this.setState( { initialRowCount } );
	}

	/**
	 * Creates a table based on dimensions in local state.
	 *
	 * @param {Object} event Form submit event.
	 */
	onCreateTable( event ) {
		event.preventDefault();

		const { setAttributes } = this.props;
		let { initialRowCount, initialColumnCount } = this.state;

		initialRowCount = parseInt( initialRowCount, 10 ) || 2;
		initialColumnCount = parseInt( initialColumnCount, 10 ) || 2;

		setAttributes( createTable( {
			rowCount: initialRowCount,
			columnCount: initialColumnCount,
		} ) );
	}

	/**
	 * Toggles whether the table has a fixed layout or not.
	 */
	onChangeFixedLayout() {
		const { attributes, setAttributes } = this.props;
		const { hasFixedLayout } = attributes;

		setAttributes( { hasFixedLayout: ! hasFixedLayout } );
	}

	/**
	 * Changes the content of the currently selected cell.
	 *
	 * @param {Array} content A RichText content value.
	 */
	onChange( content ) {
		const { selectedCell } = this.state;

		if ( ! selectedCell ) {
			return;
		}

		const { attributes, setAttributes } = this.props;
		const { section, rowIndex, columnIndex } = selectedCell;

		setAttributes( updateCellContent( attributes, {
			section,
			rowIndex,
			columnIndex,
			content,
		} ) );
	}

	/**
	 * Inserts a row at the currently selected row index, plus `delta`.
	 *
	 * @param {number} delta Offset for selected row index at which to insert.
	 */
	onInsertRow( delta ) {
		const { selectedCell } = this.state;

		if ( ! selectedCell ) {
			return;
		}

		const { attributes, setAttributes } = this.props;
		const { section, rowIndex } = selectedCell;

		this.setState( { selectedCell: null } );
		setAttributes( insertRow( attributes, {
			section,
			rowIndex: rowIndex + delta,
		} ) );
	}

	/**
	 * Inserts a row before the currently selected row.
	 */
	onInsertRowBefore() {
		this.onInsertRow( 0 );
	}

	/**
	 * Inserts a row after the currently selected row.
	 */
	onInsertRowAfter() {
		this.onInsertRow( 1 );
	}

	onToggleHeaderSection() {
		const { attributes, setAttributes } = this.props;
		setAttributes( toggleSection( attributes, 'head' ) );
	}

	onToggleFooterSection() {
		const { attributes, setAttributes } = this.props;
		setAttributes( toggleSection( attributes, 'foot' ) );
	}

	/**
	 * Deletes the currently selected row.
	 */
	onDeleteRow() {
		const { selectedCell } = this.state;

		if ( ! selectedCell ) {
			return;
		}

		const { attributes, setAttributes } = this.props;
		const { section, rowIndex } = selectedCell;

		this.setState( { selectedCell: null } );
		setAttributes( deleteRow( attributes, { section, rowIndex } ) );
	}

	/**
	 * Inserts a column at the currently selected column index, plus `delta`.
	 *
	 * @param {number} delta Offset for selected column index at which to insert.
	 */
	onInsertColumn( delta = 0 ) {
		const { selectedCell } = this.state;

		if ( ! selectedCell ) {
			return;
		}

		const { attributes, setAttributes } = this.props;
		const { section, columnIndex } = selectedCell;

		this.setState( { selectedCell: null } );
		setAttributes( insertColumn( attributes, {
			section,
			columnIndex: columnIndex + delta,
		} ) );
	}

	/**
	 * Inserts a column before the currently selected column.
	 */
	onInsertColumnBefore() {
		this.onInsertColumn( 0 );
	}

	/**
	 * Inserts a column after the currently selected column.
	 */
	onInsertColumnAfter() {
		this.onInsertColumn( 1 );
	}

	/**
	 * Deletes the currently selected column.
	 */
	onDeleteColumn() {
		const { selectedCell } = this.state;

		if ( ! selectedCell ) {
			return;
		}

		const { attributes, setAttributes } = this.props;
		const { section, columnIndex } = selectedCell;

		this.setState( { selectedCell: null } );
		setAttributes( deleteColumn( attributes, { section, columnIndex } ) );
	}

	/**
	 * Creates an onFocus handler for a specified cell.
	 *
	 * @param {Object} selectedCell Object with `section`, `rowIndex`, and
	 *                              `columnIndex` properties.
	 *
	 * @return {Function} Function to call on focus.
	 */
	createOnFocus( selectedCell ) {
		return () => {
			this.setState( { selectedCell, isCaptionSelected: false } );
		};
	}

	/**
	 * Gets the table controls to display in the block toolbar.
	 *
	 * @return {Array} Table controls.
	 */
	getTableControls() {
		const { selectedCell } = this.state;

		return [
			{
				icon: 'table-row-before',
				title: __( 'Add Row Before' ),
				isDisabled: ! selectedCell,
				onClick: this.onInsertRowBefore,
			},
			{
				icon: 'table-row-after',
				title: __( 'Add Row After' ),
				isDisabled: ! selectedCell,
				onClick: this.onInsertRowAfter,
			},
			{
				icon: 'table-row-delete',
				title: __( 'Delete Row' ),
				isDisabled: ! selectedCell,
				onClick: this.onDeleteRow,
			},
			{
				icon: 'table-col-before',
				title: __( 'Add Column Before' ),
				isDisabled: ! selectedCell,
				onClick: this.onInsertColumnBefore,
			},
			{
				icon: 'table-col-after',
				title: __( 'Add Column After' ),
				isDisabled: ! selectedCell,
				onClick: this.onInsertColumnAfter,
			},
			{
				icon: 'table-col-delete',
				title: __( 'Delete Column' ),
				isDisabled: ! selectedCell,
				onClick: this.onDeleteColumn,
			},
		];
	}

	/**
	 * Renders a table section.
	 *
	 * @param {string} options.type Section type: head, body, or foot.
	 * @param {Array}  options.rows The rows to render.
	 *
	 * @return {Object} React element for the section.
	 */
	renderSection( { type, rows } ) {
		if ( ! rows.length ) {
			return null;
		}

		const Tag = `t${ type }`;
		const { selectedCell } = this.state;

		return (
			<Tag>
				{ rows.map( ( { cells }, rowIndex ) => (
					<tr key={ rowIndex }>
						{ cells.map( ( { content, tag: CellTag }, columnIndex ) => {
							const isSelected = selectedCell && (
								type === selectedCell.section &&
								rowIndex === selectedCell.rowIndex &&
								columnIndex === selectedCell.columnIndex
							);

							const cell = {
								section: type,
								rowIndex,
								columnIndex,
							};

							const cellClasses = classnames( { 'is-selected': isSelected } );

							return (
								<CellTag
									key={ columnIndex }
									className={ cellClasses }
								>
									<RichText
										className="wp-block-table__cell-content"
										value={ content }
										onChange={ this.onChange }
										unstableOnFocus={ this.createOnFocus( cell ) }
									/>
								</CellTag>
							);
						} ) }
					</tr>
				) ) }
			</Tag>
		);
	}

	componentDidUpdate() {
		const { isSelected } = this.props;
		const { selectedCell } = this.state;

		if ( ! isSelected && selectedCell ) {
			this.setState( { selectedCell: null } );
		}
	}

	render() {
		const {
			attributes,
			className,
			backgroundColor,
			setBackgroundColor,
			setAttributes,
			isSelected,
		} = this.props;
		const { initialRowCount, initialColumnCount, selectedCell, isCaptionSelected } = this.state;
		const { hasFixedLayout, caption, captionPosition, head, body, foot } = attributes;
		const isEmpty = ! head.length && ! body.length && ! foot.length;
		const Section = this.renderSection;

		if ( isEmpty ) {
			return (
				<Placeholder
					label={ __( 'Table' ) }
					icon={ <BlockIcon icon={ icon } showColors /> }
					instructions={ __( 'Insert a table for sharing data.' ) }
					isColumnLayout
				>
					<form className="wp-block-table__placeholder-form" onSubmit={ this.onCreateTable }>
						<TextControl
							type="number"
							label={ __( 'Column Count' ) }
							value={ initialColumnCount }
							onChange={ this.onChangeInitialColumnCount }
							min="1"
							className="wp-block-table__placeholder-input"
						/>
						<TextControl
							type="number"
							label={ __( 'Row Count' ) }
							value={ initialRowCount }
							onChange={ this.onChangeInitialRowCount }
							min="1"
							className="wp-block-table__placeholder-input"
						/>
						<Button className="wp-block-table__placeholder-button" isDefault type="submit">{ __( 'Create Table' ) }</Button>
					</form>
				</Placeholder>
			);
		}

		const classes = classnames( className, backgroundColor.class, {
			'has-fixed-layout': hasFixedLayout,
			'has-background': !! backgroundColor.color,
		} );

		const isCaptionTop = captionPosition === 'top';
		const isCaptionBottom = captionPosition === 'bottom';

		const captionRichTextElement = (
			<RichText
				className={ classnames( 'wp-block-table__caption-content', {
					'is-visible': isSelected || ! RichText.isEmpty( caption ),
					'is-position-top': isCaptionTop,
					'is-position-bottom': isCaptionBottom,
				} ) }
				tagName="p"
				placeholder={ __( 'Write caption…' ) }
				value={ caption }
				onChange={ ( value ) => setAttributes( { caption: value } ) }
				// Deselect the selected table cell when the caption is focused.
				unstableOnFocus={ () => this.setState( {
					selectedCell: null,
					isCaptionSelected: true,
				} ) }
				// Only show inlineToolbar when caption is at the bottom,
				// otherwise it's overlaped by the main block toolbar.
				inlineToolbar={ isCaptionBottom }
			/>
		);

		return (
			<>
				<BlockControls>
					<Toolbar>
						{ !! selectedCell && (
							<DropdownMenu
								icon="editor-table"
								label={ __( 'Edit table' ) }
								controls={ this.getTableControls() }
							/>
						) }
						{ isCaptionSelected && (
							<IconButton
								className={ classnames( 'components-icon-button components-toolbar__control' ) }
								label={ isCaptionBottom ? __( 'Position caption above table' ) : __( 'Position caption below table' ) }
								aria-pressed={ this.state.isEditing }
								onClick={ () => setAttributes( { captionPosition: isCaptionBottom ? 'top' : 'bottom' } ) }
								icon={ isCaptionBottom ? captionTopIcon : captionBottomIcon }
							/>
						) }
					</Toolbar>
				</BlockControls>
				<InspectorControls>
					<PanelBody title={ __( 'Table Settings' ) } className="blocks-table-settings">
						<ToggleControl
							label={ __( 'Fixed width table cells' ) }
							checked={ !! hasFixedLayout }
							onChange={ this.onChangeFixedLayout }
						/>
						<ToggleControl
							label={ __( 'Header section' ) }
							checked={ !! ( head && head.length ) }
							onChange={ this.onToggleHeaderSection }
						/>
						<ToggleControl
							label={ __( 'Footer section' ) }
							checked={ !! ( foot && foot.length ) }
							onChange={ this.onToggleFooterSection }
						/>
					</PanelBody>
					<PanelColorSettings
						title={ __( 'Color Settings' ) }
						initialOpen={ false }
						colorSettings={ [
							{
								value: backgroundColor.color,
								onChange: setBackgroundColor,
								label: __( 'Background Color' ),
								disableCustomColors: true,
								colors: BACKGROUND_COLORS,
							},
						] }
					/>
				</InspectorControls>
				{ captionPosition === 'top' && captionRichTextElement }
				<table className={ classes }>
					{ /* Using a RichText within a caption element doesn't work with assistive
					technologies. This caption element is specified as visibly hidden so that it
					can be read by a screenreader, but be edited using a RichText outside the table.
					Specifying a key on the element forces react to replace the caption element,
					which ensures the up-to-date caption is read by voiceover in chrome. */ }
					<caption className="screen-reader-text" key={ caption }>{ caption }</caption>
					<Section type="head" rows={ head } />
					<Section type="body" rows={ body } />
					<Section type="foot" rows={ foot } />
				</table>
				{ captionPosition === 'bottom' && captionRichTextElement }
			</>
		);
	}
}

export default withCustomBackgroundColors( 'backgroundColor' )( TableEdit );
