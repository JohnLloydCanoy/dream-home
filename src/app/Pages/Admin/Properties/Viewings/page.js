'use client';

import React, { useEffect, useMemo, useState } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout';
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { viewingValidators } from '@/lib/validator';

const normalizeList = (data) => data?.results || data?.items || data || [];

const getViewingId = (viewing) => viewing?.id || viewing?.pk || viewing?.viewing_id || null;

const toId = (value, idField) => {
    if (!value) return '';
    if (typeof value === 'object') return value[idField] || '';
    return value;
};

const getPersonName = (person) => `${person?.first_name || ''} ${person?.last_name || ''}`.trim();

const getClientDisplay = (value, lookupMap) => {
    if (!value) return { name: 'N/A', id: '' };
    if (typeof value === 'object') {
        const name = getPersonName(value) || 'Unknown Client';
        const id = value.client_no || value.id || '';
        return { name, id };
    }

    const match = lookupMap?.get(value);
    if (match) {
        return { name: getPersonName(match) || 'Unknown Client', id: match.client_no || String(value) };
    }

    return { name: 'Unknown Client', id: String(value) };
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

const renderNameWithId = (name, id) => (
    <div className="flex flex-col gap-1">
        <span className="text-gray-900 font-medium">{name}</span>
        {id ? <span className="text-xs text-gray-400">{id}</span> : null}
    </div>
);

const getViewingDate = (row) => row.view_date || row.viewing_date || 'N/A';
const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
};

