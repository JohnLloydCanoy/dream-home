'use client';

import React, { useEffect, useState } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout';
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import MITrimmer from '@/components/functions/MITrimmer';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { useRBAC } from '@/hooks/useRBAC';

const roleOptions = [
    { value: 'Renter', label: 'Renter' },
    { value: 'Owner', label: 'Owner' }
];

const getClientValidators = (isEditMode) => ({
    first_name: { required: true, maxLength: 100, label: 'First Name' },
    last_name: { required: true, maxLength: 100, label: 'Last Name' },
    middle_name: { maxLength: 100, label: 'Middle Name' },
    suffixes: { maxLength: 10, label: 'Suffix' },
    email: {
        required: true,
        maxLength: 255,
        label: 'Email',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        patternMessage: 'Enter a valid email address'
    },
    telephone_no: {
        required: true,
        maxLength: 50,
        label: 'Telephone Number',
        pattern: /^\+?[\d\s\-()]{7,50}$/,
        patternMessage: 'Enter a valid phone number'
    },
    address: { required: true, maxLength: 255, label: 'Address' },
    role: { required: true, maxLength: 20, label: 'Role' },
    password: { required: !isEditMode, maxLength: 128, label: 'Password' }
});

const toId = (value, idField) => {
    if (!value) return '';
    if (typeof value === 'object') return value[idField] || '';
    return value;
};

const getBranchLabel = (branch) => {
    if (!branch) return 'Unregistered';
    if (typeof branch === 'object') {
        const branchNo = branch.branch_no || '';
        const city = branch.city || '';
        if (branchNo && city) return `${branchNo} - ${city}`;
        return branchNo || city || 'Unregistered';
    }
    return branch;
};

const getStaffLabel = (staff) => {
    if (!staff) return 'Unassigned';
    if (typeof staff === 'object') {
        const name = [staff.first_name, staff.last_name].filter(Boolean).join(' ');
        return name ? `${name} (${staff.staff_no || ''})`.trim() : staff.staff_no || 'Unassigned';
    }
    return staff;
};

const formatDate = (value) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
};

