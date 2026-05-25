'use client';

import React, { useState, useEffect } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout';
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { advertisementValidators } from '@/lib/validator';
import { useRBAC } from '@/hooks/useRBAC';

// --- Helper Functions ---
const normalizeList = (data) => data?.results || data?.items || data || [];

const toId = (value, idField) => {
    if (!value) return '';
    if (typeof value === 'object') return value[idField] || '';
    return value;
};

const getPropertyLabel = (value) => {
    if (!value) return 'N/A';
    if (typeof value === 'object') {
        const propertyNo = value.property_no || value.id || 'N/A';
        const location = [value.street, value.city].filter(Boolean).join(', ');
        return location ? `${propertyNo} - ${location}` : `${propertyNo}`;
    }
    return value;
};

const getStaffLabel = (value) => {
    if (!value) return 'Unassigned';
    if (typeof value === 'object') {
        const fullName = `${value.first_name || ''} ${value.last_name || ''}`.trim();
        const staffId = value.staff_no || value.id || '';
        return fullName ? `${fullName} (${staffId})` : staffId;
    }
    return value;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
};

// --- Form Modal Component ---
function AdvertisementModal({ isOpen, onClose, onSuccess, itemToEdit }) {
    const [properties, setProperties] = useState([]);

    useEffect(() => {
        if (!isOpen) return;

        apiClient('/properties/')
            .then(data => setProperties(normalizeList(data)))
            .catch(err => console.error("Failed to load options:", err));
    }, [isOpen]);

    const { formData, errors, handleChange, validate, reset } = useForm({
        property_no: toId(itemToEdit?.property_no, 'property_no'),
        title: itemToEdit?.title || '',
        message: itemToEdit?.message || '',
        status: itemToEdit?.status || 'Draft',
        start_date: itemToEdit?.start_date || new Date().toISOString().split('T')[0],
        end_date: itemToEdit?.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: itemToEdit?.priority || 0,
        placement: itemToEdit?.placement || 'Popup'
    }, advertisementValidators);

    useEffect(() => {
        if (isOpen) reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemToEdit?.id, isOpen]);

    const formatPayload = (data) => {
        const payload = { ...data };
        payload.priority = Number(payload.priority);
        // Clean up empty foreign keys
        if (!payload.property_no) payload.property_no = null;
        return payload;
    };

    return (
        <CrudFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            title={itemToEdit ? `Edit Advertisement ${itemToEdit.id}` : "Create Advertisement"}
            baseEndpoint="/properties/adverts"
            itemId={itemToEdit?.id}
            formData={formData}
            validate={validate}
            transformPayload={formatPayload}
            submitLabel="Save Advertisement"
            updateLabel="Update Advertisement"
        >
            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Basic Information
                </h3>
                <div className="space-y-4">
                    <FormField label="Title" field="title" value={formData.title} onChange={handleChange} error={errors.title} placeholder="Advertisement Title" />
                    <FormField label="Message" field="message" type="textarea" value={formData.message} onChange={handleChange} error={errors.message} placeholder="Ad content..." />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Status" field="status" type="select" value={formData.status} onChange={handleChange} error={errors.status}>
                            <option value="Draft">Draft</option>
                            <option value="Active">Active</option>
                            <option value="Archived">Archived</option>
                        </FormField>
                        <FormField label="Placement" field="placement" type="select" value={formData.placement} onChange={handleChange} error={errors.placement}>
                            <option value="Popup">Popup</option>
                            <option value="Banner">Banner</option>
                            <option value="Section">Section</option>
                        </FormField>
                    </div>
                </div>
            </section>

            <section className="mt-6">
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                    Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Start Date" field="start_date" type="date" value={formData.start_date} onChange={handleChange} error={errors.start_date} />
                    <FormField label="End Date" field="end_date" type="date" value={formData.end_date} onChange={handleChange} error={errors.end_date} />
                    <FormField label="Priority" field="priority" type="number" value={formData.priority} onChange={handleChange} error={errors.priority} placeholder="0" />
                </div>
            </section>

            <section className="mt-6">
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                    Assignments
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    <FormField label="Target Property (Optional)" field="property_no" type="select" value={formData.property_no} onChange={handleChange} error={errors.property_no}>
                        <option value="">— General Ad (No Property) —</option>
                        {properties.map(p => (
                            <option key={p.property_no} value={p.property_no}>
                                {getPropertyLabel(p)}
                            </option>
                        ))}
                    </FormField>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">Note: Assigned By will automatically be set to your staff profile.</p>
            </section>
        </CrudFormModal>
    );
}

