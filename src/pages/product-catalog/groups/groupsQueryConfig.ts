import {
	FilterField,
	FilterFieldType,
	DEFAULT_OPERATORS_PER_DATA_TYPE,
	DataType,
	SortOption,
	SortDirection,
	FilterCondition,
	FilterOperator,
} from '@/types/common/QueryBuilder';
import { GROUP_ENTITY_TYPE, getGroupEntityTypeLabel } from '@/models/Group';

export const groupsSortOptions: SortOption[] = [
	{ field: 'name', label: 'Name', direction: SortDirection.ASC },
	{ field: 'created_at', label: 'Created At', direction: SortDirection.DESC },
	{ field: 'updated_at', label: 'Updated At', direction: SortDirection.DESC },
];

export const groupsFilterOptions: FilterField[] = [
	{
		field: 'name',
		label: 'Name',
		fieldType: FilterFieldType.INPUT,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.STRING],
		dataType: DataType.STRING,
	},
	{
		field: 'lookup_key',
		label: 'Lookup Key',
		fieldType: FilterFieldType.INPUT,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.STRING],
		dataType: DataType.STRING,
	},
	{
		field: 'created_at',
		label: 'Created At',
		fieldType: FilterFieldType.DATEPICKER,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.DATE],
		dataType: DataType.DATE,
	},
	{
		field: 'entity_type',
		label: 'Entity Type',
		fieldType: FilterFieldType.SELECT,
		operators: [FilterOperator.EQUAL],
		dataType: DataType.STRING,
		options: Object.values(GROUP_ENTITY_TYPE).map((value) => ({
			value,
			label: getGroupEntityTypeLabel(value),
		})),
	},
	// TODO: add status
];

/** No filters open by default; user adds filters as needed. */
export const groupsInitialFilters: FilterCondition[] = [];

export const groupsInitialSorts: SortOption[] = [{ field: 'updated_at', label: 'Updated At', direction: SortDirection.DESC }];
