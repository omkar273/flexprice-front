import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Loader } from '@/components/atoms';
import Card, { CardHeader } from '@/components/atoms/Card/Card';
import { GroupApi } from '@/api/GroupApi';
import { getGroupEntityTypeLabel } from '@/models/Group';

const GroupInformationTab = () => {
	const { id: groupId } = useParams();

	const { data: group, isLoading } = useQuery({
		queryKey: ['fetchGroupDetails', groupId],
		queryFn: () => GroupApi.getGroupById(groupId!),
		enabled: !!groupId,
	});

	if (isLoading) {
		return <Loader />;
	}

	if (!group) {
		return (
			<div className='flex items-center justify-center h-64'>
				<p className='text-muted-foreground'>Group not found.</p>
			</div>
		);
	}

	return (
		<div className='space-y-6'>
			<Card variant='notched'>
				<CardHeader title='Group Details' />
				<div className='grid grid-cols-2 gap-x-12 gap-y-4 text-sm'>
					<div>
						<div className='font-medium text-gray-900'>Name</div>
						<div className='text-gray-600 mt-0.5'>{group.name || '--'}</div>
					</div>
					<div>
						<div className='font-medium text-gray-900'>Entity Type</div>
						<div className='text-gray-600 mt-0.5'>{getGroupEntityTypeLabel(group.entity_type ?? '') || '--'}</div>
					</div>
					<div>
						<div className='font-medium text-gray-900'>External ID</div>
						<div className='text-gray-600 mt-0.5'>{group.lookup_key || '--'}</div>
					</div>
				</div>
			</Card>
		</div>
	);
};

export default GroupInformationTab;
