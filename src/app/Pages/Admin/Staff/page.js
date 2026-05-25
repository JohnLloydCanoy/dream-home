'use client';

import React, { useState, useEffect } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout'; 
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import MITrimmer from '@/components/functions/MITrimmer';
import { staffValidators } from '@/lib/validator';

// --- Form Configuration Constants ---
const positionOptions = [
    { value: 'Staff', label: 'Standard Staff' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Supervisor', label: 'Supervisor' },
    { value: 'Secretary', label: 'Secretary' }
];

const coreFields = [
    { label: 'First Name', field: 'first_name' },
    { label: 'Last Name', field: 'last_name' },
    { label: 'Middle Name', field: 'middle_name' },
    { label: 'Suffix', field: 'suffix' },
    { label: 'Email', field: 'email', type: 'email' },
    { label: 'Password', field: 'password', type: 'password', placeholder: 'Leave blank for default: dreamhome2026', required: false },
    { label: 'Telephone', field: 'telephone_no' },
    { label: 'Address', field: 'address', className: 'col-span-2' },
    { label: 'Gender', field: 'sex', type: 'select', options: [{ value: '', label: '— Select —' }, { value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }] },
    { label: 'Date of Birth', field: 'dob', type: 'date' },
    { label: 'National Insurance No.', field: 'nin' },
    { label: 'Date Joined', field: 'date_joined', type: 'date' }
];

const nextOfKinFields = [
    { label: 'First Name', field: 'nok_first_name' },
    { label: 'Last Name', field: 'nok_last_name' },
    { label: 'Middle Name', field: 'nok_middle_name' },
    { label: 'Suffix', field: 'nok_suffix' },
    { label: 'Relationship', field: 'nok_relationship' },
    { label: 'Address', field: 'nok_address' },
    { label: 'Telephone No.', field: 'nok_telephone_no' }
];

// 🌟 1. Define the Local Staff Form Component
function StaffModal({ isOpen, onClose, onSuccess, itemToEdit }) {
    const [branches, setBranches] = useState([]);
    const [staffList, setStaffList] = useState([]);

    // Fetch dropdown options
    useEffect(() => {
        if (isOpen) {
            Promise.all([
                apiClient('/branches/').catch(err => {
                    console.error("Failed to load branches:", err);
                    return [];
                }),
                apiClient('/users/staff/').catch(err => {
                    console.error("Failed to load staff list:", err);
                    return [];
                })
            ])
                .then(([branchData, staffData]) => {
                    setBranches(branchData.items || branchData);
                    setStaffList(staffData.results || staffData.items || staffData);
                })
                .catch(err => console.error("Failed to load options:", err));
        }
    }, [isOpen]);

    // Initialize Form State
    const { formData, errors, handleChange, validate, reset } = useForm({
        first_name: itemToEdit?.first_name || '',
        last_name: itemToEdit?.last_name || '',
        middle_name: itemToEdit?.middle_name || '',
        suffix: itemToEdit?.suffix || '',
        email: itemToEdit?.email || '',
        password: '',
        sex: itemToEdit?.sex || '',
        dob: itemToEdit?.dob || '',
        address: itemToEdit?.address || '',
        telephone_no: itemToEdit?.telephone_no || '',
        nin: itemToEdit?.nin || '',
        position: itemToEdit?.position || 'Staff',
        salary: itemToEdit?.salary || '',
        date_joined: itemToEdit?.date_joined || '',
        branch: (typeof itemToEdit?.branch === 'object' ? itemToEdit.branch?.branch_no : itemToEdit?.branch) || '',
        supervisor: (typeof itemToEdit?.supervisor === 'object' ? itemToEdit.supervisor?.staff_no : itemToEdit?.supervisor) || '',
        
        // Conditional Fields
        typing_speed: itemToEdit?.typing_speed || '',
        manager_start_date: itemToEdit?.manager_start_date || '',
        bonus_payment: itemToEdit?.bonus_payment || '',
        car_allowance: itemToEdit?.car_allowance || '',
        
        // Next of Kin Fields
        nok_first_name: itemToEdit?.next_of_kin?.first_name || '',
        nok_last_name: itemToEdit?.next_of_kin?.last_name || '',
        nok_middle_name: itemToEdit?.next_of_kin?.middle_name || '',
        nok_suffix: itemToEdit?.next_of_kin?.suffix || '',
        nok_relationship: itemToEdit?.next_of_kin?.relationship || '',
        nok_address: itemToEdit?.next_of_kin?.address || '',
        nok_telephone_no: itemToEdit?.next_of_kin?.telephone_no || ''
    }, staffValidators);

    useEffect(() => {
        if (isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemToEdit?.staff_no, isOpen]);

    // Format data before sending to the API
    const formatPayload = (data) => {
        const payload = {
            ...data,
            supervisor: data.supervisor || null,
            branch: data.branch || null,
            next_of_kin: {
                first_name: data.nok_first_name,
                last_name: data.nok_last_name,
                middle_name: data.nok_middle_name,
                suffix: data.nok_suffix,
                relationship: data.nok_relationship,
                address: data.nok_address,
                telephone_no: data.nok_telephone_no
            }
        };

        if (payload.position !== 'Secretary') payload.typing_speed = null;
        if (payload.position !== 'Manager') {
            payload.manager_start_date = null;
            payload.bonus_payment = null;
            payload.car_allowance = null;
        }
        return payload;
    };

    const supervisors = staffList.filter(s => s.position === 'Supervisor');
    
    const renderField = (config) => (
        <FormField key={config.field} label={config.label} field={config.field} type={config.type} value={formData[config.field]} onChange={handleChange} error={errors[config.field]} placeholder={config.placeholder} required={config.required} className={config.className}>
            {config.options?.map(option => <option key={`${config.field}-${option.value}`} value={option.value}>{option.label}</option>)}
        </FormField>
    );

    return (
        <CrudFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            title={itemToEdit ? `Edit Staff ${itemToEdit.staff_no}` : "Register New Staff"}
            baseEndpoint="/users/staff"
            itemId={itemToEdit?.staff_no}
            formData={formData}
            validate={validate}
            transformPayload={formatPayload}
            submitLabel="Save Staff Member"
            updateLabel="Update Staff"
        >
            {/* --- 1. CORE DETAILS --- */}
            <div>
                <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-3">Core Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    {coreFields.map(renderField)}
                </div>
            </div>

            {/* --- 2. EMPLOYMENT DETAILS --- */}
            <div>
                <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-3">Employment</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Position" field="position" type="select" value={formData.position} onChange={handleChange} error={errors.position}>
                        {positionOptions.map(option => <option key={`position-${option.value}`} value={option.value}>{option.label}</option>)}
                    </FormField>
                    <FormField label="Salary" field="salary" type="number" value={formData.salary} onChange={handleChange} error={errors.salary} />
                    <FormField label="Branch" field="branch" type="select" value={formData.branch} onChange={handleChange} error={errors.branch}>
                        <option value="">— Select Branch —</option>
                        {branches.map(b => <option key={b.branch_no} value={b.branch_no}>{b.area}</option>)}
                    </FormField>
                    <FormField label="Supervisor" field="supervisor" type="select" value={formData.supervisor} onChange={handleChange} error={errors.supervisor} required={false}>
                        <option value="">— None —</option>
                        {supervisors.map(s => <option key={s.staff_no} value={s.staff_no}>{s.first_name} {s.last_name}</option>)}
                    </FormField>
                </div>
            </div>

            {/* --- 3. CONDITIONAL FIELDS --- */}
            {formData.position === 'Secretary' && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <FormField label="Typing Speed (WPM)" field="typing_speed" type="number" value={formData.typing_speed} onChange={handleChange} error={errors.typing_speed} placeholder="e.g., 60" labelClass="text-orange-900" />
                </div>
            )}
            {formData.position === 'Manager' && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 grid grid-cols-3 gap-3">
                    <FormField label="Manager Start" field="manager_start_date" type="date" value={formData.manager_start_date} onChange={handleChange} error={errors.manager_start_date} labelClass="text-green-900" />
                    <FormField label="Bonus" field="bonus_payment" type="number" value={formData.bonus_payment} onChange={handleChange} error={errors.bonus_payment} required={false} labelClass="text-green-900" />
                    <FormField label="Car Allowance" field="car_allowance" type="number" value={formData.car_allowance} onChange={handleChange} error={errors.car_allowance} required={false} labelClass="text-green-900" />
                </div>
            )}

            {/* --- 4. NEXT OF KIN --- */}
            <div>
                <h3 className="text-sm font-bold text-blue-900 border-b pb-2 mb-3">Next of Kin</h3>
                <div className="grid grid-cols-2 gap-4">
                    {nextOfKinFields.map((config) => renderField({ ...config, required: false }))}
                </div>
            </div>
        </CrudFormModal>
    );
}

