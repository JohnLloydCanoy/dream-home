'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import FormField from '@/components/ui/FormField';
import Button from '@components/ui/Button';
import StatusUpdateModal from '@/components/ui/StatusUpdateModal';
import SortControls from '@/components/ui/Sorting';
import PaginationControls from '@/components/ui/pagination';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { applySort, createSortHandler } from '@/components/functions/SortingFunc';
import { paginateData, getPageCount } from '@/components/functions/paginationfunc';
import { useAuth } from '@/hooks/useAuth';

const normalizeList = (data) => data?.results || data?.items || data || [];

const toId = (value, idField) => {
	if (!value) return '';
	if (typeof value === 'object') return value[idField] || '';
	return value;
};

const getOwnerLabel = (owner) => {
	if (!owner) return 'Unassigned';
	if (typeof owner === 'object') {
		const fullName = `${owner.first_name || ''} ${owner.last_name || ''}`.trim();
		return fullName || owner.client_no || 'Unassigned';
	}
	return owner;
};

const getBranchLabel = (branch) => {
	if (!branch) return 'Unassigned';
	if (typeof branch === 'object') {
		const branchNo = branch.branch_no || '';
		const area = branch.area || '';
		if (branchNo && area) return `${branchNo} - ${area}`;
		return branchNo || area || 'Unassigned';
	}
	return branch;
};

const getAddressLabel = (property) => {
	const lines = [property?.street, property?.area, property?.city, property?.postcode].filter(Boolean);
	return lines.join(', ') || 'N/A';
};

