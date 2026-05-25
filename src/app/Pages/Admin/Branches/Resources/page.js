'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import Button from '@components/ui/Button';
import Dialog from '@components/ui/Dialog';
import ResourceAllocationFormModal from '@/components/ui/ResourceAllocationFormModal';

import apiClient from '@/lib/apiClient';
import { useUpdate } from '@/hooks/useCrud';

const normalizeList = (data) => data?.results || data?.items || data || [];

const toId = (value, idField) => {
	if (!value) return '';
	if (typeof value === 'object') return value[idField] || '';
	return value;
};

const getStaffName = (staff) => {
	if (!staff) return 'Unknown Staff';
	const name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
	return name || staff.staff_no;
};

const getBranchLabel = (branch) => {
	if (!branch) return 'Unassigned';
	if (typeof branch === 'object') {
		if (branch.branch_no && branch.area) return `${branch.branch_no} - ${branch.area}`;
		return branch.branch_no || branch.area || 'Unassigned';
	}
	return branch;
};

const getSupervisorLabel = (supervisor) => {
	if (!supervisor) return 'None';
	if (typeof supervisor === 'object') {
		return `${getStaffName(supervisor)} (${supervisor.staff_no})`;
	}
	return supervisor;
};

const positionBadgeStyles = {
	Staff: 'bg-gray-100 text-gray-700',
	Supervisor: 'bg-blue-100 text-blue-800',
	Secretary: 'bg-amber-100 text-amber-800',
	Manager: 'bg-green-100 text-green-800'
};

