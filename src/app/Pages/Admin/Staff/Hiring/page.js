"use client";

import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import FormField from '@/components/ui/FormField';
import Button from '@components/ui/Button';
import Dialog from '@components/ui/Dialog';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { useAuth } from '@/hooks/useAuth';
import { REGEX } from '@/components/functions/RegEx';

const STORAGE_KEY = 'dreamhome_hiring_portal_v1';

const progressStages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];
const stageOptions = [
	{ value: 'Applied', label: 'Applied' },
	{ value: 'Screening', label: 'Screening' },
	{ value: 'Interview', label: 'Interview' },
	{ value: 'Offer', label: 'Offer' },
	{ value: 'Hired', label: 'Hired' },
	{ value: 'Rejected', label: 'Rejected' }
];

const adminRoleOptions = [
	{ value: 'Manager', label: 'Manager' },
	{ value: 'Supervisor', label: 'Supervisor' },
	{ value: 'Staff', label: 'Standard Staff' },
	{ value: 'Secretary', label: 'Secretary' }
];

const managerRoleOptions = [
	{ value: 'Supervisor', label: 'Supervisor' },
	{ value: 'Staff', label: 'Standard Staff' },
	{ value: 'Secretary', label: 'Secretary' }
];

const stageBadgeStyles = {
	Applied: 'bg-blue-50 text-blue-700',
	Screening: 'bg-indigo-50 text-indigo-700',
	Interview: 'bg-amber-50 text-amber-700',
	Offer: 'bg-purple-50 text-purple-700',
	Hired: 'bg-green-50 text-green-700',
	Rejected: 'bg-rose-50 text-rose-700'
};

const roleBadgeStyles = {
	Manager: 'bg-emerald-50 text-emerald-700',
	Supervisor: 'bg-blue-50 text-blue-700',
	Staff: 'bg-gray-100 text-gray-700',
	Secretary: 'bg-amber-50 text-amber-700'
};

const applicationValidators = {
	first_name: {
		required: true,
		maxLength: 100,
		label: 'First Name',
		pattern: REGEX.NAME,
		patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
	},
	last_name: {
		required: true,
		maxLength: 100,
		label: 'Last Name',
		pattern: REGEX.NAME,
		patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
	},
	email: {
		required: true,
		maxLength: 255,
		label: 'Email',
		pattern: REGEX.EMAIL,
		patternMessage: 'Enter a valid email address'
	},
	telephone_no: {
		required: true,
		maxLength: 50,
		label: 'Telephone Number',
		pattern: REGEX.PH_PHONE_FAX,
		patternMessage: 'Enter a valid phone number'
	},
	branch: {
		required: true,
		label: 'Branch'
	},
	position: {
		required: true,
		label: 'Role'
	}
};

const normalizeList = (data) => data?.results || data?.items || data || [];

