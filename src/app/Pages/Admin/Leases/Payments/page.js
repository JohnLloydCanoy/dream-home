'use client';

import React, { useState, useEffect } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout';
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { paymentValidators } from '@/lib/validator';
import { useRBAC } from '@/hooks/useRBAC';

// --- Helper Functions ---
const normalizeList = (data) => data?.results || data?.items || data || [];
const toLeaseNo = (lease) => (typeof lease === 'object' ? lease?.lease_no || lease?.id : lease) || '';
const getRenterLabel = (renter) => typeof renter === 'object' ? `${renter.first_name || ''} ${renter.last_name || ''}`.trim() + ` (${renter.client_no || renter.id || 'N/A'})` : (renter || 'N/A');
const getPropertyLabel = (property) => typeof property === 'object' ? `${property.property_no || property.id} - ${[property.street, property.city].filter(Boolean).join(', ')}` : (property || 'N/A');
const formatCurrency = (value) => Number.isNaN(Number(value)) ? (value || 'N/A') : `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getPaymentLeaseNo = (payment) => toLeaseNo(payment?.lease);
const getLatestDate = (current, candidate) => (!candidate ? current : !current ? candidate : (candidate > current ? candidate : current));

// --- PaymentModal Component ---
function PaymentModal({ isOpen, onClose, onSuccess, preselectedLease, itemToEdit }) {
    const [leases, setLeases] = useState([]);

    useEffect(() => {
        if (!isOpen) return;

        apiClient('/leases/')
            .then(data => setLeases(normalizeList(data)))
            .catch(err => console.error("Failed to load leases:", err));
    }, [isOpen]);

    const { formData, errors, handleChange, validate, reset } = useForm({
        lease: itemToEdit ? toLeaseNo(itemToEdit.lease) : toLeaseNo(preselectedLease) || '',
        amount_paid: itemToEdit?.amount_paid || '',
        payment_date: itemToEdit?.payment_date || new Date().toISOString().split('T')[0],
        payment_method: itemToEdit?.payment_method || 'Cash'
    }, paymentValidators);

    useEffect(() => {
        if (isOpen) {
            reset();
            if (preselectedLease && !itemToEdit) {
                handleChange({ target: { name: 'lease', value: toLeaseNo(preselectedLease) } });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemToEdit?.payment_no, preselectedLease, isOpen]);

    const formatPayload = (data) => {
        const payload = { ...data };
        payload.amount_paid = Number(payload.amount_paid);
        return payload;
    };

    return (
        <CrudFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            title={itemToEdit ? `Edit Payment ${itemToEdit.payment_no || ''}` : "Log Payment"}
            baseEndpoint="/payments"
            itemId={itemToEdit?.payment_no}
            formData={formData}
            validate={validate}
            transformPayload={formatPayload}
            submitLabel="Save Payment"
            updateLabel="Update Payment"
        >
            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Payment Details
                </h3>
                <div className="space-y-4">
                    <FormField label="Lease" field="lease" type="select" value={formData.lease} onChange={handleChange} error={errors.lease}>
                        <option value="">— Select Lease —</option>
                        {leases.map(l => (
                            <option key={l.lease_no} value={l.lease_no}>
                                Lease {l.lease_no} - {getRenterLabel(l.renter_no)}
                            </option>
                        ))}
                    </FormField>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Amount Paid" field="amount_paid" type="number" value={formData.amount_paid} onChange={handleChange} error={errors.amount_paid} placeholder="₱" />
                        <FormField label="Payment Date" field="payment_date" type="date" value={formData.payment_date} onChange={handleChange} error={errors.payment_date} />
                    </div>

                    <FormField label="Payment Method" field="payment_method" type="select" value={formData.payment_method} onChange={handleChange} error={errors.payment_method}>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Cheque">Cheque</option>
                    </FormField>
                </div>
            </section>
        </CrudFormModal>
    );
}

// --- Main Component ---
export default function PaymentsBalancesPage() {
    const [selectedLease, setSelectedLease] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const rbac = useRBAC();

    // 🌟 Custom Fetch Logic: Merges Leases and Payments into one array for the table
    const fetchLedgerData = async () => {
        const [leaseData, paymentData] = await Promise.all([
            apiClient('/leases/').catch(err => {
                console.error('Failed to load leases:', err);
                return [];
            }),
            apiClient('/payments/').catch(err => {
                console.error('Failed to load payments:', err);
                return [];
            })
        ]);

        const leases = normalizeList(leaseData);
        const payments = normalizeList(paymentData);
        const paidByLease = {};

        payments.forEach((payment) => {
            const leaseNo = getPaymentLeaseNo(payment);
            if (!leaseNo) return;
            if (!paidByLease[leaseNo]) paidByLease[leaseNo] = { amountPaid: 0, paymentCount: 0, lastPaymentDate: null };
            
            paidByLease[leaseNo].amountPaid += Number(payment.amount_paid) || 0;
            paidByLease[leaseNo].paymentCount += 1;
            paidByLease[leaseNo].lastPaymentDate = getLatestDate(paidByLease[leaseNo].lastPaymentDate, payment.payment_date);
        });

        return leases.map((lease) => {
            const leaseNo = toLeaseNo(lease);
            const rentDue = Number(lease.monthly_rent) || 0;
            const leasePayment = paidByLease[leaseNo] || { amountPaid: 0, paymentCount: 0, lastPaymentDate: null };
            const outstanding = rentDue - leasePayment.amountPaid;

            return {
                ...lease,
                rent_due: rentDue,
                paid_so_far: leasePayment.amountPaid,
                outstanding_balance: outstanding > 0 ? outstanding : 0,
                payment_count: leasePayment.paymentCount,
                last_payment_date: leasePayment.lastPaymentDate || 'No payment yet'
            };
        });
    };

    const tableColumns = [
        { 
            key: 'lease_no', 
            label: 'Lease No', 
            render: (val) => <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">{val}</span> 
        },
        { 
            key: 'renter_no', 
            label: 'Renter', 
            render: getRenterLabel,
            exportValue: (row) => getRenterLabel(row.renter_no),
            searchValue: (row) => getRenterLabel(row.renter_no)
        },
        { 
            key: 'property_no', 
            label: 'Property', 
            render: getPropertyLabel,
            exportValue: (row) => getPropertyLabel(row.property_no),
            searchValue: (row) => getPropertyLabel(row.property_no)
        },
        { 
            key: 'rent_due', 
            label: 'Total Rent Due', 
            render: formatCurrency,
            exportValue: (row) => formatCurrency(row.rent_due)
        },
        { 
            key: 'paid_so_far', 
            label: 'Amount Paid So Far', 
            render: (val) => <span className="font-medium text-green-700">{formatCurrency(val)}</span>,
            exportValue: (row) => formatCurrency(row.paid_so_far)
        },
        { 
            key: 'outstanding_balance', 
            label: 'Balance', 
            render: (val) => <span className={`font-semibold ${val > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(val)}</span>,
            exportValue: (row) => formatCurrency(row.outstanding_balance)
        },
        { 
            key: 'last_payment_date', 
            label: 'Last Payment', 
            render: (val) => val || 'No payment yet' 
        }
    ];

    return (
        <CrudPageLayout
            title="Payments & Balances"
            subtitle="Log rental payments and monitor outstanding balances per lease agreement."
            addButtonLabel="+ Log Payment"
            keyField="lease_no"
            columns={tableColumns}
            fetchData={fetchLedgerData} // 👈 Pass our custom merger function
            onRowClick={setSelectedLease} // 👈 Tracks row selection for the banner
            searchQuery={searchQuery}
            searchKeys={['lease_no', 'renter_no', 'property_no']}
            rbac={rbac}
            nameKey="lease_no"
            dateKey="last_payment_date"
            sortNameLabel="Lease No"
            sortDateLabel="Last Payment"
            pageSize={5}
            
            renderHeaderMiddle={() => (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search leases & payments..."
                    className="w-full sm:max-w-sm"
                    size="md"
                />
            )}
            
            renderHeaderActions={(dataList) => (
                <ExportPDF
                    title="Payments & Balances"
                    subtitle="Rental payments and outstanding balances per lease agreement."
                    fileName="payments_balances"
                    columns={tableColumns}
                    data={dataList}
                    buttonLabel="Export PDF"
                    buttonVariant="secondary"
                    buttonSize="md"
                />
            )}

            // 🌟 Override standard Edit/Delete with custom "Log Payment" button
            customActions={(row, handleEditClick) => (
                <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLease(row); // Update our banner state
                        handleEditClick(row);  // Triggers the layout's modal state
                    }}
                >
                    Log Payment
                </button>
            )}

            // 🌟 Custom Top UI Grid & Selection Banner
            renderTopContent={(leaseBalances) => {
                const summary = {
                    totalRentDue: leaseBalances.reduce((sum, l) => sum + l.rent_due, 0),
                    totalPaid: leaseBalances.reduce((sum, l) => sum + l.paid_so_far, 0),
                    totalOutstanding: leaseBalances.reduce((sum, l) => sum + l.outstanding_balance, 0),
                };

                return (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Tracked Leases</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{leaseBalances.length}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total Rent Due</p>
                                <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(summary.totalRentDue)}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total Paid</p>
                                <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(summary.totalPaid)}</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Outstanding</p>
                                <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(summary.totalOutstanding)}</p>
                            </div>
                        </div>

                        {selectedLease && (
                            <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-sm mb-4">
                                Selected Lease: <strong>{selectedLease.lease_no}</strong> ({getRenterLabel(selectedLease.renter_no)})
                            </div>
                        )}
                    </>
                );
            }}

            // 🌟 Inject PaymentModal instead of a standard FormModal
            renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => {
                // If itemToEdit has lease_no, it's a Lease object passed from the table row click.
                // We don't want to edit the lease, we want to create a new Payment for it.
                const isLease = itemToEdit && 'lease_no' in itemToEdit && !('payment_no' in itemToEdit);
                const paymentToEdit = isLease ? null : itemToEdit;
                const leaseToPreselect = isLease ? itemToEdit : selectedLease;

                return (
                    <PaymentModal
                        isOpen={isOpen}
                        onClose={() => {
                            setSelectedLease(null);
                            onClose();
                        }}
                        onSuccess={onSuccess}
                        preselectedLease={leaseToPreselect}
                        itemToEdit={paymentToEdit}
                    />
                );
            }}
        />
    );
}