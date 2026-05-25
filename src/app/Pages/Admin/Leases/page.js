'use client';

import React, { useState, useEffect } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout';
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { leaseValidators } from '@/lib/validator';
import { useRBAC } from '@/hooks/useRBAC';
import { useAuth } from '@/hooks/useAuth';

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

const getRenterLabel = (value) => {
    if (!value) return 'N/A';
    if (typeof value === 'object') {
        const fullName = `${value.first_name || ''} ${value.last_name || ''}`.trim();
        const renterId = value.client_no || value.id || 'N/A';
        return `${fullName || 'Unknown Renter'} (${renterId})`;
    }
    return value;
};

const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const amount = Number(value);
    if (Number.isNaN(amount)) return value;
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getStartDate = (lease) => lease?.rent_start || lease?.start_date || 'N/A';
const getEndDate = (lease) => lease?.rent_finish || lease?.end_date || 'N/A';

// --- Form Modal Component ---
function LeaseModal({ isOpen, onClose, onSuccess, itemToEdit, staffNo }) {
    const [properties, setProperties] = useState([]);
    const [renters, setRenters] = useState([]);
    const [viewings, setViewings] = useState([]); // ✅ Added viewings state
    const isEditMode = Boolean(itemToEdit?.lease_no);

    useEffect(() => {
        if (!isOpen) return;

        // ✅ FIX 1: When CREATING a lease, only show Available properties so staff
        // can't accidentally link a new lease to an already-Rented property.
        // When EDITING, show all properties so the current (now Rented) property
        // is still visible and selectable.
        const propertiesEndpoint = isEditMode
            ? '/properties/'
            : '/properties/?status=Available';

        Promise.all([
            apiClient(propertiesEndpoint).catch(err => {
                console.error("Failed to load properties:", err);
                return [];
            }),
            apiClient('/users/clients/?role=Renter').catch(err => {
                console.error("Failed to load renters:", err);
                return [];
            }),
            apiClient('/properties/viewings/').catch(err => {
                console.error("Failed to load viewings:", err);
                return [];
            })
        ])
            .then(([propData, renterData, viewingsData]) => {
                setProperties(normalizeList(propData));
                setRenters(normalizeList(renterData));

                // Keep only approved viewings for smart filtering
                const approvedViewings = normalizeList(viewingsData).filter(v => v.status === 'Approved');
                setViewings(approvedViewings);
            })
            .catch(err => console.error("Failed to load options:", err));
    }, [isOpen, isEditMode]);

    const { formData, errors, handleChange, validate, reset } = useForm({
        property: toId(itemToEdit?.property_no, 'property_no'),
        renter: toId(itemToEdit?.renter_no, 'client_no'),
        rent_start: itemToEdit?.rent_start || '',
        rent_finish: itemToEdit?.rent_finish || '',
        duration: itemToEdit?.duration || '',
        monthly_rent: itemToEdit?.monthly_rent || '',
        payment_method: itemToEdit?.payment_method || '',
        deposit: itemToEdit?.deposit || '',
        deposit_paid: itemToEdit?.deposit_paid || false
    }, leaseValidators);

    useEffect(() => {
        if (isOpen) reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemToEdit?.lease_no, isOpen]);

    // ✅ Smart Feature 1: Filter available properties and renters based on viewings
    const availableProperties = formData.renter
        ? properties.filter(p => viewings.some(v =>
            toId(v.renter_no, 'client_no') === formData.renter &&
            toId(v.property_no, 'property_no') === p.property_no
        ))
        : properties;

    const availableRenters = formData.property
        ? renters.filter(r => viewings.some(v =>
            toId(v.property_no, 'property_no') === formData.property &&
            toId(v.renter_no, 'client_no') === r.client_no
        ))
        : renters;

    // ✅ Smart Feature 2: Auto-fill rent when property changes
    const handlePropertyChange = (field, value) => {
        handleChange(field, value); // Standard handling

        if (field === 'property' && value) {
            const selectedProp = properties.find(p => p.property_no === value);
            if (selectedProp && selectedProp.monthly_rent) {
                // Instantly update the monthly rent field!
                handleChange('monthly_rent', selectedProp.monthly_rent);
            }
        }
    };

    const formatPayload = (data) => {
        const payload = { ...data };
        payload.duration = Number(payload.duration);
        payload.monthly_rent = Number(payload.monthly_rent);
        payload.deposit = Number(payload.deposit);
        payload.property_no = payload.property || null;
        payload.renter_no = payload.renter || null;
        // ✅ FIX 2: Automatically attach the logged-in staff member's ID so
        // the 'arranged by' field is always populated without manual input.
        if (staffNo) payload.staff_no = staffNo;
        delete payload.property;
        delete payload.renter;
        return payload;
    };

    return (
        <CrudFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            title={itemToEdit ? `Edit Lease ${itemToEdit.lease_no}` : "Create New Lease"}
            baseEndpoint="/leases"
            itemId={itemToEdit?.lease_no}
            formData={formData}
            validate={validate}
            transformPayload={formatPayload}
            submitLabel="Save Lease"
            updateLabel="Update Lease"
        >
            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Parties & Property
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    <FormField label="Property" field="property" type="select" value={formData.property} onChange={handlePropertyChange} error={errors.property}>
                        <option value="">— Select Property —</option>
                        {availableProperties.map(p => (
                            <option key={p.property_no} value={p.property_no}>
                                {getPropertyLabel(p)}
                            </option>
                        ))}
                    </FormField>
                    <FormField label="Renter" field="renter" type="select" value={formData.renter} onChange={handleChange} error={errors.renter}>
                        <option value="">— Select Renter —</option>
                        {availableRenters.map(r => (
                            <option key={r.client_no} value={r.client_no}>
                                {getRenterLabel(r)}
                            </option>
                        ))}
                    </FormField>
                </div>
            </section>

            <section className="mt-6">
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                    Lease Terms
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Start Date" field="rent_start" type="date" value={formData.rent_start} onChange={handleChange} error={errors.rent_start} />
                    <FormField label="End Date" field="rent_finish" type="date" value={formData.rent_finish} onChange={handleChange} error={errors.rent_finish} />
                    <FormField label="Duration (Months)" field="duration" type="number" value={formData.duration} onChange={handleChange} error={errors.duration} placeholder="e.g. 12" />
                </div>
            </section>

            <section className="mt-6">
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                    Financials
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Monthly Rent" field="monthly_rent" type="number" value={formData.monthly_rent} onChange={handleChange} error={errors.monthly_rent} placeholder="₱" />
                    <FormField label="Deposit Amount" field="deposit" type="number" value={formData.deposit} onChange={handleChange} error={errors.deposit} placeholder="₱" />
                    <FormField label="Payment Method" field="payment_method" type="select" value={formData.payment_method} onChange={handleChange} error={errors.payment_method}>
                        <option value="">— Select Method —</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Cheque">Cheque</option>
                    </FormField>
                </div>
                <div className="mt-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Deposit Status</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${formData.deposit_paid
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                                }`}>
                                {formData.deposit_paid ? 'Paid' : 'Pending'}
                            </span>
                            <span className="text-xs text-gray-500">
                                (Updates automatically based on completed ledger payments)
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </CrudFormModal>
    );
}

// --- Main Page Component ---
export default function LeaseAgreementsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const rbac = useRBAC();
    // ✅ FIX 2: Get the logged-in staff's ID from the auth context so we can
    // pass it down to the modal and auto-populate the staff_no in payloads.
    const { staffNo } = useAuth();

    const tableColumns = [
        {
            key: 'lease_no',
            label: 'Lease No',
            render: (value) => <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">{value}</span>
        },
        {
            key: 'property_no',
            label: 'Property',
            render: (value) => getPropertyLabel(value),
            exportValue: (row) => getPropertyLabel(row.property_no),
            searchValue: (row) => getPropertyLabel(row.property_no)
        },
        {
            key: 'renter_no',
            label: 'Renter',
            render: (value) => getRenterLabel(value),
            exportValue: (row) => getRenterLabel(row.renter_no),
            searchValue: (row) => getRenterLabel(row.renter_no)
        },
        {
            key: 'monthly_rent',
            label: 'Monthly Rent',
            render: (value) => formatCurrency(value),
            exportValue: (row) => formatCurrency(row.monthly_rent)
        },
        {
            key: 'deposit',
            label: 'Deposit',
            render: (value) => formatCurrency(value),
            exportValue: (row) => formatCurrency(row.deposit)
        },
        {
            key: 'change_balance',
            label: 'Change / Balance',
            render: (_, row) => {
                const rent = Number(row.monthly_rent || 0);
                const deposit = Number(row.deposit || 0);
                const diff = deposit - rent;
                if (diff === 0) return <span className="text-gray-500">—</span>;
                return (
                    <span className={`font-medium ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {diff < 0 ? 'Balance: ' : 'Change: '}{formatCurrency(Math.abs(diff))}
                    </span>
                );
            },
            exportValue: (row) => {
                const diff = Number(row.deposit || 0) - Number(row.monthly_rent || 0);
                if (diff === 0) return '0.00';
                return diff < 0 ? `Balance: ${Math.abs(diff)}` : `Change: ${Math.abs(diff)}`;
            }
        },
        {
            key: 'deposit_paid',
            label: 'Deposit Status',
            render: (value, row) => {
                const isPaid = Boolean(row.deposit_paid);
                const badgeClass = isPaid
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200';
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                        {isPaid ? 'Paid' : 'Pending'}
                    </span>
                );
            },
            exportValue: (row) => (row.deposit_paid ? 'Paid' : 'Pending')
        },
        {
            key: 'payment_method',
            label: 'Payment Method',
            render: (value) => value || 'N/A'
        },
        {
            key: 'duration',
            label: 'Duration',
            render: (value) => `${value || 'N/A'} month(s)`
        },
        {
            key: 'term',
            label: 'Term',
            render: (_, row) => `${getStartDate(row)} to ${getEndDate(row)}`,
            exportValue: (row) => `${getStartDate(row)} to ${getEndDate(row)}`
        }
    ];

    return (
        <CrudPageLayout
            title="Lease Agreements"
            subtitle="Generate and manage rental contracts between available properties and renter clients."
            addButtonLabel="+ Create Lease"
            endpoint="/leases/"
            keyField="lease_no"
            columns={tableColumns}
            searchQuery={searchQuery}
            searchKeys={['lease_no', 'property_no', 'renter_no', 'payment_method']}
            getDeleteModalItemName={(lease) => `Lease ${lease.lease_no || ''}`.trim()}
            rbac={rbac}
            nameKey="lease_no"
            dateKey="rent_start"
            sortNameLabel="Lease No"
            sortDateLabel="Start Date"
            pageSize={5}

            renderHeaderMiddle={() => (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search leases..."
                    className="w-full sm:max-w-sm"
                    size="md"
                />
            )}

            renderHeaderActions={(dataList) => (
                <ExportPDF
                    title="Lease Agreements"
                    subtitle="Rental contracts between available properties and renter clients."
                    fileName="leases"
                    columns={tableColumns}
                    data={dataList}
                    buttonLabel="Export PDF"
                    buttonVariant="secondary"
                    buttonSize="md"
                />
            )}

            // 🌟 Inject the Summary Cards dynamically based on the fetched data
            renderTopContent={(leases) => {
                const totalMonthlyRent = leases.reduce((accumulator, lease) => accumulator + (Number(lease.monthly_rent) || 0), 0);
                const depositPaid = leases.filter((lease) => Boolean(lease.deposit_paid)).length;
                const depositPending = leases.length - depositPaid;

                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total Leases</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{leases.length}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Portfolio Monthly Rent</p>
                            <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(totalMonthlyRent)}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Deposit Paid</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{depositPaid}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Deposit Pending</p>
                            <p className="text-2xl font-bold text-amber-700 mt-1">{depositPending}</p>
                        </div>
                    </div>
                );
            }}

            // Form Modal Injection
            renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => (
                <LeaseModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onSuccess={onSuccess}
                    itemToEdit={itemToEdit}
                    staffNo={staffNo}
                />
            )}
        />
    );
}