// 🌟 2. Main Page Component
export default function StaffDirectoryPage() {
    const [branches, setBranches] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const formatSalary = (value) => {
        if (value === null || value === undefined || value === '') return '';
        const rawValue = String(value).trim();
        const numberValue = Number(rawValue);
        if (Number.isNaN(numberValue)) return rawValue;

        const hasDecimal = rawValue.includes('.');
        if (!hasDecimal) return `₱ ${numberValue.toLocaleString()}`;

        const [, fraction = ''] = rawValue.split('.');
        const fractionLength = fraction.length;
        const formatted = numberValue.toLocaleString(undefined, {
            minimumFractionDigits: fractionLength,
            maximumFractionDigits: fractionLength
        });
        return `₱ ${formatted}${fractionLength === 0 && rawValue.endsWith('.') ? '.' : ''}`;
    };

    useEffect(() => {
        apiClient('/branches/')
            .then((branchData) => setBranches(branchData.items || branchData))
            .catch((error) => console.error('Failed to load branches:', error));
    }, []);

    const getBranchInfo = (value) => {
        if (!value) return null;
        if (typeof value === 'object') return value;
        return branches.find((branch) => branch.branch_no === value) || null;
    };

    const getBranchAddress = (branchInfo) => {
        if (!branchInfo) return '';
        const line1 = [branchInfo.street, branchInfo.area].filter(Boolean).join(', ');
        const line2 = [branchInfo.city, branchInfo.postcode].filter(Boolean).join(', ');
        return [line1, line2].filter(Boolean).join('\n');
    };

    const getKinName = (kin) => {
        if (!kin) return '';
        const first = kin.first_name || '';
        const last = kin.last_name || '';
        const middle = MITrimmer(kin.middle_name);
        const suffix = kin.suffix || '';
        const nameParts = [last, last && ',' , first, middle, suffix].filter(Boolean).join(' ');
        return nameParts.trim();
    };

    const getKinAddress = (kin) => (kin?.address || '').trim();
    const getKinPhone = (kin) => (kin?.telephone_no || '').trim();
    const getKinRelationship = (kin) => (kin?.relationship || '').trim();

    const tableColumns = [
        { 
            key: 'staff_no', label: 'Staff No.',
            render: (val) => <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{val}</span> 
        },
        { 
            key: 'name', label: 'Full Name',
            render: (val, row) => <span className="font-medium text-gray-900">{row.last_name}, {row.first_name} {MITrimmer(row.middle_name)}</span>,
            exportValue: (row) => `${row.last_name}, ${row.first_name} ${MITrimmer(row.middle_name)}`.trim(),
            searchValue: (row) => `${row.first_name} ${row.middle_name || ''} ${row.last_name}`.trim()
        },
        { 
            key: 'position', label: 'Position',
            render: (val) => {
                const colors = {
                    'Manager': 'bg-green-100 text-green-800',
                    'Supervisor': 'bg-blue-100 text-blue-800',
                    'Secretary': 'bg-orange-100 text-orange-800',
                    'Staff': 'bg-gray-100 text-gray-800'
                };
                const descriptions = {
                    'Manager': 'Manages the branch',
                    'Supervisor': 'In charge of 10 staff each branch',
                    'Secretary': 'General administrative duties',
                    'Staff': 'Regular generic staff'
                };
                return (
                    <span 
                        title={descriptions[val] || descriptions['Staff']} 
                        className={`px-2 py-1 rounded-full text-xs font-bold cursor-help ${colors[val] || colors['Staff']}`}
                    >
                        {val}
                    </span>
                );
            }
        },
        { 
            key: 'branch', label: 'Branch',
            render: (val) => {
                if (!val) return 'Unassigned';

                const branchInfo = getBranchInfo(val);

                if (!branchInfo) {
                    return <span className="text-gray-900 font-medium">{val}</span>;
                }

                const line1 = [branchInfo.street, branchInfo.area]
                    .filter(Boolean)
                    .join(', ');
                const line2 = [branchInfo.city, branchInfo.postcode]
                    .filter(Boolean)
                    .join(', ');
                const hasAddress = Boolean(line1 || line2);

                return (
                    <div className="text-xs text-gray-500">
                        <p className="text-gray-900 font-medium">{branchInfo.branch_no || 'Branch'}</p>
                        {hasAddress ? (
                            <>
                                {line1 && <p>{line1}</p>}
                                {line2 && <p>{line2}</p>}
                            </>
                        ) : (
                            <p>Address unavailable</p>
                        )}
                    </div>
                );
            },
            exportValue: (row) => {
                const branchInfo = getBranchInfo(row.branch);
                const address = getBranchAddress(branchInfo);
                if (!branchInfo) return row.branch || 'Unassigned';
                return `${branchInfo.branch_no || 'Branch'}${address ? `\n${address}` : ''}`;
            },
            searchValue: (row) => {
                const branchInfo = getBranchInfo(row.branch);
                if (!branchInfo) return row.branch || '';
                return `${branchInfo.branch_no} ${getBranchAddress(branchInfo)}`.trim();
            }
        },
        { key: 'telephone_no', label: 'Telephone No.' },
        { key: 'nin', label: 'National Insurance No.' },
        {
            key: 'next_of_kin', label: 'Next of Kinship',
            render: (val, row) => {
                const kin = row.next_of_kin;
                if (!kin) {
                    return <span className="text-gray-400 italic">No kin on file</span>;
                }

                const name = getKinName(kin) || 'Unknown';
                const address = getKinAddress(kin) || 'No address';
                const phone = getKinPhone(kin) || 'No number';
                const relationship = getKinRelationship(kin) || 'No relationship';

                return (
                    <div className="text-xs text-gray-500 whitespace-normal">
                        <p className="text-gray-900 font-medium">{name}</p>
                        <p>{address}</p>
                        <p>{phone}</p>
                        <p>{relationship}</p>
                    </div>
                );
            },
            exportValue: (row) => {
                const kin = row.next_of_kin;
                if (!kin) return 'No kin on file';
                const name = getKinName(kin) || 'Unknown';
                const address = getKinAddress(kin) || 'No address';
                const phone = getKinPhone(kin) || 'No number';
                const relationship = getKinRelationship(kin) || 'No relationship';
                return [name, address, phone, relationship].join('\n');
            },
            searchValue: (row) => {
                const kin = row.next_of_kin;
                if (!kin) return '';
                return [getKinName(kin), getKinAddress(kin), getKinPhone(kin), getKinRelationship(kin)]
                    .filter(Boolean)
                    .join(' ');
            }
        },
        {
            key: 'salary',
            label: 'Salary',
            render: (val) => formatSalary(val),
            exportValue: (row) => formatSalary(row.salary)
        },
    ];

    return (
        <CrudPageLayout
            title="Staff Directory"
            subtitle="Manage DreamHome employees, roles, and kinship profiles."
            endpoint="/users/staff/"
            keyField="staff_no"
            columns={tableColumns}
            searchQuery={searchQuery}
            searchKeys={['staff_no', 'name', 'position', 'branch', 'telephone_no', 'salary']}
            getDeleteModalItemName={(staff) => `${staff.first_name} ${staff.last_name} (${staff.staff_no})`}
            nameKey={['last_name', 'first_name']}
            dateKey="date_joined"
            sortNameLabel="Staff Name"
            sortDateLabel="Date Joined"
            pageSize={5}
            rbac={{ canCreate: false }}
            renderHeaderMiddle={() => (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search staff..."
                    className="w-full sm:max-w-sm"
                    size="md"
                />
            )}
            renderHeaderActions={(dataList) => (
                <ExportPDF
                    title="Staff Directory"
                    subtitle="DreamHome employees, roles, and kinship profiles."
                    fileName="staff-directory"
                    columns={tableColumns}
                    data={dataList}
                    buttonLabel="Export PDF"
                    buttonVariant="secondary"
                    buttonSize="md"
                />
            )}
            
            renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => (
                itemToEdit ? (
                    <StaffModal 
                        isOpen={isOpen} 
                        onClose={onClose} 
                        onSuccess={onSuccess} 
                        itemToEdit={itemToEdit} 
                    />
                ) : null
            )}
        />
    );
}