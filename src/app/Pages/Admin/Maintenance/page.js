'use client';

import React, { useEffect, useMemo, useState } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout';
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { inspectionValidators } from '@/lib/validator';

const normalizeList = (data) => data?.results || data?.items || data || [];
const getInspectionId = (inspection) => inspection?.id || inspection?.pk || inspection?.inspection_id || null;

const toId = (value, idField) => {
	if (!value) return '';
	if (typeof value === 'object') return value[idField] || '';
	return value;
};

const getPersonName = (person) => `${person?.first_name || ''} ${person?.last_name || ''}`.trim();

const getStaffDisplay = (value, lookupMap) => {
	if (!value) return { name: 'Unassigned', id: '' };
	if (typeof value === 'object') {
		return { name: getPersonName(value) || 'Unknown Staff', id: value.staff_no || value.id || '' };
	}

	const match = lookupMap?.get(value);
	if (match) {
		return { name: getPersonName(match) || 'Unknown Staff', id: match.staff_no || String(value) };
	}

	return { name: 'Unknown Staff', id: String(value) };
};

const getPropertyDisplay = (value, lookupMap) => {
	if (!value) return { name: 'N/A', id: '' };
	if (typeof value === 'object') {
		const id = value.property_no || value.id || '';
		const address = [value.street, value.area, value.city].filter(Boolean).join(', ');
		return { name: address || 'Property', id };
	}

	const match = lookupMap?.get(value);
	if (match) {
		const address = [match.street, match.area, match.city].filter(Boolean).join(', ');
		return { name: address || 'Property', id: match.property_no || String(value) };
	}

	return { name: 'Property', id: String(value) };
};

const renderNameWithId = (name, id) => {
	const isMuted = name === 'N/A' || name === 'Unassigned';
	return (
		<div className="flex flex-col gap-1">
			<span className={isMuted ? 'text-gray-400 italic' : 'text-gray-900 font-medium'}>
				{name}
			</span>
			{id ? <span className="text-xs text-gray-400">{id}</span> : null}
		</div>
	);
};

const getInspectionDate = (row) => row.inspection_date || 'N/A';

const inspectionStatusOptions = [
	{ value: 'Scheduled', label: 'Scheduled' },
	{ value: 'Completed', label: 'Completed' },
	{ value: 'Cancelled', label: 'Cancelled' }
];

const getStatusBadge = (status) => {
	const colors = {
		Scheduled: 'bg-amber-100 text-amber-800',
		Completed: 'bg-green-100 text-green-800',
		Cancelled: 'bg-gray-100 text-gray-700'
	};

	return (
		<span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
			{status || 'N/A'}
		</span>
	);
};