// --- Main Component ---
export default function AdvertisementPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const rbac = useRBAC();

    const tableColumns = [
        {
            key: 'id',
            label: 'ID',
            render: (val) => <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">{val}</span>
        },
        {
            key: 'title',
            label: 'Advertisement',
            render: (val, row) => (
                <div className="text-xs text-gray-500">
                    <p className="text-gray-900 font-medium">{val}</p>
                    <p className="truncate max-w-xs">{row.message}</p>
                </div>
            ),
            exportValue: (row) => `${row.title}\n${row.message}`,
            searchValue: (row) => `${row.title} ${row.message}`
        },
        {
            key: 'property_no',
            label: 'Property',
            render: (val) => getPropertyLabel(val),
            exportValue: (row) => getPropertyLabel(row.property_no),
            searchValue: (row) => getPropertyLabel(row.property_no)
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => {
                const colors = {
                    'Active': 'bg-green-100 text-green-800',
                    'Draft': 'bg-gray-100 text-gray-800',
                    'Archived': 'bg-orange-100 text-orange-800'
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${colors[val] || 'bg-gray-100 text-gray-800'}`}>
                        {val}
                    </span>
                );
            }
        },
        {
            key: 'placement',
            label: 'Placement',
            render: (val) => <span className="text-sm font-medium">{val}</span>
        },
        {
            key: 'duration',
            label: 'Duration',
            render: (_, row) => (
                <div className="text-xs text-gray-500">
                    {formatDate(row.start_date)} to {formatDate(row.end_date)}
                </div>
            ),
            exportValue: (row) => `${formatDate(row.start_date)} to ${formatDate(row.end_date)}`
        },
        {
            key: 'assigned_by',
            label: 'Assigned By',
            render: (val) => getStaffLabel(val),
            exportValue: (row) => getStaffLabel(row.assigned_by),
            searchValue: (row) => getStaffLabel(row.assigned_by)
        }
    ];

    return (
        <CrudPageLayout
            title="Advertisements"
            subtitle="Manage property marketing campaigns and generic system advertisements."
            addButtonLabel="+ New Ad"
            endpoint="/properties/adverts/"
            keyField="id"
            columns={tableColumns}
            searchQuery={searchQuery}
            searchKeys={['id', 'title', 'message', 'status', 'placement']}
            getDeleteModalItemName={(ad) => `Advertisement ${ad.id} - ${ad.title}`.trim()}
            rbac={rbac}
            nameKey="title"
            dateKey="start_date"
            sortNameLabel="Title"
            sortDateLabel="Start Date"
            pageSize={5}

            renderHeaderMiddle={() => (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search advertisements..."
                    className="w-full sm:max-w-sm"
                    size="md"
                />
            )}

            renderHeaderActions={(dataList) => (
                <ExportPDF
                    title="Advertisements Report"
                    subtitle="Current and historical marketing campaigns."
                    fileName="advertisements"
                    columns={tableColumns}
                    data={dataList}
                    buttonLabel="Export PDF"
                    buttonVariant="secondary"
                    buttonSize="md"
                />
            )}

            // 🌟 Inject the Summary Cards dynamically based on the fetched data
            renderTopContent={(ads) => {
                const activeAds = ads.filter(ad => ad.status === 'Active').length;
                const draftAds = ads.filter(ad => ad.status === 'Draft').length;
                const archivedAds = ads.filter(ad => ad.status === 'Archived').length;

                return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Active Campaigns</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{activeAds}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Drafts</p>
                            <p className="text-2xl font-bold text-gray-700 mt-1">{draftAds}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Archived</p>
                            <p className="text-2xl font-bold text-orange-700 mt-1">{archivedAds}</p>
                        </div>
                    </div>
                );
            }}

            // Form Modal Injection
            renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => (
                <AdvertisementModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onSuccess={onSuccess}
                    itemToEdit={itemToEdit}
                />
            )}
        />
    );
}