const formatCurrency = (value) => {
	if (value === null || value === undefined || value === '') return 'N/A';

	const amount = Number(value);
	if (Number.isNaN(amount)) return value;

	return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const statusStyles = {
	Available: 'bg-green-100 text-green-800',
	Reserved: 'bg-amber-100 text-amber-800',
	Rented: 'bg-blue-100 text-blue-800',
	Maintenance: 'bg-red-100 text-red-800'
};

export default function RentalStatusPage() {
	const [properties, setProperties] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const [selectedProperty, setSelectedProperty] = useState(null);
	const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

	const { formData, handleChange, reset } = useForm({ status_filter: 'all' }, {});
	const { role } = useAuth();
	const canUpdateStatus = ['ADMIN', 'Manager', 'Supervisor'].includes(role);

	// ── Sorting ───────────────────────────────────────────────────────────────
	const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
	const handleSort = createSortHandler(setSortConfig);

	// ── Pagination ────────────────────────────────────────────────────────────
	const PAGE_SIZE = 5;
	const [currentPage, setCurrentPage] = useState(1);

	const loadProperties = async () => {
		setIsLoading(true);
		setLoadError('');

		try {
			const data = await apiClient('/properties/');
			setProperties(normalizeList(data));
		} catch (error) {
			console.error('Failed to load rental status records:', error);
			setLoadError('Unable to load property rental statuses right now.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadProperties();
	}, []);

	const filteredProperties = useMemo(() => {
		const selectedFilter = String(formData.status_filter || 'all').toLowerCase();
		if (selectedFilter === 'all') return properties;
		return properties.filter((property) => String(property.status || '').toLowerCase() === selectedFilter);
	}, [properties, formData.status_filter]);

	// Apply sort then paginate
	const sortedProperties = useMemo(
		() => applySort(filteredProperties, sortConfig, 'property_no', 'date_withdrawn'),
		[filteredProperties, sortConfig]
	);
	const pageCount = getPageCount(sortedProperties.length, PAGE_SIZE);
	const pagedProperties = paginateData(sortedProperties, currentPage, PAGE_SIZE);

	// Reset page on filter or sort change
	useMemo(() => setCurrentPage(1), [formData.status_filter, sortConfig]);

	const summary = useMemo(() => {
		const available = properties.filter((property) => String(property.status || '') === 'Available').length;
		const reserved = properties.filter((property) => String(property.status || '') === 'Reserved').length;
		const rented = properties.filter((property) => String(property.status || '') === 'Rented').length;

		return {
			total: properties.length,
			available,
			reserved,
			rented
		};
	}, [properties]);

	const openStatusModal = (property = selectedProperty) => {
		if (!property) return;
		setSelectedProperty(property);
		setIsStatusModalOpen(true);
	};

	const closeStatusModal = () => {
		setIsStatusModalOpen(false);
	};

	const tableColumns = [
		{
			key: 'property_no',
			label: 'Property ID',
			render: (value) => (
				<span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">
					{value}
				</span>
			)
		},
		{
			key: 'address',
			label: 'Address',
			render: (_, row) => (
				<span className="text-gray-900 font-medium">{getAddressLabel(row)}</span>
			)
		},
		{
			key: 'owner',
			label: 'Owner',
			render: (value) => getOwnerLabel(value)
		},
		{
			key: 'branch',
			label: 'Branch',
			render: (value) => getBranchLabel(value)
		},
		{
			key: 'monthly_rent',
			label: 'Monthly Rent',
			render: (value) => formatCurrency(value)
		},
		{
			key: 'status',
			label: 'Status',
			render: (value) => (
				<span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusStyles[value] || 'bg-gray-100 text-gray-700'}`}>
					{value || 'N/A'}
				</span>
			)
		}
	];

	const renderActions = (row) => (
		<Button
			variant="secondary"
			size="sm"
			onClick={(event) => {
				event.stopPropagation();
				openStatusModal(row);
			}}
		>
			Update Status
		</Button>
	);

	return (
		<div className="w-full max-w-7xl mx-auto space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Rental Status Tracking</h1>
					<p className="text-sm text-gray-500 mt-1">
						Track and update property availability with secure status-only updates.
					</p>
				</div>

				<div className="flex gap-2">
					<Button variant="secondary" onClick={loadProperties}>
						Refresh
					</Button>
					{canUpdateStatus && (
						<Button variant="primary" onClick={() => openStatusModal()} disabled={!selectedProperty}>
							Update Status
						</Button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total Properties</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Available</p>
					<p className="text-2xl font-bold text-green-700 mt-1">{summary.available}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Reserved</p>
					<p className="text-2xl font-bold text-amber-700 mt-1">{summary.reserved}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Rented</p>
					<p className="text-2xl font-bold text-blue-700 mt-1">{summary.rented}</p>
				</div>
			</div>

			<div className="bg-white border border-gray-200 rounded-xl p-4">
				<div className="w-full sm:w-80">
					<FormField
						label="Status Filter"
						field="status_filter"
						type="select"
						value={formData.status_filter}
						onChange={handleChange}
						required={false}
					>
						<option value="all">All</option>
						<option value="available">Available</option>
						<option value="reserved">Reserved</option>
						<option value="rented">Rented</option>
					</FormField>
				</div>

				<div className="mt-2 flex justify-end">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => reset({ status_filter: 'all' })}
						disabled={formData.status_filter === 'all'}
					>
						Reset Filter
					</Button>
				</div>
			</div>

			{selectedProperty && (
				<div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-sm">
					Selected Property: <strong>{selectedProperty.property_no}</strong> ({getAddressLabel(selectedProperty)})
				</div>
			)}

			{loadError && (
				<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
					{loadError}
				</div>
			)}

			<DataTable
				columns={tableColumns}
				data={pagedProperties}
				keyField="property_no"
				isLoading={isLoading}
				emptyMessage="No properties found for the selected status filter."
				onRowClick={setSelectedProperty}
				actions={canUpdateStatus ? renderActions : undefined}
			/>

			{/* ── Sort + Pagination (side by side) ── */}
			<div className="flex items-center justify-between gap-4">
				<SortControls
					sortConfig={sortConfig}
					onSort={handleSort}
					nameLabel="Property ID"
					dateLabel="Date Withdrawn"
				/>
				<PaginationControls
					currentPage={currentPage}
					pageCount={pageCount}
					pageSize={PAGE_SIZE}
					totalItems={sortedProperties.length}
					onPageChange={setCurrentPage}
				/>
			</div>

			<StatusUpdateModal
				isOpen={isStatusModalOpen}
				onClose={closeStatusModal}
				onSuccess={loadProperties}
				propertyToUpdate={selectedProperty}
			/>
		</div>
	);
}
