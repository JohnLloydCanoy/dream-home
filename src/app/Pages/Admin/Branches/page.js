'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CrudPageLayout from '@/components/layout/CrudPageLayout';
import CrudFormModal from '@/components/layout/CrudFormModal';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';
import SearchBar from '@components/ui/SearchBar';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { branchValidators } from '@/lib/validator';
import { useRBAC } from '@/hooks/useRBAC';

// define the Form Modal right here in the same file!
function BranchModal({ isOpen, onClose, onSuccess, itemToEdit }) {
    const [staffList, setStaffList] = useState([]);
    // Fetch the manager dropdown options
    useEffect(() => {
        if (isOpen) {
            apiClient('/users/staff/')
                .then(data => setStaffList(data.results || data))
                .catch(err => console.error("Failed to load staff:", err));
        }
    }, [isOpen]);
    // Initialize Form State
    const { formData, errors, handleChange, validate, reset } = useForm({
        street: itemToEdit?.street || '',
        area: itemToEdit?.area || '',
        city: itemToEdit?.city || '',
        postcode: itemToEdit?.postcode || '',
        telephone_no: itemToEdit?.telephone_no || '',
        fax_no: itemToEdit?.fax_no || '',
        manager_no: (typeof itemToEdit?.manager_no === 'object' ? itemToEdit.manager_no?.staff_no : itemToEdit?.manager_no) || ''
    }, branchValidators);

    // Reset form when opening or changing items
    useEffect(() => {
        if (isOpen) reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemToEdit?.branch_no, isOpen]);

    // Format data before API submission
    const formatPayload = (data) => {
        if (!data.manager_no) data.manager_no = null;
        if (!data.fax_no) data.fax_no = null;
        return data;
    };
    return (
        <CrudFormModal
            isOpen={isOpen}
            onClose={onClose}
            onSuccess={onSuccess}
            title={itemToEdit ? `Edit Branch ${itemToEdit.branch_no}` : "Add New Branch"}
            baseEndpoint="/branches"
            itemId={itemToEdit?.branch_no}
            formData={formData}
            validate={validate}
            transformPayload={formatPayload}
            submitLabel="Save Branch"
            updateLabel="Update Branch"
        >
            {/* --- SECTION 1: LOCATION DETAILS --- */}
            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                    Location Details
                </h3>
                <div className="space-y-5">
                    <FormField label="Street Address" field="street" value={formData.street} onChange={handleChange} error={errors.street} placeholder="e.g. C.M. Recto Avenue" />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Barangay / Area" field="area" type="select" value={formData.area} onChange={handleChange} error={errors.area}>
                            <option value="">— Select Area —</option>
                            <option value="Carmen">Carmen</option>
                            <option value="Lapasan">Lapasan</option>
                            <option value="Macasandig">Macasandig</option>
                            <option value="Poblacion">Poblacion</option>
                            <option value="Lumbia">Lumbia</option>
                        </FormField>
                        <FormField label="City" field="city" value={formData.city} onChange={handleChange} error={errors.city} placeholder="Cagayan de Oro" />
                    </div>
                    <FormField label="Postcode" field="postcode" value={formData.postcode} onChange={handleChange} error={errors.postcode} placeholder="9000" className="w-1/2" />
                </div>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="bg-[#002147] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                    Contact & Management
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Telephone No." field="telephone_no" value={formData.telephone_no} onChange={handleChange} error={errors.telephone_no} placeholder="09..." />
                    <FormField label="Fax No." field="fax_no" value={formData.fax_no} onChange={handleChange} required={false} placeholder="Optional" />
                </div>
                <div className="mt-5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <FormField label="Branch Manager" field="manager_no" type="select" value={formData.manager_no} onChange={handleChange} required={false} labelClass="text-blue-900">
                        <option value="">— Unassigned —</option>
                        {staffList.map(s => (
                            <option key={s.staff_no} value={s.staff_no}>
                                {s.first_name} {s.last_name} ({s.staff_no})
                            </option>
                        ))}
                    </FormField>
                </div>
            </section>
        </CrudFormModal>
    );
}

export default function BranchesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const rbac = useRBAC();

    // Branch-specific RBAC: only ADMIN can mutate branches
    const branchRbac = useMemo(() => ({
        ...rbac,
        canCreate: rbac.canMutateBranches,
        canEdit: rbac.canMutateBranches,
        canDelete: rbac.canMutateBranches,
        // All roles that can see this page can view ALL branches (no branch filtering)
        filterByBranch: (data) => data,
    }), [rbac]);

    const buildBranchAddress = (row) => [row.street, row.area, row.city, row.postcode].filter(Boolean).join(', ');
    const getManagerName = (manager) => {
        if (!manager) return 'Unassigned';
        if (typeof manager === 'object') {
            const name = [manager.first_name, manager.last_name].filter(Boolean).join(' ');
            return name || manager.staff_no || 'Unassigned';
        }
        return manager;
    };

    const tableColumns = [
        {
            key: 'branch_no', label: 'Branch No.',
            render: (val) => <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{val}</span>
        },
        {
            key: 'address', label: 'Full Address',
            render: (val, row) => (
                <div className="text-xs text-gray-500">
                    <p className="text-gray-900 font-medium">{row.street}, {row.area}, {row.city}</p>
                    <p>{row.postcode}</p>
                </div>
            ),
            exportValue: (row) => buildBranchAddress(row)
        },
        { key: 'telephone_no', label: 'Telephone No.' },
        { key: 'fax_no', label: 'Fax No.' },
        {
            key: 'manager_no', label: 'Manager',
            render: (val) => (
                <span className={`text-sm ${val ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}`}>
                    {getManagerName(val)}
                </span>
            ),
            exportValue: (row) => getManagerName(row.manager_no)
        },
    ];

    return (
        <CrudPageLayout
            title="Branch Operations"
            subtitle="Manage DreamHome office locations and contact details."
            addButtonLabel="+ New Branch"
            endpoint="/branches/"
            keyField="branch_no"
            columns={tableColumns}
            searchQuery={searchQuery}
            searchKeys={['branch_no', 'street', 'area', 'city', 'postcode', 'telephone_no', 'manager_no']}
            getDeleteModalItemName={(branch) => `Branch ${branch.branch_no} - ${branch.area}`}
            rbac={branchRbac}
            nameKey="city"
            sortNameLabel="City"
            pageSize={5}
            renderHeaderMiddle={() => (
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search branches..."
                    className="w-full sm:max-w-sm"
                    size="md"
                />
            )}
            renderHeaderActions={(dataList) => (
                <ExportPDF
                    title="Branch Operations"
                    subtitle="DreamHome office locations and contact details."
                    fileName="branches"
                    columns={tableColumns}
                    data={dataList}
                    buttonLabel="Export PDF"
                    buttonVariant="secondary"
                    buttonSize="md"
                />
            )}
            // Render the local modal component defined above
            renderFormModal={({ isOpen, onClose, onSuccess, itemToEdit }) => (
                <BranchModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onSuccess={onSuccess}
                    itemToEdit={itemToEdit}
                />
            )}
        />
    );
}