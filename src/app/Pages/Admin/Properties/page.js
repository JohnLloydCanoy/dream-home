'use client';

import React, { useEffect, useMemo, useState } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout';
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { propertyValidators } from '@/lib/validator';
import { useRBAC } from '@/hooks/useRBAC';

const normalizeList = (data) => data?.results || data?.items || data || [];

const toId = (value, idField) => {
    if (!value) return '';
    if (typeof value === 'object') return value[idField] || '';
    return value;
};

const getPersonName = (person) => `${person?.first_name || ''} ${person?.last_name || ''}`.trim();

const getPersonDisplay = (value, lookupMap, idField, fallbackName) => {
    if (!value) return { name: 'Unassigned', id: '' };
    if (typeof value === 'object') {
        const name = getPersonName(value);
        const id = value[idField] || '';
        if (!name && !id) return { name: 'Unassigned', id: '' };
        return { name: name || fallbackName, id };
    }

    const match = lookupMap?.get(value);
    if (match) {
        const name = getPersonName(match);
        const id = match[idField] || String(value);
        return { name: name || fallbackName, id };
    }

    return { name: fallbackName, id: String(value) };
};

const getBranchDisplay = (value, lookupMap) => {
    if (!value) return { name: 'Unassigned', id: '' };
    if (typeof value === 'object') {
        const name = value.area || value.street || 'Branch';
        const id = value.branch_no || '';
        return { name: name || 'Branch', id };
    }

    const match = lookupMap?.get(value);
    if (match) {
        const name = match.area || match.street || 'Branch';
        const id = match.branch_no || String(value);
        return { name: name || 'Branch', id };
    }

    return { name: 'Unknown Branch', id: String(value) };
};

const renderNameWithId = (name, id) => {
    const isUnassigned = name === 'Unassigned';
    return (
        <div className="flex flex-col gap-1">
            <span className={isUnassigned ? 'text-gray-400 italic' : 'text-gray-900 font-medium'}>
                {name}
            </span>
            {id ? <span className="text-xs text-gray-400">{id}</span> : null}
        </div>
    );
};

const getAddressLabel = (property) => {
    const lines = [property?.street, property?.area, property?.city, property?.postcode].filter(Boolean);
    return lines.join(', ') || 'N/A';
};

const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const amount = Number(value);
    if (Number.isNaN(amount)) return value;
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const propertyTypeOptions = [
    { value: 'House', label: 'House' },
    { value: 'Flat', label: 'Flat' }
];

