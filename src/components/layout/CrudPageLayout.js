'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '@/components/ui/DataTable';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import SortControls from '@/components/ui/Sorting';
import PaginationControls from '@/components/ui/pagination';
import { applySort, createSortHandler } from '@/components/functions/SortingFunc';
import { paginateData, getPageCount } from '@/components/functions/paginationfunc';
import apiClient from '@/lib/apiClient';
import Button from '@components/ui/Button';

export default function CrudPageLayout({
    title,
    subtitle,
    addButtonLabel,
    endpoint,
    keyField,
    columns,
    renderFormModal,
    getDeleteModalItemName,
    renderTopContent,
    renderHeaderActions,
    renderHeaderMiddle,
    // Advanced / optional
    fetchData,
    customActions,
    onRowClick,
    searchQuery,
    searchKeys,
    searchPredicate,
    // ── Sorting ──────────────────────────────────────────────────────────────
    // nameKey  – field key string OR array, e.g. 'name' or ['first_name','last_name']
    // dateKey  – field key for the date column, e.g. 'created_at' or 'date_joined'
    // Pass either (or both) to enable the matching sort button automatically.
    nameKey,
    dateKey,
    sortNameLabel,          // override sort button label for Name  (default: 'Name')
    sortDateLabel,          // override sort button label for Date  (default: 'Date Added')
    // ── Pagination ───────────────────────────────────────────────────────────
    // pageSize = 0 means no pagination (all records shown)
    pageSize = 0,
    // ── RBAC ─────────────────────────────────────────────────────────────────
    // Pass the object from useRBAC() to enable permission-based UI control.
    // If not provided, all actions are visible (backward-compatible).
    rbac,
}) {
    // ── Mounted guard — prevents SSR/client mismatch for RBAC-dependent UI
    // localStorage (where auth lives) only exists on the client. We must wait
    // until after mount before reading RBAC flags, otherwise the server renders
    // with default values (full access) and the client renders with real values
    // (restricted), causing React to throw a hydration mismatch error.
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    // ── RBAC defaults (full access when no rbac prop is passed) ───────────
    // Before mount: always fall back to the most restrictive safe defaults to
    // match what the server would render (no auth context available).
    const canCreate = mounted ? (rbac?.canCreate ?? true) : false;
    const canEdit   = mounted ? (rbac?.canEdit   ?? true) : false;
    const canDelete = mounted ? (rbac?.canDelete ?? true) : false;
    const filterByBranch = rbac?.filterByBranch ?? ((data) => data);

    // ── Data ──────────────────────────────────────────────────────────────────
    const [dataList, setDataList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Modals ────────────────────────────────────────────────────────────────
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // ── Sorting ───────────────────────────────────────────────────────────────
    const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
    const handleSort = createSortHandler(setSortConfig);

    // Only show sort controls when at least one key is provided
    const sortEnabled = nameKey !== undefined || dateKey !== undefined;

    // ── Pagination ────────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = fetchData ? await fetchData() : await apiClient(endpoint);
            setDataList(data?.results || data?.items || data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint]);

    // ── Branch-scoped data ────────────────────────────────────────────────────
    const scopedData = useMemo(() => filterByBranch(dataList), [dataList, filterByBranch]);

    // ── Sorted data ───────────────────────────────────────────────────────────
    const sortedData = useMemo(
        () => sortEnabled ? applySort(scopedData, sortConfig, nameKey, dateKey) : scopedData,
        [scopedData, sortConfig, sortEnabled, nameKey, dateKey]
    );

    // ── Paginated data ────────────────────────────────────────────────────────
    const pageCount = getPageCount(sortedData.length, pageSize);
    const pagedData = paginateData(sortedData, currentPage, pageSize);

    // Reset to page 1 whenever sort or data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [sortConfig, scopedData, pageSize]);

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleAddClick = () => { setItemToEdit(null); setIsFormOpen(true); };
    const handleEditClick = (item) => { setItemToEdit(item); setIsFormOpen(true); };
    const handleDeleteClick = (item) => { setItemToDelete(item); setIsDeleteOpen(true); };

    const renderActions = (row) => {
        // If the user has no edit or delete permission, show nothing
        if (!canEdit && !canDelete) return null;

        // For staff/secretary: only show Edit if the row is in their branch
        const rowInBranch = rbac?.isOwnBranch ? rbac.isOwnBranch(row) : true;

        return (
            <div className="flex justify-end gap-3">
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
    };

    const actionsToRender = customActions
        ? (row) => customActions(row, handleEditClick, handleDeleteClick)
        : renderActions;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">

            {/* ── Page header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                </div>
                {renderHeaderMiddle && (
                    <div className="w-full sm:flex-1 sm:flex sm:justify-end">
                        {renderHeaderMiddle(scopedData)}
                    </div>
                )}
                <div className="flex items-center gap-3">
                    {renderHeaderActions && renderHeaderActions(scopedData)}
                    {canCreate && (
                        <Button variant="primary" onClick={handleAddClick}>
                            {addButtonLabel}
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Optional top content (summary cards, etc.) ── */}
            {renderTopContent && renderTopContent(scopedData)}

            {/* ── Data table ── */}
            <DataTable
                columns={columns}
                data={pagedData}
                keyField={keyField}
                isLoading={isLoading}
                actions={actionsToRender}
                searchQuery={searchQuery}
                searchKeys={searchKeys}
                searchPredicate={searchPredicate}
                onRowClick={onRowClick}
            />

            {/* ── Sort controls + Pagination (side by side) ── */}
            {(sortEnabled || pageSize > 0) && (
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Sort buttons */}
                    <div>
                        {sortEnabled && (
                            <SortControls
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                nameLabel={sortNameLabel ?? (Array.isArray(nameKey) ? 'Name' : 'Name')}
                                dateLabel={sortDateLabel ?? (dateKey === 'date_joined' ? 'Date Joined' : 'Date Added')}
                            />
                        )}
                    </div>

                    {/* Right: Pagination */}
                    {pageSize > 0 && (
                        <PaginationControls
                            currentPage={currentPage}
                            pageCount={pageCount}
                            pageSize={pageSize}
                            totalItems={sortedData.length}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            )}

            {/* ── Form modal ── */}
            {renderFormModal && renderFormModal({
                isOpen: isFormOpen,
                onClose: () => setIsFormOpen(false),
                onSuccess: loadData,
                itemToEdit,
            })}

            {/* ── Delete modal ── */}
            {canDelete && (
                <ConfirmDeleteModal
                    isOpen={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    onSuccess={loadData}
                    endpoint={endpoint}
                    idToDelete={itemToDelete?.[keyField]}
                    itemName={itemToDelete && getDeleteModalItemName ? getDeleteModalItemName(itemToDelete) : ''}
                />
            )}
        </div>
    );
}