const viewingStatusOptions = [
    { value: 'Requested', label: 'Requested' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Cancelled', label: 'Cancelled' }
];

const getStatusBadge = (status) => {
    const colors = {
        Requested: 'bg-amber-100 text-amber-800',
        Approved: 'bg-green-100 text-green-800',
        Rejected: 'bg-red-100 text-red-800',
        Cancelled: 'bg-gray-100 text-gray-700'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
            {status || 'N/A'}
        </span>
    );
};

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

function ViewingModal({ isOpen, onClose, onSuccess, itemToEdit, properties, renters, staffById }) {
    const propertyOptions = React.useMemo(() => {
        const list = [...properties];
        const editProp = itemToEdit?.property_no || itemToEdit?.property;
        if (editProp) {
            const propId = typeof editProp === 'object' ? editProp.property_no : editProp;
            const exists = list.some(p => p.property_no === propId);
            if (!exists) {
                if (typeof editProp === 'object') {
                    list.push(editProp);
                } else {
                    list.push({ property_no: editProp, street: 'Property', city: editProp });
                }
            }
        }
        return list;
    }, [properties, itemToEdit]);

    const { formData, errors, handleChange, validate, reset } = useForm({
        property_no: toId(itemToEdit?.property_no || itemToEdit?.property, 'property_no'),
        renter_no: toId(itemToEdit?.renter_no || itemToEdit?.renter || itemToEdit?.client, 'client_no'),
        view_date: itemToEdit?.view_date || itemToEdit?.viewing_date || '',
        status: itemToEdit?.status || 'Requested',
        comments: itemToEdit?.comments || ''
    }, viewingValidators);

    useEffect(() => {
        if (isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemToEdit?.id, isOpen]);

    const formatPayload = (data) => {
        const payload = { ...data };
        payload.property_no = payload.property_no || null;
        payload.renter_no = payload.renter_no || null;
        payload.view_date = payload.view_date || null;
        payload.status = payload.status || 'Requested';
        payload.comments = payload.comments?.trim() || null;
        return payload;
    };

    const decisionDisplay = itemToEdit
        ? getStaffDisplay(itemToEdit.decided_by, staffById)
        : { name: 'Unassigned', id: '' };

    return (
        <CrudFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            title={itemToEdit ? `Edit Viewing ${getViewingId(itemToEdit) || ''}` : 'Record New Viewing'}
            baseEndpoint="/properties/viewings"
            itemId={getViewingId(itemToEdit)}
            formData={formData}
            validate={validate}
            transformPayload={formatPayload}
            submitLabel="Save Viewing"
            updateLabel="Update Viewing"
        >
            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Viewing Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Property" field="property_no" type="select" value={formData.property_no} onChange={handleChange} error={errors.property_no}>
                        <option value="">— Select Property —</option>
                        {propertyOptions.map((property) => (
                            <option key={property.property_no} value={property.property_no}>
                                {property.property_no} - {property.street}, {property.city}
                            </option>
                        ))}
                    </FormField>
                    <FormField label="Renter" field="renter_no" type="select" value={formData.renter_no} onChange={handleChange} error={errors.renter_no}>
                        <option value="">— Select Renter —</option>
                        {renters.map((renter) => (
                            <option key={renter.client_no} value={renter.client_no}>
                                {renter.first_name} {renter.last_name} ({renter.client_no})
                            </option>
                        ))}
                    </FormField>
                    <FormField label="Viewing Date" field="view_date" type="date" value={formData.view_date} onChange={handleChange} error={errors.view_date} />
                    <FormField label="Status" field="status" type="select" value={formData.status} onChange={handleChange} error={errors.status}>
                        {viewingStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </FormField>
                    <FormField label="Comments" field="comments" type="textarea" value={formData.comments} onChange={handleChange} required={false} className="col-span-2" />
                </div>
            </section>

            {itemToEdit && (
                <section>
                    <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Decision Info</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Decided By</span>
                            {renderNameWithId(decisionDisplay.name, decisionDisplay.id)}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Decided At</span>
                            <span className="text-gray-700">{formatDateTime(itemToEdit.decided_at)}</span>
                        </div>
                    </div>
                </section>
            )}
        </CrudFormModal>
    );
}

export default function PropertyViewingsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties] = useState([]);
    const [renters, setRenters] = useState([]);
    const [staffList, setStaffList] = useState([]);

    useEffect(() => {
        let isActive = true;

        Promise.all([
            apiClient('/properties/?status=Available').catch(err => {
                console.error('Failed to load properties:', err);
                return [];
            }),
            apiClient('/users/clients/?role=Renter').catch(err => {
                console.error('Failed to load renters:', err);
                return [];
            }),
            apiClient('/users/staff/').catch(err => {
                console.error('Failed to load staff list:', err);
                return [];
            })
        ])
            .then(([propertiesData, rentersData, staffData]) => {
                if (!isActive) return;
                setProperties(normalizeList(propertiesData));
                setRenters(normalizeList(rentersData));
                setStaffList(normalizeList(staffData));
            })
            .catch((error) => console.error('Failed to load viewing references:', error));

        return () => {
            isActive = false;
        };
    }, []);

    const propertiesById = useMemo(
        () => new Map(properties.map((property) => [property.property_no, property])),
        [properties]
    );
    const rentersById = useMemo(
        () => new Map(renters.map((renter) => [renter.client_no, renter])),
        [renters]
    );
    const staffById = useMemo(
        () => new Map(staffList.map((staff) => [staff.staff_no, staff])),
        [staffList]
    );

    const tableColumns = [
        {
            key: 'viewing_id',
            label: 'Viewing ID',
            render: (_, row) => (
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">
                    {getViewingId(row) || 'N/A'}
                </span>
            )
        },
        {
            key: 'property_no',
            label: 'Property',
            render: (value, row) => {
                const display = getPropertyDisplay(value || row.property, propertiesById);
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
            key: 'renter_no',
            label: 'Renter',
            render: (value, row) => {
                const display = getClientDisplay(value || row.renter || row.client, rentersById);
                return renderNameWithId(display.name, display.id);
            },
            exportValue: (row) => {
                const display = getClientDisplay(row.renter_no || row.renter || row.client, rentersById);
                return [display.name, display.id].filter(Boolean).join('\n');
            },
            searchValue: (row) => {
                const display = getClientDisplay(row.renter_no || row.renter || row.client, rentersById);
                return `${display.name} ${display.id}`.trim();
            }
        },
        {
            key: 'view_date',
            label: 'Viewing Date',
            render: (_, row) => <span className="text-gray-700">{getViewingDate(row)}</span>,
            exportValue: (row) => getViewingDate(row),
            searchValue: (row) => getViewingDate(row)
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => getStatusBadge(value),
            exportValue: (row) => row.status || 'N/A',
            searchValue: (row) => row.status || ''
        },
        {
            key: 'decided_by',
            label: 'Decided By',
            render: (value) => {
                const display = getStaffDisplay(value, staffById);
                return renderNameWithId(display.name, display.id);
            },
            exportValue: (row) => {
                const display = getStaffDisplay(row.decided_by, staffById);
                return [display.name, display.id].filter(Boolean).join('\n');
            },
            searchValue: (row) => {
                const display = getStaffDisplay(row.decided_by, staffById);
                return `${display.name} ${display.id}`.trim();
            }
        },
        {
            key: 'decided_at',
            label: 'Decided At',
            render: (value) => <span className="text-gray-700">{formatDateTime(value)}</span>,
            exportValue: (row) => formatDateTime(row.decided_at),
            searchValue: (row) => formatDateTime(row.decided_at)
        },
        {
            key: 'comments',
            label: 'Comments',
            render: (value) => {
                const text = value || '';
                if (!text) return 'No feedback';
                return text.length > 80 ? `${text.slice(0, 80)}...` : text;
            }
        }
    ];

    return (
        <CrudPageLayout
            title="Property Viewings"
            subtitle="Record and review client viewings with schedule and feedback details."
            addButtonLabel="+ Record New Viewing"
            endpoint="/properties/viewings/"
            keyField="id"
            columns={tableColumns}
            searchQuery={searchQuery}
            searchKeys={['id', 'property_no', 'renter_no', 'view_date', 'status', 'decided_by', 'decided_at', 'comments']}
            getDeleteModalItemName={(viewing) => `Viewing #${getViewingId(viewing) || 'N/A'}`}
            dateKey="view_date"
            sortDateLabel="Viewing Date"
            pageSize={5}
            renderHeaderMiddle={() => (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search viewings..."
                    className="w-full sm:max-w-sm"
                    size="md"
                />
            )}
            renderHeaderActions={(dataList) => (
                <ExportPDF
                    title="Property Viewings"
                    subtitle="Client viewings with schedule and feedback details."
                    fileName="property-viewings"
                    columns={tableColumns}
                    data={dataList}
                    buttonLabel="Export PDF"
                    buttonVariant="secondary"
                    buttonSize="md"
                />
            )}
            renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => (
                <ViewingModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onSuccess={onSuccess}
                    itemToEdit={itemToEdit}
                    properties={properties}
                    renters={renters}
                    staffById={staffById}
                />
            )}
        />
    );
}