const formatDate = (value) => {
	if (!value) return 'N/A';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString();
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

const getManagerLabel = (manager) => {
	if (!manager) return 'Unassigned';
	if (typeof manager === 'object') {
		const name = `${manager.first_name || ''} ${manager.last_name || ''}`.trim();
		return name || manager.staff_no || 'Unassigned';
	}
	return manager;
};

const buildManagerOptions = (staffList = []) => staffList
	.filter((staff) => staff.position === 'Manager')
	.map((staff) => ({
		value: staff.staff_no,
		label: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.staff_no
	}));

const buildBranchManagerMap = (branches = []) => {
	const map = {};
	branches.forEach((branch) => {
		const manager = branch?.manager_no;
		if (manager) {
			map[branch.branch_no] = {
				staffNo: manager.staff_no,
				name: getManagerLabel(manager)
			};
		}
	});
	return map;
};

function HiringApplicationModal({
	isOpen,
	onClose,
	onSave,
	branches,
	branchManagerMap,
	managerOptions,
	roleOptions,
	itemToEdit,
	isAdmin,
	isManager,
	branchCode,
	currentManager
}) {
	const isEditMode = Boolean(itemToEdit?.id);
	const resolvedBranch = itemToEdit?.branch || branchCode || '';

	const { formData, errors, handleChange, validate, reset, setFormData } = useForm({
		first_name: itemToEdit?.first_name || '',
		last_name: itemToEdit?.last_name || '',
		email: itemToEdit?.email || '',
		telephone_no: itemToEdit?.telephone_no || '',
		branch: resolvedBranch,
		position: itemToEdit?.position || (roleOptions[0]?.value || ''),
		stage: itemToEdit?.stage || 'Applied',
		assigned_manager: itemToEdit?.assigned_manager || currentManager?.staffNo || '',
		notes: itemToEdit?.notes || '',
		preferred_start: itemToEdit?.preferred_start || ''
	}, applicationValidators);

	useEffect(() => {
		if (!isOpen) return;
		reset({
			first_name: itemToEdit?.first_name || '',
			last_name: itemToEdit?.last_name || '',
			email: itemToEdit?.email || '',
			telephone_no: itemToEdit?.telephone_no || '',
			branch: itemToEdit?.branch || branchCode || '',
			position: itemToEdit?.position || (roleOptions[0]?.value || ''),
			stage: itemToEdit?.stage || 'Applied',
			assigned_manager: itemToEdit?.assigned_manager || currentManager?.staffNo || '',
			notes: itemToEdit?.notes || '',
			preferred_start: itemToEdit?.preferred_start || ''
		});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, itemToEdit?.id]);

	const handleFieldChange = (field, value) => {
		handleChange(field, value);

		if (field === 'branch' && isAdmin) {
			const defaultManager = branchManagerMap[value];
			if (defaultManager && !formData.assigned_manager) {
				setFormData((prev) => ({
					...prev,
					assigned_manager: defaultManager.staffNo
				}));
			}
		}
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		if (!validate()) return;

		const branchValue = isAdmin ? formData.branch : (branchCode || formData.branch);
		const managerChoice = managerOptions.find((option) => option.value === formData.assigned_manager);
		const branchManager = branchManagerMap[branchValue];

		const assignedManagerName = managerChoice?.label
			|| branchManager?.name
			|| currentManager?.name
			|| '';

		onSave({
			...formData,
			branch: branchValue,
			assigned_manager: isManager ? (currentManager?.staffNo || formData.assigned_manager) : formData.assigned_manager,
			assigned_manager_name: assignedManagerName
		}, itemToEdit);
	};

	if (!isOpen) return null;

	return (
		<Dialog
			isOpen={isOpen}
			onClose={onClose}
			title={isEditMode ? 'Update Hiring Application' : 'New Hiring Application'}
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				<section>
					<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Candidate Profile</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							label="First Name"
							field="first_name"
							value={formData.first_name}
							onChange={handleFieldChange}
							error={errors.first_name}
						/>
						<FormField
							label="Last Name"
							field="last_name"
							value={formData.last_name}
							onChange={handleFieldChange}
							error={errors.last_name}
						/>
						<FormField
							label="Email"
							field="email"
							type="email"
							value={formData.email}
							onChange={handleFieldChange}
							error={errors.email}
						/>
						<FormField
							label="Telephone"
							field="telephone_no"
							value={formData.telephone_no}
							onChange={handleFieldChange}
							error={errors.telephone_no}
						/>
					</div>
				</section>

				<section>
					<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Hiring Details</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<FormField
							label="Branch"
							field="branch"
							type="select"
							value={formData.branch}
							onChange={handleFieldChange}
							error={errors.branch}
						>
							{!isAdmin && branchCode ? (
								<option value={branchCode}>{branchCode}</option>
							) : (
								<>
									<option value="">-- Select Branch --</option>
									{branches.map((branch) => (
										<option key={branch.branch_no} value={branch.branch_no}>
											{getBranchLabel(branch)}
										</option>
									))}
								</>
							)}
						</FormField>

						<FormField
							label="Role"
							field="position"
							type="select"
							value={formData.position}
							onChange={handleFieldChange}
							error={errors.position}
						>
							<option value="">-- Select Role --</option>
							{roleOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</FormField>

						<FormField
							label="Stage"
							field="stage"
							type="select"
							value={formData.stage}
							onChange={handleFieldChange}
							required={false}
						>
							{stageOptions.map((stage) => (
								<option key={stage.value} value={stage.value}>
									{stage.label}
								</option>
							))}
						</FormField>

						{isAdmin && (
							<FormField
								label="Assigned Manager"
								field="assigned_manager"
								type="select"
								value={formData.assigned_manager}
								onChange={handleFieldChange}
								required={false}
							>
								<option value="">-- Unassigned --</option>
								{managerOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</FormField>
						)}

						<FormField
							label="Preferred Start"
							field="preferred_start"
							type="date"
							value={formData.preferred_start}
							onChange={handleFieldChange}
							required={false}
						/>
					</div>
				</section>

				<section>
					<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Notes</h3>
					<FormField
						label="Hiring Notes"
						field="notes"
						type="textarea"
						value={formData.notes}
						onChange={handleFieldChange}
						required={false}
						placeholder="Add interview notes, assessments, or special considerations."
					/>
				</section>

				<div className="flex justify-end gap-3 pt-2">
					<Button variant="ghost" onClick={onClose} type="button">
						Cancel
					</Button>
					<Button type="submit" variant="primary">
						{isEditMode ? 'Save Changes' : 'Submit Application'}
					</Button>
				</div>
			</form>
		</Dialog>
	);
}

export default function HiringPortalPage() {
	const { role, branchCode, staffNo, user } = useAuth();
	const isAdmin = role === 'ADMIN';
	const isManager = role === 'Manager';

	const [branches, setBranches] = useState([]);
	const [managerOptions, setManagerOptions] = useState([]);
	const [applications, setApplications] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');

	const [searchQuery, setSearchQuery] = useState('');
	const [stageFilter, setStageFilter] = useState('all');
	const [roleFilter, setRoleFilter] = useState('all');
	const [branchFilter, setBranchFilter] = useState(isAdmin ? 'all' : (branchCode || 'all'));

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [applicationToEdit, setApplicationToEdit] = useState(null);

	const currentManager = useMemo(() => ({
		staffNo,
		name: user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || staffNo || 'Manager'
	}), [staffNo, user]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed)) setApplications(parsed);
			} catch (error) {
				console.error('Failed to load hiring applications from storage:', error);
			}
		}
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
	}, [applications]);

	useEffect(() => {
		let isMounted = true;
		setIsLoading(true);
		setLoadError('');

		const loadBranches = apiClient('/branches/')
			.then((data) => {
				if (!isMounted) return;
				setBranches(normalizeList(data));
			})
			.catch((error) => {
				console.error('Failed to load branches:', error);
				if (isMounted) setLoadError('Unable to load branches right now.');
			});

		const loadManagers = isAdmin
			? apiClient('/users/staff/')
				.then((data) => {
					if (!isMounted) return;
					const managers = buildManagerOptions(normalizeList(data));
					setManagerOptions(managers);
				})
				.catch((error) => {
					console.error('Failed to load managers:', error);
				})
			: Promise.resolve();

		Promise.all([loadBranches, loadManagers])
			.finally(() => {
				if (isMounted) setIsLoading(false);
			});

		return () => { isMounted = false; };
	}, [isAdmin]);

	const branchManagerMap = useMemo(() => buildBranchManagerMap(branches), [branches]);

	const roleOptions = useMemo(() => (isAdmin ? adminRoleOptions : managerRoleOptions), [isAdmin]);

	const scopedApplications = useMemo(() => {
		if (isAdmin) return applications;
		if (!branchCode) return applications;
		return applications.filter((app) => app.branch === branchCode);
	}, [applications, isAdmin, branchCode]);

	const filteredApplications = useMemo(() => {
		return scopedApplications.filter((app) => {
			if (branchFilter !== 'all' && app.branch !== branchFilter) return false;
			if (stageFilter !== 'all' && app.stage !== stageFilter) return false;
			if (roleFilter !== 'all' && app.position !== roleFilter) return false;
			return true;
		});
	}, [scopedApplications, branchFilter, stageFilter, roleFilter]);

	const summary = useMemo(() => {
		const stats = {
			total: filteredApplications.length,
			applied: 0,
			screening: 0,
			interview: 0,
			offer: 0,
			hired: 0,
			rejected: 0
		};

		filteredApplications.forEach((app) => {
			switch (app.stage) {
				case 'Applied':
					stats.applied += 1;
					break;
				case 'Screening':
					stats.screening += 1;
					break;
				case 'Interview':
					stats.interview += 1;
					break;
				case 'Offer':
					stats.offer += 1;
					break;
				case 'Hired':
					stats.hired += 1;
					break;
				case 'Rejected':
					stats.rejected += 1;
					break;
				default:
					break;
			}
		});

		return stats;
	}, [filteredApplications]);

	const canCreateApplication = isAdmin || isManager;
	const canManageApplication = (app) => {
		if (isAdmin) return true;
		if (isManager && branchCode) return app.branch === branchCode;
		return false;
	};

	const handleOpenNew = () => {
		setApplicationToEdit(null);
		setIsFormOpen(true);
	};

	const handleOpenEdit = (app) => {
		setApplicationToEdit(app);
		setIsFormOpen(true);
	};

	const handleSaveApplication = (payload, existing) => {
		const timestamp = new Date().toISOString();
		const updatedApplication = {
			...payload,
			id: existing?.id || `app_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
			created_at: existing?.created_at || timestamp,
			updated_at: timestamp,
			assigned_manager_name: payload.assigned_manager_name || existing?.assigned_manager_name || ''
		};

		setApplications((prev) => {
			if (existing?.id) {
				return prev.map((item) => item.id === existing.id ? updatedApplication : item);
			}
			return [updatedApplication, ...prev];
		});

		setIsFormOpen(false);
	};

	const updateApplicationStage = (app, nextStage) => {
		setApplications((prev) => prev.map((item) => {
			if (item.id !== app.id) return item;
			return { ...item, stage: nextStage, updated_at: new Date().toISOString() };
		}));
	};

	const getNextStage = (current) => {
		if (!current || current === 'Rejected' || current === 'Hired') return current;
		const index = progressStages.indexOf(current);
		if (index === -1) return progressStages[0];
		return progressStages[Math.min(index + 1, progressStages.length - 1)];
	};

	const resetFilters = () => {
		setSearchQuery('');
		setStageFilter('all');
		setRoleFilter('all');
		setBranchFilter(isAdmin ? 'all' : (branchCode || 'all'));
	};

	const tableColumns = [
		{
			key: 'candidate',
			label: 'Candidate',
			render: (_, row) => (
				<div>
					<p className="font-semibold text-gray-900">{row.last_name}, {row.first_name}</p>
					<p className="text-xs text-gray-500">{row.email}</p>
				</div>
			),
			searchValue: (row) => `${row.first_name} ${row.last_name} ${row.email}`
		},
		{
			key: 'position',
			label: 'Role',
			render: (value) => (
				<span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleBadgeStyles[value] || 'bg-gray-100 text-gray-700'}`}>
					{value || 'N/A'}
				</span>
			)
		},
		{
			key: 'branch',
			label: 'Branch',
			render: (value) => (
				<span className="text-gray-700 text-sm">{getBranchLabel(value)}</span>
			)
		},
		{
			key: 'stage',
			label: 'Stage',
			render: (value) => (
				<span className={`px-2.5 py-1 rounded-full text-xs font-bold ${stageBadgeStyles[value] || 'bg-gray-100 text-gray-700'}`}>
					{value || 'Applied'}
				</span>
			)
		},
		{
			key: 'assigned_manager',
			label: 'Manager',
			render: (_, row) => (
				<span className="text-gray-700 text-sm">
					{row.assigned_manager_name || getManagerLabel(row.assigned_manager) || 'Unassigned'}
				</span>
			)
		},
		{
			key: 'created_at',
			label: 'Applied On',
			render: (value) => (
				<span className="text-gray-600 text-sm">{formatDate(value)}</span>
			)
		}
	];

	const searchPredicate = (row, query) => {
		const haystack = [
			row.first_name,
			row.last_name,
			row.email,
			row.telephone_no,
			row.position,
			row.branch,
			row.stage,
			row.assigned_manager_name
		].filter(Boolean).join(' ').toLowerCase();
		return haystack.includes(query);
	};

	const renderActions = (row) => {
		const canManage = canManageApplication(row);
		const nextStage = getNextStage(row.stage);
		const canAdvance = canManage && nextStage && nextStage !== row.stage;

		return (
			<div className="flex justify-end gap-2">
				<Button
					variant="secondary"
					size="sm"
					onClick={(event) => {
						event.stopPropagation();
						handleOpenEdit(row);
					}}
				>
					Review
				</Button>
				{canAdvance && (
					<Button
						variant="ghost"
						size="sm"
						onClick={(event) => {
							event.stopPropagation();
							updateApplicationStage(row, nextStage);
						}}
					>
						Advance
					</Button>
				)}
				{canManage && row.stage !== 'Rejected' && row.stage !== 'Hired' && (
					<Button
						variant="danger"
						size="sm"
						onClick={(event) => {
							event.stopPropagation();
							updateApplicationStage(row, 'Rejected');
						}}
					>
						Reject
					</Button>
				)}
			</div>
		);
	};

	return (
		<div className="w-full max-w-7xl mx-auto space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Hiring Portal</h1>
					<p className="text-sm text-gray-500 mt-1">
						Track branch applications and move candidates through the hiring pipeline.
					</p>
				</div>

				<div className="flex items-center gap-3">
					{canCreateApplication && (
						<Button variant="primary" onClick={handleOpenNew}>
							+ New Application
						</Button>
					)}
				</div>
			</div>

			{isAdmin && (
				<div className="bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg p-4 text-sm">
					Manager hiring is handled here by Admin. Managers handle supervisor, staff, and secretary roles per branch.
				</div>
			)}

			{isManager && (
				<div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-lg p-4 text-sm">
					Your branch applications are locked to {branchCode || 'your branch'}. You can move supervisor, staff, and secretary hires through the pipeline.
				</div>
			)}

			{!isAdmin && !isManager && (
				<div className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg p-4 text-sm">
					Hiring actions are managed by Admin and Managers. You can view the pipeline for visibility.
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total</p>
					<p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Applied</p>
					<p className="text-2xl font-bold text-blue-700 mt-1">{summary.applied}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Screening</p>
					<p className="text-2xl font-bold text-indigo-700 mt-1">{summary.screening}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Interview</p>
					<p className="text-2xl font-bold text-amber-700 mt-1">{summary.interview}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Offer</p>
					<p className="text-2xl font-bold text-purple-700 mt-1">{summary.offer}</p>
				</div>
				<div className="bg-white border border-gray-200 rounded-xl p-4">
					<p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Hired</p>
					<p className="text-2xl font-bold text-green-700 mt-1">{summary.hired}</p>
				</div>
			</div>

			<div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
					<SearchBar
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Search candidates, role, branch, or manager"
						className="w-full"
						size="md"
					/>

					<FormField
						label="Stage Filter"
						field="stageFilter"
						type="select"
						value={stageFilter}
						onChange={(field, value) => setStageFilter(value)}
						required={false}
					>
						<option value="all">All Stages</option>
						{stageOptions.map((stage) => (
							<option key={stage.value} value={stage.value}>{stage.label}</option>
						))}
					</FormField>

					<FormField
						label="Role Filter"
						field="roleFilter"
						type="select"
						value={roleFilter}
						onChange={(field, value) => setRoleFilter(value)}
						required={false}
					>
						<option value="all">All Roles</option>
						{adminRoleOptions.map((option) => (
							<option key={option.value} value={option.value}>{option.label}</option>
						))}
					</FormField>

					<FormField
						label="Branch Filter"
						field="branchFilter"
						type="select"
						value={branchFilter}
						onChange={(field, value) => setBranchFilter(value)}
						required={false}
					>
						{isAdmin ? (
							<>
								<option value="all">All Branches</option>
								{branches.map((branch) => (
									<option key={branch.branch_no} value={branch.branch_no}>
										{getBranchLabel(branch)}
									</option>
								))}
							</>
						) : (
							<option value={branchCode || 'all'}>{branchCode || 'All Branches'}</option>
						)}
					</FormField>
				</div>

				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="sm"
						onClick={resetFilters}
						disabled={!searchQuery && stageFilter === 'all' && roleFilter === 'all' && branchFilter === (isAdmin ? 'all' : (branchCode || 'all'))}
					>
						Reset Filters
					</Button>
				</div>
			</div>

			{loadError && (
				<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
					{loadError}
				</div>
			)}

			<DataTable
				columns={tableColumns}
				data={filteredApplications}
				keyField="id"
				isLoading={isLoading}
				emptyMessage="No hiring applications found for the selected filters."
				actions={renderActions}
				searchQuery={searchQuery}
				searchPredicate={searchPredicate}
			/>

			<HiringApplicationModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				onSave={handleSaveApplication}
				branches={branches}
				branchManagerMap={branchManagerMap}
				managerOptions={managerOptions}
				roleOptions={roleOptions}
				itemToEdit={applicationToEdit}
				isAdmin={isAdmin}
				isManager={isManager}
				branchCode={branchCode}
				currentManager={currentManager}
			/>
		</div>
	);
}
