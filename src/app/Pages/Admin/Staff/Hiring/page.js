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

const genderOptions = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'P', label: 'Prefer not to say' }
];

const cleanValue = (value) => {
    const trimmed = String(value || '').trim();
    return trimmed.length ? trimmed : null;
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
    middle_name: {
        maxLength: 100,
        label: 'Middle Name',
        pattern: REGEX.NAME,
        patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
    },
    suffixes: {
        maxLength: 10,
        label: 'Suffix'
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
    address: {
        required: true,
        maxLength: 255,
        label: 'Address',
        pattern: REGEX.ADDRESS,
        patternMessage: 'Invalid characters in address'
    },
    sex: {
        required: true,
        maxLength: 10,
        label: 'Gender'
    },
    dob: {
        required: true,
        label: 'Date of Birth',
        pattern: REGEX.DATE_YYYY_MM_DD,
        patternMessage: 'Date must be in YYYY-MM-DD format'
    },
    nin: {
        required: true,
        maxLength: 50,
        label: 'National Insurance Number',
        pattern: REGEX.ID_NUMBER,
        patternMessage: 'Only letters, numbers, and hyphens allowed'
    },
    branch: {
        required: true,
        label: 'Branch'
    },
    position: {
        required: true,
        label: 'Role'
    },
    salary: {
        required: true,
        label: 'Proposed Salary'
    },
    preferred_start_date: {
        required: true,
        label: 'Preferred Start Date',
        pattern: REGEX.DATE_YYYY_MM_DD,
        patternMessage: 'Date must be in YYYY-MM-DD format'
    },
    typing_speed: {
        label: 'Typing Speed',
        pattern: REGEX.WHOLE_NUMBER,
        patternMessage: 'Typing speed must be a whole number'
    },
    nok_first_name: {
        maxLength: 100,
        label: 'Next of Kin First Name',
        pattern: REGEX.NAME,
        patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
    },
    nok_last_name: {
        maxLength: 100,
        label: 'Next of Kin Last Name',
        pattern: REGEX.NAME,
        patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
    },
    nok_middle_name: {
        maxLength: 100,
        label: 'Next of Kin Middle Name',
        pattern: REGEX.NAME,
        patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
    },
    nok_suffixes: { maxLength: 10, label: 'Next of Kin Suffix' },
    nok_relationship: {
        maxLength: 100,
        label: 'Relationship',
        pattern: REGEX.ALPHA_ONLY,
        patternMessage: 'Relationship can only contain letters'
    },
    nok_address: {
        maxLength: 255,
        label: 'Next of Kin Address',
        pattern: REGEX.ADDRESS,
        patternMessage: 'Invalid characters in address'
    },
    nok_telephone_no: {
        maxLength: 50,
        label: 'Next of Kin Telephone',
        pattern: REGEX.PH_PHONE_FAX,
        patternMessage: 'Enter a valid phone number'
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
    const [conditionalErrors, setConditionalErrors] = useState({});

    const { formData, errors, handleChange, validate, reset, setFormData } = useForm({
        first_name: itemToEdit?.first_name || '',
        last_name: itemToEdit?.last_name || '',
        middle_name: itemToEdit?.middle_name || '',
        suffixes: itemToEdit?.suffixes || '',
        email: itemToEdit?.email || '',
        telephone_no: itemToEdit?.telephone_no || '',
        address: itemToEdit?.address || '',
        sex: itemToEdit?.sex || '',
        dob: itemToEdit?.dob || '',
        nin: itemToEdit?.nin || '',
        branch: resolvedBranch,
        position: itemToEdit?.position || (roleOptions[0]?.value || ''),
        salary: itemToEdit?.salary || '',
        stage: itemToEdit?.stage || 'Applied',
        assigned_manager: itemToEdit?.assigned_manager || currentManager?.staffNo || '',
        notes: itemToEdit?.notes || '',
        preferred_start_date: itemToEdit?.preferred_start_date || '',
        typing_speed: itemToEdit?.typing_speed || '',
        nok_first_name: itemToEdit?.nok_first_name || '',
        nok_last_name: itemToEdit?.nok_last_name || '',
        nok_middle_name: itemToEdit?.nok_middle_name || '',
        nok_suffixes: itemToEdit?.nok_suffixes || '',
        nok_relationship: itemToEdit?.nok_relationship || '',
        nok_address: itemToEdit?.nok_address || '',
        nok_telephone_no: itemToEdit?.nok_telephone_no || ''
    }, applicationValidators);

    useEffect(() => {
        if (!isOpen) return;
        setConditionalErrors({});
        reset({
            first_name: itemToEdit?.first_name || '',
            last_name: itemToEdit?.last_name || '',
            middle_name: itemToEdit?.middle_name || '',
            suffixes: itemToEdit?.suffixes || '',
            email: itemToEdit?.email || '',
            telephone_no: itemToEdit?.telephone_no || '',
            address: itemToEdit?.address || '',
            sex: itemToEdit?.sex || '',
            dob: itemToEdit?.dob || '',
            nin: itemToEdit?.nin || '',
            branch: itemToEdit?.branch || branchCode || '',
            position: itemToEdit?.position || (roleOptions[0]?.value || ''),
            salary: itemToEdit?.salary || '',
            stage: itemToEdit?.stage || 'Applied',
            assigned_manager: itemToEdit?.assigned_manager || currentManager?.staffNo || '',
            notes: itemToEdit?.notes || '',
            preferred_start_date: itemToEdit?.preferred_start_date || '',
            typing_speed: itemToEdit?.typing_speed || '',
            nok_first_name: itemToEdit?.nok_first_name || '',
            nok_last_name: itemToEdit?.nok_last_name || '',
            nok_middle_name: itemToEdit?.nok_middle_name || '',
            nok_suffixes: itemToEdit?.nok_suffixes || '',
            nok_relationship: itemToEdit?.nok_relationship || '',
            nok_address: itemToEdit?.nok_address || '',
            nok_telephone_no: itemToEdit?.nok_telephone_no || ''
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, itemToEdit?.id]);

    const handleFieldChange = (field, value) => {
        handleChange(field, value);

        if (conditionalErrors[field]) {
            setConditionalErrors((prev) => ({ ...prev, [field]: null }));
        }

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

    const validateConditionals = () => {
        const nextErrors = {};

        if (formData.position === 'Secretary' && !cleanValue(formData.typing_speed)) {
            nextErrors.typing_speed = 'Typing speed is required for secretarial applicants.';
        }

        setConditionalErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        
        const baseValid = validate();
        const conditionalValid = validateConditionals();
        if (!baseValid || !conditionalValid) return;

        const branchValue = isAdmin ? formData.branch : (branchCode || formData.branch);
        
        const cleanedPayload = {
            ...formData,
            branch: branchValue,
            assigned_manager: isManager ? (currentManager?.staffNo || formData.assigned_manager) : formData.assigned_manager,
            middle_name: cleanValue(formData.middle_name),
            suffixes: cleanValue(formData.suffixes),
            address: cleanValue(formData.address),
            sex: cleanValue(formData.sex),
            dob: cleanValue(formData.dob),
            nin: cleanValue(formData.nin),
            typing_speed: formData.position === 'Secretary' ? cleanValue(formData.typing_speed) : null,
            nok_first_name: cleanValue(formData.nok_first_name),
            nok_last_name: cleanValue(formData.nok_last_name),
            nok_middle_name: cleanValue(formData.nok_middle_name),
            nok_suffixes: cleanValue(formData.nok_suffixes),
            nok_relationship: cleanValue(formData.nok_relationship),
            nok_address: cleanValue(formData.nok_address),
            nok_telephone_no: cleanValue(formData.nok_telephone_no)
        };

        onSave(cleanedPayload, itemToEdit);
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
                            label="Middle Name (Optional)"
                            field="middle_name"
                            value={formData.middle_name}
                            onChange={handleFieldChange}
                            error={errors.middle_name}
                            required={false}
                        />
                        <FormField
                            label="Suffix (Optional)"
                            field="suffixes"
                            value={formData.suffixes}
                            onChange={handleFieldChange}
                            error={errors.suffixes}
                            required={false}
                            placeholder="e.g. Jr., III"
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
                        <FormField
                            label="Gender"
                            field="sex"
                            type="select"
                            value={formData.sex}
                            onChange={handleFieldChange}
                            error={errors.sex}
                        >
                            <option value="">-- Select Gender --</option>
                            {genderOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </FormField>
                        <FormField
                            label="Date of Birth"
                            field="dob"
                            type="date"
                            value={formData.dob}
                            onChange={handleFieldChange}
                            error={errors.dob}
                        />
                        <FormField
                            label="National Insurance No."
                            field="nin"
                            value={formData.nin}
                            onChange={handleFieldChange}
                            error={errors.nin}
                            placeholder="e.g. AB-123456-C"
                        />
                        <FormField
                            label="Address"
                            field="address"
                            type="textarea"
                            value={formData.address}
                            onChange={handleFieldChange}
                            error={errors.address}
                            className="sm:col-span-2"
                            placeholder="Full residential address"
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
                            label="Proposed Salary"
                            field="salary"
                            type="number"
                            value={formData.salary}
                            onChange={handleFieldChange}
                            error={errors.salary}
                            placeholder={formData.position === 'Manager' ? 'Min: 30000' : 'Enter amount'}
                        />

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
                            field="preferred_start_date"
                            type="date"
                            value={formData.preferred_start_date}
                            onChange={handleFieldChange}
                            required={true}
                        />

                        {formData.position === 'Secretary' && (
                            <div className="sm:col-span-2 space-y-2">
                                <FormField
                                    label="Typing Speed (WPM)"
                                    field="typing_speed"
                                    type="number"
                                    value={formData.typing_speed}
                                    onChange={handleFieldChange}
                                    error={errors.typing_speed || conditionalErrors.typing_speed}
                                    required={true}
                                    placeholder="e.g. 60"
                                />
                                <div className="text-xs">
                                    <a
                                        href="https://monkeytype.com/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                                    >
                                        Test your typing speed on Monkeytype
                                    </a>
                                </div>
                            </div>
                        )}
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

                <section>
                    <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Next of Kin (Optional)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            label="Next of Kin First Name"
                            field="nok_first_name"
                            value={formData.nok_first_name}
                            onChange={handleFieldChange}
                            error={errors.nok_first_name}
                            required={false}
                        />
                        <FormField
                            label="Next of Kin Last Name"
                            field="nok_last_name"
                            value={formData.nok_last_name}
                            onChange={handleFieldChange}
                            error={errors.nok_last_name}
                            required={false}
                        />
                        <FormField
                            label="Next of Kin Middle Name"
                            field="nok_middle_name"
                            value={formData.nok_middle_name}
                            onChange={handleFieldChange}
                            error={errors.nok_middle_name}
                            required={false}
                        />
                        <FormField
                            label="Next of Kin Suffix"
                            field="nok_suffixes"
                            value={formData.nok_suffixes}
                            onChange={handleFieldChange}
                            error={errors.nok_suffixes}
                            required={false}
                            placeholder="e.g. Jr., III"
                        />
                        <FormField
                            label="Relationship"
                            field="nok_relationship"
                            value={formData.nok_relationship}
                            onChange={handleFieldChange}
                            error={errors.nok_relationship}
                            required={false}
                        />
                        <FormField
                            label="Next of Kin Address"
                            field="nok_address"
                            value={formData.nok_address}
                            onChange={handleFieldChange}
                            error={errors.nok_address}
                            required={false}
                        />
                        <FormField
                            label="Next of Kin Telephone No."
                            field="nok_telephone_no"
                            value={formData.nok_telephone_no}
                            onChange={handleFieldChange}
                            error={errors.nok_telephone_no}
                            required={false}
                        />
                    </div>
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

    // Hydration Fix: Track client mounting
    const [isMounted, setIsMounted] = useState(false);

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

    const loadApplications = async () => {
        try {
            const data = await apiClient('/users/hiring-applications/');
            setApplications(normalizeList(data));
        } catch (error) {
            console.error('Failed to load hiring applications:', error);
            setLoadError('Unable to load hiring applications right now.');
        }
    };

    useEffect(() => {
        setIsMounted(true);
        let isMountedAPI = true;
        setIsLoading(true);
        setLoadError('');

        const loadBranches = apiClient('/branches/')
            .then((data) => {
                if (!isMountedAPI) return;
                setBranches(normalizeList(data));
            })
            .catch((error) => {
                console.error('Failed to load branches:', error);
                if (isMountedAPI) setLoadError('Unable to load branches right now.');
            });

        const loadManagers = isAdmin
            ? apiClient('/users/staff/')
                .then((data) => {
                    if (!isMountedAPI) return;
                    const managers = buildManagerOptions(normalizeList(data));
                    setManagerOptions(managers);
                })
                .catch((error) => {
                    console.error('Failed to load managers:', error);
                })
            : Promise.resolve();

        Promise.all([loadBranches, loadManagers, loadApplications()])
            .finally(() => {
                if (isMountedAPI) setIsLoading(false);
            });

        return () => { isMountedAPI = false; };
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

    const handleSaveApplication = async (payload, existing) => {
        setLoadError('');
        try {
            const method = existing?.id ? 'PATCH' : 'POST';
            const endpoint = existing?.id
                ? `/users/hiring-applications/${existing.id}/`
                : '/users/hiring-applications/';

            const { assigned_manager_name: _assignedManagerName, ...safePayload } = payload;
            const saved = await apiClient(endpoint, {
                method,
                body: safePayload
            });

            setApplications((prev) => {
                if (existing?.id) {
                    return prev.map((item) => item.id === existing.id ? saved : item);
                }
                return [saved, ...prev];
            });

            setIsFormOpen(false);
        } catch (error) {
            console.error('Failed to save hiring application:', error);
            setLoadError('Unable to save hiring application right now.');
        }
    };

    const updateApplicationStage = async (app, nextStage) => {
        try {
            // If advancing to "Hired" stage, pre-create the staff member to ensure correct salary (especially for Managers)
            if (nextStage === 'Hired') {
                try {
                    const hasNok = app.nok_first_name || app.nok_last_name || app.nok_telephone_no;
                    const nextOfKin = hasNok ? {
                        first_name: app.nok_first_name || '',
                        last_name: app.nok_last_name || '',
                        middle_name: app.nok_middle_name || '',
                        suffix: app.nok_suffixes || '',
                        relationship: app.nok_relationship || '',
                        address: app.nok_address || '',
                        telephone_no: app.nok_telephone_no || ''
                    } : null;

                    const staffPayload = {
                        email: app.email,
                        first_name: app.first_name,
                        last_name: app.last_name,
                        middle_name: app.middle_name || null,
                        suffixes: app.suffixes || null,
                        address: app.address,
                        telephone_no: app.telephone_no,
                        sex: app.sex,
                        dob: app.dob,
                        nin: app.nin,
                        position: app.position,
                        salary: app.position === 'Manager' ? 30000 : 0,
                        date_joined: app.preferred_start_date,
                        branch: typeof app.branch === 'object' ? app.branch.branch_no : app.branch,
                        typing_speed: app.position === 'Secretary' ? (app.typing_speed ? parseInt(app.typing_speed) : null) : null,
                        manager_start_date: app.position === 'Manager' ? app.preferred_start_date : null,
                        bonus_payment: null,
                        car_allowance: null,
                        supervisor: null,
                        password: "dreamhome2026"
                    };
                    if (nextOfKin) {
                        staffPayload.next_of_kin = nextOfKin;
                    }

                    await apiClient('/users/staff/', {
                        method: 'POST',
                        body: staffPayload
                    });
                } catch (staffError) {
                    console.log('Staff pre-creation note/error:', staffError);
                    // If the account already exists, we can proceed. Otherwise, rethrow to show the error
                    if (!staffError.message?.toLowerCase().includes('already exists')) {
                        throw staffError;
                    }
                }
            }

            const updated = await apiClient(`/users/hiring-applications/${app.id}/`, {
                method: 'PATCH',
                body: { stage: nextStage }
            });
            setApplications((prev) => prev.map((item) => item.id === app.id ? updated : item));
        } catch (error) {
            console.error('Failed to update hiring stage:', error);
            setLoadError(error.message || 'Unable to update hiring stage right now.'); // Show specific DB error if thrown
        }
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
                    {/* The isMounted check fixes the React hydration error */}
                    {isMounted && canCreateApplication && (
                        <Button variant="primary" onClick={handleOpenNew}>
                            + New Application
                        </Button>
                    )}
                </div>
            </div>

            {isMounted && isAdmin && (
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg p-4 text-sm">
                    Manager hiring is handled here by Admin. Managers handle supervisor, staff, and secretary roles per branch.
                </div>
            )}

            {isMounted && isManager && (
                <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-lg p-4 text-sm">
                    Your branch applications are locked to {branchCode || 'your branch'}. You can move supervisor, staff, and secretary hires through the pipeline.
                </div>
            )}

            {isMounted && !isAdmin && !isManager && (
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