const propertyStatusOptions = [
    { value: 'Pending Approval', label: 'Pending Approval' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Available', label: 'Available' },
    { value: 'Rented', label: 'Rented' },
    { value: 'Withdrawn', label: 'Withdrawn' }
];

function PropertyModal({ isOpen, onClose, onSuccess, itemToEdit }) {
    const [owners, setOwners] = useState([]);
    const [branches, setBranches] = useState([]);
    const [staffList, setStaffList] = useState([]);

    useEffect(() => {
        if (!isOpen) return;

        Promise.all([
            apiClient('/users/clients/?role=Owner').catch(err => {
                console.error('Failed to load owners:', err);
                return [];
            }),
            apiClient('/branches/').catch(err => {
                console.error('Failed to load branches:', err);
                return [];
            }),
            apiClient('/users/staff/').catch(err => {
                console.error('Failed to load staff list:', err);
                return [];
            })
        ])
            .then(([ownersData, branchData, staffData]) => {
                setOwners(normalizeList(ownersData));
                setBranches(normalizeList(branchData));
                setStaffList(normalizeList(staffData));
            })
            .catch((error) => console.error('Failed to load property form options:', error));
    }, [isOpen]);

    const { formData, errors, handleChange, validate, reset } = useForm({
        title: itemToEdit?.title || '',
        description: itemToEdit?.description || '',
        street: itemToEdit?.street || '',
        area: itemToEdit?.area || '',
        city: itemToEdit?.city || '',
        postcode: itemToEdit?.postcode || '',
        property_type: itemToEdit?.property_type || '',
        no_of_rooms: itemToEdit?.no_of_rooms || '',
        monthly_rent: itemToEdit?.monthly_rent || '',
        status: itemToEdit?.status || 'Pending Approval',
        owner: toId(itemToEdit?.owner_no || itemToEdit?.owner, 'client_no'),
        branch: toId(itemToEdit?.branch_no || itemToEdit?.branch, 'branch_no'),
        staff_no: toId(itemToEdit?.staff_no || itemToEdit?.staff, 'staff_no'),
        date_withdrawn: itemToEdit?.date_withdrawn || ''
    }, propertyValidators);

    useEffect(() => {
        if (isOpen) reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemToEdit?.property_no, isOpen]);

    const formatPayload = (data) => {
        const payload = { ...data };

        payload.title = payload.title?.trim() || 'A Property for Rent';
        payload.description = payload.description?.trim() || 'A Property';
        payload.no_of_rooms = payload.no_of_rooms ? Number(payload.no_of_rooms) : payload.no_of_rooms;
        payload.monthly_rent = payload.monthly_rent ? Number(payload.monthly_rent) : payload.monthly_rent;
        payload.owner_no = payload.owner || null;
        payload.branch_no = payload.branch || null;
        payload.staff_no = payload.staff_no || null;
        payload.date_withdrawn = payload.status === 'Withdrawn' ? (payload.date_withdrawn || null) : null;

        delete payload.owner;
        delete payload.branch;

        return payload;
    };

    return (
        <CrudFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            title={itemToEdit ? `Edit Property ${itemToEdit.property_no}` : 'Add New Property'}
            baseEndpoint="/properties"
            itemId={itemToEdit?.property_no}
            formData={formData}
            validate={validate}
            transformPayload={formatPayload}
            submitLabel="Save Property"
            updateLabel="Update Property"
        >
            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Listing Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Title" field="title" value={formData.title} onChange={handleChange} error={errors.title} className="col-span-2" />
                    <FormField label="Description" field="description" type="textarea" value={formData.description} onChange={handleChange} error={errors.description} className="col-span-2" />
                </div>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Property Location</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Street" field="street" value={formData.street} onChange={handleChange} error={errors.street} className="col-span-2" />
                    <FormField label="Barangay / Area" field="area" value={formData.area} onChange={handleChange} error={errors.area} />
                    <FormField label="City" field="city" value={formData.city} onChange={handleChange} error={errors.city} />
                    <FormField label="Postcode" field="postcode" value={formData.postcode} onChange={handleChange} error={errors.postcode} />
                </div>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Pricing & Status</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Property Type" field="property_type" type="select" value={formData.property_type} onChange={handleChange} error={errors.property_type}>
                        <option value="">— Select Type —</option>
                        {propertyTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </FormField>
                    <FormField label="Rooms" field="no_of_rooms" type="number" value={formData.no_of_rooms} onChange={handleChange} error={errors.no_of_rooms} />
                    <FormField label="Monthly Rent" field="monthly_rent" type="number" value={formData.monthly_rent} onChange={handleChange} error={errors.monthly_rent} />
                    <FormField label="Status" field="status" type="select" value={formData.status} onChange={handleChange} error={errors.status}>
                        {propertyStatusOptions.map((option) => {
                            const isRentedOption = option.value === 'Rented';
                            const isCurrentlyRented = itemToEdit?.status === 'Rented';
                            return (
                                <option
                                    key={option.value}
                                    value={option.value}
                                    disabled={isRentedOption && !isCurrentlyRented}
                                >
                                    {option.label} {isRentedOption && !isCurrentlyRented ? '(Requires Lease)' : ''}
                                </option>
                            );
                        })}
                    </FormField>
                    <FormField
                        label="Date Withdrawn"
                        field="date_withdrawn"
                        type="date"
                        value={formData.date_withdrawn}
                        onChange={handleChange}
                        required={false}
                        className="col-span-2"
                    />
                </div>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Assignments</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Owner" field="owner" type="select" value={formData.owner} onChange={handleChange} error={errors.owner}>
                        <option value="">— Select Owner —</option>
                        {owners.map((owner) => (
                            <option key={owner.client_no} value={owner.client_no}>
                                {owner.first_name} {owner.last_name} ({owner.client_no})
                            </option>
                        ))}
                    </FormField>
                    <FormField label="Branch" field="branch" type="select" value={formData.branch} onChange={handleChange} error={errors.branch}>
                        <option value="">— Select Branch —</option>
                        {branches.map((branch) => (
                            <option key={branch.branch_no} value={branch.branch_no}>
                                {branch.branch_no} - {branch.area}
                            </option>
                        ))}
                    </FormField>
                    <FormField label="Staff (Assigned)" field="staff_no" type="select" value={formData.staff_no} onChange={handleChange} required={false}>
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

export default function PropertiesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const rbac = useRBAC();
    const [owners, setOwners] = useState([]);
    const [branches, setBranches] = useState([]);
    const [staffList, setStaffList] = useState([]);

    useEffect(() => {
        let isActive = true;

        Promise.all([
            apiClient('/users/clients/?role=Owner').catch(err => {
                console.error('Failed to load owners:', err);
                return [];
            }),
            apiClient('/branches/').catch(err => {
                console.error('Failed to load branches:', err);
                return [];
            }),
            apiClient('/users/staff/').catch(err => {
                console.error('Failed to load staff list:', err);
                return [];
            })
        ])
            .then(([ownersData, branchData, staffData]) => {
                if (!isActive) return;
                setOwners(normalizeList(ownersData));
                setBranches(normalizeList(branchData));
                setStaffList(normalizeList(staffData));
            })
            .catch((error) => console.error('Failed to load property references:', error));

        return () => {
            isActive = false;
        };
    }, []);

    const ownersById = useMemo(() => new Map(owners.map((owner) => [owner.client_no, owner])), [owners]);
    const staffById = useMemo(() => new Map(staffList.map((staff) => [staff.staff_no, staff])), [staffList]);
    const branchesById = useMemo(() => new Map(branches.map((branch) => [branch.branch_no, branch])), [branches]);

    const tableColumns = [
        {
            key: 'property_no', label: 'Property ID',
            render: (val) => <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{val}</span>
        },
        {
            key: 'title', label: 'Listing',
            render: (val, row) => (
                <div className="text-xs text-gray-500">
                    <p className="text-gray-900 font-medium">{row.title || 'Untitled Property'}</p>
                    <p>{row.description || 'No description'}</p>
                </div>
            ),
            exportValue: (row) => [row.title || 'Untitled Property', row.description || 'No description'].join('\n'),
            searchValue: (row) => `${row.title || ''} ${row.description || ''}`.trim()
        },
        {
            key: 'address', label: 'Address',
            render: (_, row) => (
                <div className="text-xs text-gray-500">
                    <p className="text-gray-900 font-medium">{row.street}</p>
                    <p>{row.area ? `${row.area}, ` : ''}{row.city} {row.postcode}</p>
                </div>
            ),
            exportValue: (row) => getAddressLabel(row),
            searchValue: (row) => getAddressLabel(row)
        },
        { key: 'property_type', label: 'Type' },
        {
            key: 'no_of_rooms',
            label: 'Rooms',
            render: (val) => <span className="font-medium text-gray-900">{val}</span>
        },
        {
            key: 'monthly_rent',
            label: 'Monthly Rent',
            render: (value) => {
                const formatted = formatCurrency(value);
                return <span className="font-medium text-gray-900">₱{formatted}</span>;
            },
            exportValue: (row) => formatCurrency(row.monthly_rent)
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                const colors = {
                    'Pending Approval': 'bg-yellow-100 text-yellow-800',
                    'Rejected': 'bg-red-100 text-red-800',
                    'Available': 'bg-green-100 text-green-800',
                    'Rented': 'bg-blue-100 text-blue-800',
                    'Withdrawn': 'bg-orange-100 text-orange-800'
                };
                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
                        {value}
                    </span>
                );
            }
        },
        {
            key: 'owner_no',
            label: 'Owner',
            render: (_, row) => {
                const display = getPersonDisplay(row.owner_no || row.owner, ownersById, 'client_no', 'Unknown Owner');
                return renderNameWithId(display.name, display.id);
            },
            exportValue: (row) => {
                const display = getPersonDisplay(row.owner_no || row.owner, ownersById, 'client_no', 'Unknown Owner');
                return [display.name, display.id].filter(Boolean).join('\n');
            },
            searchValue: (row) => {
                const display = getPersonDisplay(row.owner_no || row.owner, ownersById, 'client_no', 'Unknown Owner');
                return `${display.name} ${display.id}`.trim();
            }
        },
        {
            key: 'staff_no',
            label: 'Staff',
            render: (_, row) => {
                const display = getPersonDisplay(row.staff_no || row.staff, staffById, 'staff_no', 'Unknown Staff');
                return renderNameWithId(display.name, display.id);
            },
            exportValue: (row) => {
                const display = getPersonDisplay(row.staff_no || row.staff, staffById, 'staff_no', 'Unknown Staff');
                return [display.name, display.id].filter(Boolean).join('\n');
            },
            searchValue: (row) => {
                const display = getPersonDisplay(row.staff_no || row.staff, staffById, 'staff_no', 'Unknown Staff');
                return `${display.name} ${display.id}`.trim();
            }
        },
        {
            key: 'branch_no',
            label: 'Branch',
            render: (_, row) => {
                const display = getBranchDisplay(row.branch_no || row.branch, branchesById);
                return renderNameWithId(display.name, display.id);
            },
            exportValue: (row) => {
                const display = getBranchDisplay(row.branch_no || row.branch, branchesById);
                return [display.name, display.id].filter(Boolean).join('\n');
            },
            searchValue: (row) => {
                const display = getBranchDisplay(row.branch_no || row.branch, branchesById);
                return `${display.name} ${display.id}`.trim();
            }
        },
        {
            key: 'date_withdrawn',
            label: 'Date Withdrawn',
            render: (value) => <span className="text-gray-700">{value || 'N/A'}</span>,
            exportValue: (row) => row.date_withdrawn || 'N/A',
            searchValue: (row) => row.date_withdrawn || ''
        }
    ];

    return (
        <CrudPageLayout
            title="Property Operations"
            subtitle="Manage DreamHome rental properties and listing assignments."
            addButtonLabel="+ New Property"
            endpoint="/properties/"
            keyField="property_no"
            columns={tableColumns}
            searchQuery={searchQuery}
            searchKeys={['property_no', 'title', 'address', 'property_type', 'no_of_rooms', 'monthly_rent', 'status', 'owner_no', 'staff_no', 'branch_no', 'date_withdrawn']}
            getDeleteModalItemName={(property) => `Property ${property.property_no} - ${property.area || ''}`.trim()}
            rbac={rbac}
            nameKey="title"
            dateKey="date_withdrawn"
            sortNameLabel="Title"
            sortDateLabel="Date Withdrawn"
            pageSize={5}
            renderHeaderMiddle={() => (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search properties..."
                    className="w-full sm:max-w-sm"
                    size="md"
                />
            )}
            renderHeaderActions={(dataList) => (
                <ExportPDF
                    title="Property Operations"
                    subtitle="DreamHome rental properties and listing assignments."
                    fileName="properties"
                    columns={tableColumns}
                    data={dataList}
                    buttonLabel="Export PDF"
                    buttonVariant="secondary"
                    buttonSize="md"
                />
            )}
            customActions={(row, handleEditClick, handleDeleteClick) => {
                const canEdit = rbac?.canEdit ?? true;
                const canDelete = rbac?.canDelete ?? true;
                const rowInBranch = rbac?.isOwnBranch ? rbac.isOwnBranch(row) : true;
                const isPending = row.status === 'Pending Approval';

                const handleApprove = async (e) => {
                    e.stopPropagation();
                    try {
                        await apiClient(`/properties/${row.property_no}/`, {
                            method: 'PATCH',
                            body: { status: 'Available' },
                        });
                        window.location.reload();
                    } catch (err) {
                        console.error('Failed to approve property:', err);
                        alert(err.message || 'Failed to approve property. Please try again.');
                    }
                };

                const handleReject = async (e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm(
                        `Reject property "${row.title || row.property_no}"?\n\nThe owner will see a "Rejected" status and can re-submit after making changes.`
                    );
                    if (!confirmed) return;
                    try {
                        await apiClient(`/properties/${row.property_no}/`, {
                            method: 'PATCH',
                            body: { status: 'Rejected' },
                        });
                        window.location.reload();
                    } catch (err) {
                        console.error('Failed to reject property:', err);
                        alert(err.message || 'Failed to reject property. Please try again.');
                    }
                };

                return (
                    <div className="flex justify-end gap-3">
                        {isPending && canEdit && rowInBranch && (
                            <>
                                <button
                                    onClick={handleApprove}
                                    className="text-green-600 hover:text-green-900 text-sm font-semibold"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="text-red-500 hover:text-red-800 text-sm font-semibold"
                                >
                                    Reject
                                </button>
                            </>
                        )}
                        {canEdit && rowInBranch && (
                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(row); }} className="text-blue-600 hover:text-blue-900 text-sm font-semibold">
                                Edit
                            </button>
                        )}
                        {canDelete && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }} className="text-red-600 hover:text-red-900 text-sm font-semibold">
                                Delete
                            </button>
                        )}
                    </div>
                );
            }}
            renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => (
                <PropertyModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onSuccess={onSuccess}
                    itemToEdit={itemToEdit}
                />
            )}
        />
    );
}