function ClientModal({ isOpen, onClose, onSuccess, itemToEdit }) {
    const isEditMode = Boolean(itemToEdit?.client_no);
    const [branches, setBranches] = useState([]);
    const [staffList, setStaffList] = useState([]);

    useEffect(() => {
        if (!isOpen) return;
        Promise.all([
            apiClient('/branches/').catch(err => {
                console.error('Failed to load branches:', err);
                return [];
            }),
            apiClient('/users/staff/').catch(err => {
                console.error('Failed to load staff list:', err);
                return [];
            })
        ])
            .then(([branchData, staffData]) => {
                setBranches(branchData?.items || branchData || []);
                setStaffList(staffData?.results || staffData?.items || staffData || []);
            })
            .catch((error) => console.error('Failed to load registration options:', error));
    }, [isOpen]);

    const { formData, errors, handleChange, validate, reset } = useForm({
        first_name: itemToEdit?.first_name || '',
        last_name: itemToEdit?.last_name || '',
        middle_name: itemToEdit?.middle_name || '',
        suffixes: itemToEdit?.suffixes || '',
        email: itemToEdit?.email || '',
        password: '',
        telephone_no: itemToEdit?.telephone_no || '',
        address: itemToEdit?.address || '',
        role: itemToEdit?.role || 'Renter',
        registered_branch: toId(itemToEdit?.registered_branch || itemToEdit?.registration_branch, 'branch_no'),
        registered_staff: toId(itemToEdit?.registered_staff || itemToEdit?.registration_staff, 'staff_no')
    }, getClientValidators(isEditMode));

    useEffect(() => {
        if (isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemToEdit?.client_no, isOpen]);

    const formatPayload = (data) => {
        const payload = { ...data };

        if (!payload.password) delete payload.password;
        if (!payload.middle_name) payload.middle_name = null;
        if (!payload.suffixes) payload.suffixes = null;
        if (!payload.address) payload.address = 'Unknown Address';
        if (!payload.role) payload.role = 'Renter';
        payload.registered_branch = payload.registered_branch || null;
        payload.registered_staff = payload.registered_staff || null;

        return payload;
    };

    return (
        <CrudFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            title={isEditMode ? `Edit Client ${itemToEdit.client_no}` : 'Add New Client'}
            baseEndpoint="/users/clients"
            itemId={itemToEdit?.client_no}
            formData={formData}
            validate={validate}
            transformPayload={formatPayload}
            submitLabel="Save Client"
            updateLabel="Update Client"
        >
            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Client Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="First Name" field="first_name" value={formData.first_name} onChange={handleChange} error={errors.first_name} />
                    <FormField label="Last Name" field="last_name" value={formData.last_name} onChange={handleChange} error={errors.last_name} />
                    <FormField label="Middle Name" field="middle_name" value={formData.middle_name} onChange={handleChange} error={errors.middle_name} required={false} />
                    <FormField label="Suffix" field="suffixes" value={formData.suffixes} onChange={handleChange} error={errors.suffixes} required={false} />
                    <FormField label="Role" field="role" type="select" value={formData.role} onChange={handleChange} error={errors.role}>
                        <option value="">-- Select Role --</option>
                        {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </FormField>
                </div>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Contact Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Email" field="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} />
                    <FormField label="Telephone" field="telephone_no" value={formData.telephone_no} onChange={handleChange} error={errors.telephone_no} />
                    <FormField label="Address" field="address" value={formData.address} onChange={handleChange} error={errors.address} className="col-span-2" />
                    <FormField
                        label={isEditMode ? 'New Password' : 'Password'}
                        field="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        error={errors.password}
                        required={!isEditMode}
                        placeholder={isEditMode ? 'Leave blank to keep current password' : ''}
                        className="col-span-2"
                    />
                </div>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Registration Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="Registered Branch"
                        field="registered_branch"
                        type="select"
                        value={formData.registered_branch}
                        onChange={handleChange}
                        required={false}
                    >
                        <option value="">— Unregistered —</option>
                        {branches.map((branch) => (
                            <option key={branch.branch_no} value={branch.branch_no}>
                                {branch.branch_no} - {branch.city}
                            </option>
                        ))}
                    </FormField>
                    <FormField
                        label="Registered Staff"
                        field="registered_staff"
                        type="select"
                        value={formData.registered_staff}
                        onChange={handleChange}
                        required={false}
                    >
                        <option value="">— Unassigned —</option>
                        {staffList.map((staff) => (
                            <option key={staff.staff_no} value={staff.staff_no}>
                                {staff.first_name} {staff.last_name} ({staff.staff_no})
                            </option>
                        ))}
                    </FormField>
                </div>
            </section>
        </CrudFormModal>
    );
}

export default function DashboardPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [assignmentFilter, setAssignmentFilter] = useState('all');
    const rbac = useRBAC();

    const customRbac = {
        ...rbac,
        filterByBranch: (data) => {
            let filtered = rbac.filterByBranch ? rbac.filterByBranch(data) : data;
            if (assignmentFilter === 'unassigned') {
                filtered = filtered.filter(row => !(row.registered_branch || row.registration_branch));
            } else if (assignmentFilter === 'assigned') {
                filtered = filtered.filter(row => Boolean(row.registered_branch || row.registration_branch));
            }
            return filtered;
        }
    };

    const getFullName = (row) => `${row.last_name}, ${row.first_name} ${MITrimmer(row.middle_name)}. ${row.suffixes || ''}`.trim();

    const tableColumns = [
        {
            key: 'client_no', label: 'Client ID',
            render: (val) => <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{val}</span>
        },
        {
            key: 'name', label: 'Full Name',
            render: (val, row) => (
                <div className="text-sm text-gray-900">
                    <p className="font-semibold">{getFullName(row)}</p>
                    <p className="text-xs text-gray-500">{row.email || 'No email on file'}</p>
                    <p className="text-xs text-gray-500">{row.telephone_no || 'No phone on file'}</p>
                    <p className="text-xs text-gray-500">{row.address || 'No address on file'}</p>
                </div>
            ),
            exportValue: (row) => [
                getFullName(row),
                row.email || 'No email on file',
                row.telephone_no || 'No phone on file',
                row.address || 'No address on file'
            ].join('\n'),
            searchValue: (row) => [
                row.first_name,
                row.middle_name || '',
                row.last_name,
                row.email || '',
                row.telephone_no || '',
                row.address || ''
            ].join(' ').trim()
        },
        {
            key: 'registered_branch', label: 'Registered Branch',
            render: (val, row) => {
                const label = getBranchLabel(row.registered_branch || row.registration_branch);
                const isRegistered = label !== 'Unregistered';
                return (
                    <span className={isRegistered ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
                        {label}
                    </span>
                );
            },
            exportValue: (row) => getBranchLabel(row.registered_branch || row.registration_branch),
            searchValue: (row) => getBranchLabel(row.registered_branch || row.registration_branch)
        },
        {
            key: 'registered_staff', label: 'Registered Staff',
            render: (val, row) => {
                const label = getStaffLabel(row.registered_staff || row.registration_staff);
                const isAssigned = label !== 'Unassigned';
                return (
                    <span className={isAssigned ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
                        {label}
                    </span>
                );
            },
            exportValue: (row) => getStaffLabel(row.registered_staff || row.registration_staff),
            searchValue: (row) => getStaffLabel(row.registered_staff || row.registration_staff)
        },
        {
            key: 'telephone_no',
            label: 'Telephone No.',
            render: (val, row) => <span className="text-gray-700">{row.telephone_no || 'N/A'}</span>,
            exportValue: (row) => row.telephone_no || 'N/A'
        },
        {
            key: 'date_registered', label: 'Date Registered',
            render: (val, row) => <span className="text-gray-700">{formatDate(row.date_registered)}</span>,
            exportValue: (row) => formatDate(row.date_registered),
            searchValue: (row) => formatDate(row.date_registered)
        },
        {
            key: 'role', label: 'Role',
            render: (val) => {
                const colors = {
                    'renter': 'bg-blue-100 text-blue-800',
                    'owner': 'bg-orange-100 text-orange-800',
                };
                const normalizedVal = val ? val.toLowerCase() : '';
                return (
                    <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${colors[normalizedVal] || 'bg-gray-100 text-gray-800'}`}
                    >
                        {val || 'N/A'}
                    </span>
                );
            },
            searchValue: (row) => row.role || ''
        }
    ];

    return (
        <CrudPageLayout
            title="Clients Dashboard"
            subtitle="Manage DreamHome clients, both renters and owners."
            addButtonLabel="+ Add Client"
            endpoint="/users/clients/"
            keyField="client_no"
            columns={tableColumns}
            searchQuery={searchQuery}
            searchKeys={['client_no', 'name', 'registered_branch', 'registered_staff', 'date_registered', 'role']}
            getDeleteModalItemName={(client) => `${client.first_name} ${client.last_name} (${client.role})`}
            rbac={customRbac}
            nameKey={['last_name', 'first_name']}
            dateKey="date_registered"
            sortNameLabel="Client Name"
            sortDateLabel="Date Registered"
            pageSize={5}
            renderTopContent={(dataList) => {
                // Determine raw counts based on the underlying data *before* the filter is applied,
                // or just show stats for currently viewed data. To be helpful, we show stats for the scoped branch data.
                // CrudPageLayout passes the scopedData to renderTopContent.
                // Wait, scopedData ALREADY has the filter applied. We should calculate totals differently or just accept
                // that the cards show the *current filter* totals. Let's make it show current table stats.
                const total = dataList.length;
                const assigned = dataList.filter(row => Boolean(row.registered_branch || row.registration_branch)).length;
                const unassigned = total - assigned;

                return (
                    <div className="space-y-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Viewing</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Assigned</p>
                                <p className="text-2xl font-bold text-green-700 mt-1">{assigned}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Needs Assignment</p>
                                <p className={`text-2xl font-bold mt-1 ${unassigned > 0 ? 'text-red-600' : 'text-gray-900'}`}>{unassigned}</p>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="w-full sm:w-80">
                                <FormField
                                    label="Assignment Filter"
                                    field="assignment_filter"
                                    type="select"
                                    value={assignmentFilter}
                                    onChange={(field, val) => setAssignmentFilter(val)}
                                    required={false}
                                >
                                    <option value="all">Show All Clients</option>
                                    <option value="unassigned">Needs Assignment (Unregistered)</option>
                                    <option value="assigned">Assigned Clients</option>
                                </FormField>
                            </div>
                        </div>
                    </div>
                );
            }}
            renderHeaderMiddle={() => (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search clients..."
                    className="w-full sm:max-w-sm"
                    size="md"
                />
            )}
            renderHeaderActions={(dataList) => (
                <ExportPDF
                    title="Clients Dashboard"
                    subtitle="DreamHome clients, renters, and owners."
                    fileName="clients-dashboard"
                    columns={tableColumns}
                    data={dataList}
                    buttonLabel="Export PDF"
                    buttonVariant="secondary"
                    buttonSize="md"
                />
            )}
            renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => (
                <ClientModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onSuccess={onSuccess}
                    itemToEdit={itemToEdit}
                />
            )}
        />
    );
}