export default function ResourceAllocationPage() {
	const [allocations, setAllocations] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [allocationToEdit, setAllocationToEdit] = useState(null);

	const [isDeallocateOpen, setIsDeallocateOpen] = useState(false);
	const [allocationToDeallocate, setAllocationToDeallocate] = useState(null);

	const {
		updateRecord,
		isLoading: isDeallocating,
		error: deallocateError,
		setError: setDeallocateError
	} = useUpdate('/users/staff');

	const loadAllocations = async () => {
		setIsLoading(true);
		setLoadError('');

		try {
			const data = await apiClient('/users/staff/');
			setAllocations(normalizeList(data));
		} catch (error) {
			console.error('Failed to load resource allocations:', error);
			setLoadError('Unable to load resource allocation records right now.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadAllocations();
	}, []);

	const allocationSummary = useMemo(() => {
		const assigned = allocations.filter((staff) => Boolean(toId(staff.branch, 'branch_no'))).length;
		const unassigned = allocations.length - assigned;

		return {
			total: allocations.length,
			assigned,
			unassigned,
			managers: allocations.filter((staff) => staff.position === 'Manager').length
		};
	}, [allocations]);

	const hasUnassignedStaff = allocationSummary.unassigned > 0;

	const handleAddClick = () => {
		setAllocationToEdit(null);
		setIsFormOpen(true);
	};

	const handleEditClick = (row) => {
		setAllocationToEdit(row);
		setIsFormOpen(true);
	};

	const handleOpenDeallocate = (row) => {
		setAllocationToDeallocate(row);
		setDeallocateError(null);
		setIsDeallocateOpen(true);
	};

	const closeDeallocateDialog = () => {
		setIsDeallocateOpen(false);
		setAllocationToDeallocate(null);
		setDeallocateError(null);
	};

	const handleConfirmDeallocate = async () => {
		if (!allocationToDeallocate?.staff_no) return;

		const payload = {
			branch: null,
			supervisor: null,
			position: 'Staff',
			typing_speed: null,
			manager_start_date: null,
			bonus_payment: null,
			car_allowance: null
		};

		const result = await updateRecord(allocationToDeallocate.staff_no, payload, 'PATCH');

		if (result.success) {
			closeDeallocateDialog();
			loadAllocations();
		}
	};

	const tableColumns = [
		{
			key: 'staff_no',
			label: 'Staff ID',
			render: (value) => (
				<span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded text-xs">
					{value}
				</span>
			)
		},
		{
			key: 'staff_member',
			label: 'Staff Member',
			render: (_, row) => (
				<div>
					<p className="font-semibold text-gray-900">{getStaffName(row)}</p>
					<p className="text-xs text-gray-500">{row.email || 'No email on file'}</p>
				</div>
			)
		},
		{
			key: 'branch',
			label: 'Branch',
			render: (value) => (
				<span className={value ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
					{getBranchLabel(value)}
				</span>
			)
		},
		{
			key: 'position',
			label: 'Responsibility',
			render: (value) => (
				<span className={`px-2.5 py-1 rounded-full text-xs font-bold ${positionBadgeStyles[value] || positionBadgeStyles.Staff}`}>
					{value || 'Staff'}
				</span>
			)
		},
		{
			key: 'supervisor',
			label: 'Supervisor',
			render: (value) => (
				<span className={value ? 'text-gray-900 text-sm' : 'text-gray-400 italic text-sm'}>
					{getSupervisorLabel(value)}
				</span>
			)
		},
		{
			key: 'allocation_status',
			label: 'Allocation',
			render: (_, row) => {
				const isAssigned = Boolean(toId(row.branch, 'branch_no'));
				return (
					<span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isAssigned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
						{isAssigned ? 'Assigned' : 'Unassigned'}
					</span>
				);
			}
		}
	];

	const renderActions = (row) => {
		const isAssigned = Boolean(toId(row.branch, 'branch_no'));

		return (
			<div className="flex justify-end gap-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={(event) => {
						event.stopPropagation();
						handleEditClick(row);
					}}
				>
					Edit
				</Button>
				<Button
					variant="danger"
					size="sm"
					disabled={!isAssigned}
					onClick={(event) => {
						event.stopPropagation();
						handleOpenDeallocate(row);
					}}
				>
					Deallocate
				</Button>
			</div>
		);
	};

	return (
		<div className="w-full max-w-7xl mx-auto space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Resource Allocation</h1>
					<p className="text-sm text-gray-500 mt-1">
						Assign staff to branches and responsibilities with controlled role-specific fields.
					</p>
				</div>

				<Button
					variant="primary"
					onClick={handleAddClick}
					disabled={!hasUnassignedStaff}
					title={!hasUnassignedStaff ? 'All staff are already assigned. Use Edit to reallocate.' : ''}
				>
					+ Assign Staff
				</Button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total Staff</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{allocationSummary.total}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Assigned</p>
					<p className="text-2xl font-bold text-green-700 mt-1">{allocationSummary.assigned}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Unassigned</p>
					<p className="text-2xl font-bold text-amber-700 mt-1">{allocationSummary.unassigned}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Managers</p>
					<p className="text-2xl font-bold text-blue-700 mt-1">{allocationSummary.managers}</p>
				</div>
			</div>

			{loadError && (
				<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
					{loadError}
				</div>
			)}

			<DataTable
				columns={tableColumns}
				data={allocations}
				keyField="staff_no"
				isLoading={isLoading}
				emptyMessage="No staff records found for allocation."
				onRowClick={handleEditClick}
				actions={renderActions}
			/>

			<ResourceAllocationFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				onSuccess={loadAllocations}
				allocationToEdit={allocationToEdit}
			/>

			<Dialog
				isOpen={isDeallocateOpen}
				onClose={closeDeallocateDialog}
				title="Confirm Deallocation"
			>
				<div className="space-y-4">
					<p className="text-sm text-gray-700">
						Remove <strong>{getStaffName(allocationToDeallocate)}</strong> from branch allocation?
						This keeps the staff profile but clears branch, supervisor, and responsibility-specific fields.
					</p>

					{deallocateError && (
						<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
							{deallocateError}
						</div>
					)}

					<div className="flex justify-end gap-3 pt-2">
						<Button variant="ghost" onClick={closeDeallocateDialog} disabled={isDeallocating}>
							Cancel
						</Button>
						<Button variant="danger" onClick={handleConfirmDeallocate} isLoading={isDeallocating}>
							Confirm Deallocate
						</Button>
					</div>
				</div>
			</Dialog>
		</div>
	);
}