function InspectionModal({ isOpen, onClose, onSuccess, itemToEdit, properties, staffList }) {
	const { formData, errors, handleChange, validate, reset } = useForm({
		property_no: toId(itemToEdit?.property_no || itemToEdit?.property, 'property_no'),
		staff_no: toId(itemToEdit?.staff_no || itemToEdit?.staff, 'staff_no'),
		inspection_date: itemToEdit?.inspection_date || '',
		status: itemToEdit?.status || 'Scheduled',
		comments: itemToEdit?.comments || ''
	}, inspectionValidators);

	useEffect(() => {
		if (isOpen) reset();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [itemToEdit?.id, isOpen]);

	const formatPayload = (data) => {
		const payload = { ...data };
		payload.property_no = payload.property_no || null;
		payload.staff_no = payload.staff_no || null;
		payload.inspection_date = payload.inspection_date || null;
		payload.status = payload.status || 'Scheduled';
		payload.comments = payload.comments?.trim() || null;
		return payload;
	};

	return (
		<CrudFormModal
			isOpen={isOpen}
			onClose={onClose}
			onSuccess={onSuccess}
			title={itemToEdit ? `Edit Inspection ${getInspectionId(itemToEdit) || ''}` : 'Record Property Inspection'}
			baseEndpoint="/properties/inspections"
			itemId={getInspectionId(itemToEdit)}
			formData={formData}
			validate={validate}
			transformPayload={formatPayload}
			submitLabel="Save Inspection"
			updateLabel="Update Inspection"
		>
			<section>
				<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Inspection Details</h3>
				<div className="grid grid-cols-2 gap-4">
					<FormField label="Property" field="property_no" type="select" value={formData.property_no} onChange={handleChange} error={errors.property_no}>
						<option value="">-- Select Property --</option>
						{properties.map((property) => (
							<option key={property.property_no} value={property.property_no}>
								{property.property_no} - {property.street}, {property.city}
							</option>
						))}
					</FormField>
					<FormField label="Inspector" field="staff_no" type="select" value={formData.staff_no} onChange={handleChange} error={errors.staff_no}>
						<option value="">-- Select Staff --</option>
						{staffList.map((staff) => (
							<option key={staff.staff_no} value={staff.staff_no}>
								{staff.first_name} {staff.last_name} ({staff.staff_no})
							</option>
						))}
					</FormField>
					<FormField label="Inspection Date" field="inspection_date" type="date" value={formData.inspection_date} onChange={handleChange} error={errors.inspection_date} />
					<FormField label="Status" field="status" type="select" value={formData.status} onChange={handleChange} error={errors.status}>
						{inspectionStatusOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</FormField>
					<FormField label="Comments" field="comments" type="textarea" value={formData.comments} onChange={handleChange} required={false} className="col-span-2" />
				</div>
			</section>
		</CrudFormModal>
	);
}

export default function MaintenancePage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [properties, setProperties] = useState([]);
	const [staffList, setStaffList] = useState([]);

	useEffect(() => {
		let isActive = true;

		Promise.all([
			apiClient('/properties/').catch(err => {
				console.error('Failed to load properties:', err);
				return [];
			}),
			apiClient('/users/staff/').catch(err => {
				console.error('Failed to load staff list:', err);
				return [];
			})
		])
			.then(([propertiesData, staffData]) => {
				if (!isActive) return;
				setProperties(normalizeList(propertiesData));
				setStaffList(normalizeList(staffData));
			})
			.catch((error) => console.error('Failed to load inspection references:', error));

		return () => {
			isActive = false;
		};
	}, []);

	const propertiesById = useMemo(
		() => new Map(properties.map((property) => [property.property_no, property])),
		[properties]
	);
	const staffById = useMemo(
		() => new Map(staffList.map((staff) => [staff.staff_no, staff])),
		[staffList]
	);

	const tableColumns = [
		{
			key: 'inspection_id',
			label: 'Inspection ID',
			render: (_, row) => (
				<span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">
					{getInspectionId(row) || 'N/A'}
				</span>
			)
		},
		{
			key: 'property_no',
			label: 'Property',
			render: (_, row) => {
				const display = getPropertyDisplay(row.property_no || row.property, propertiesById);
				return renderNameWithId(display.name, display.id);
			},
			exportValue: (row) => {
				const display = getPropertyDisplay(row.property_no || row.property, propertiesById);
				return [display.name, display.id].filter(Boolean).join('\n');
			},
			searchValue: (row) => {
				const display = getPropertyDisplay(row.property_no || row.property, propertiesById);
				return `${display.name} ${display.id}`.trim();
			}
		},
		{
			key: 'staff_no',
			label: 'Inspector',
			render: (_, row) => {
				const display = getStaffDisplay(row.staff_no || row.staff, staffById);
				return renderNameWithId(display.name, display.id);
			},
			exportValue: (row) => {
				const display = getStaffDisplay(row.staff_no || row.staff, staffById);
				return [display.name, display.id].filter(Boolean).join('\n');
			},
			searchValue: (row) => {
				const display = getStaffDisplay(row.staff_no || row.staff, staffById);
				return `${display.name} ${display.id}`.trim();
			}
		},
		{
			key: 'inspection_date',
			label: 'Inspection Date',
			render: (_, row) => <span className="text-gray-700">{getInspectionDate(row)}</span>,
			exportValue: (row) => getInspectionDate(row),
			searchValue: (row) => getInspectionDate(row)
		},
		{
			key: 'status',
			label: 'Status',
			render: (value) => getStatusBadge(value),
			exportValue: (row) => row.status || 'N/A',
			searchValue: (row) => row.status || ''
		},
		{
			key: 'comments',
			label: 'Comments',
			render: (value) => {
				const text = value || '';
				if (!text) return 'No notes';
				return text.length > 80 ? `${text.slice(0, 80)}...` : text;
			}
		}
	];

	return (
		<CrudPageLayout
			title="Property Maintenance"
			subtitle="Track property inspections and maintenance notes."
			addButtonLabel="+ Record Inspection"
			endpoint="/properties/inspections/"
			keyField="id"
			columns={tableColumns}
			searchQuery={searchQuery}
			searchKeys={['id', 'property_no', 'staff_no', 'inspection_date', 'status', 'comments']}
			getDeleteModalItemName={(inspection) => `Inspection #${getInspectionId(inspection) || 'N/A'}`}
		dateKey="inspection_date"
		sortDateLabel="Inspection Date"
		pageSize={5}
			renderHeaderMiddle={() => (
				<SearchBar
					value={searchQuery}
					onChange={setSearchQuery}
					placeholder="Search inspections..."
					className="w-full sm:max-w-sm"
					size="md"
				/>
			)}
			renderHeaderActions={(dataList) => (
				<ExportPDF
					title="Property Maintenance"
					subtitle="Property inspections and maintenance notes."
					fileName="property-inspections"
					columns={tableColumns}
					data={dataList}
					buttonLabel="Export PDF"
					buttonVariant="secondary"
					buttonSize="md"
				/>
			)}
			renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => (
				<InspectionModal
					isOpen={isOpen}
					onClose={onClose}
					onSuccess={onSuccess}
					itemToEdit={itemToEdit}
					properties={properties}
					staffList={staffList}
				/>
			)}
		/>
	);
}
