import { BaseModel, Metadata } from './base';

export enum GROUP_ENTITY_TYPE {
	PRICE = 'price',
	FEATURE = 'feature',
}

/** Display labels for group entity types. Extend when more types are supported. */
export const GROUP_ENTITY_TYPE_LABEL: Record<string, string> = {
	[GROUP_ENTITY_TYPE.PRICE]: 'Price',
	[GROUP_ENTITY_TYPE.FEATURE]: 'Feature',
	// Future: PLAN: 'Plan', ADDON: 'Addon', etc.
};

export function getGroupEntityTypeLabel(entityType: string): string {
	return GROUP_ENTITY_TYPE_LABEL[entityType] ?? entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();
}

export interface Group extends BaseModel {
	readonly name: string;
	readonly lookup_key: string;
	readonly entity_type: GROUP_ENTITY_TYPE;
	readonly entity_ids: string[];
	readonly metadata: Metadata | null;
}
