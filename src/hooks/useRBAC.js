'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

// ─── Role hierarchy (higher index = more power) ──────────────────────
const ROLE_RANK = {
    Secretary: 0,
    Staff: 0,
    Supervisor: 1,
    Manager: 2,
    ADMIN: 3,
};

function rank(role) {
    return ROLE_RANK[role] ?? -1;
}

/**
 * Resolves the branch_no from a data row by walking relationships.
 *
 * Chain priority:
 *  1. row.branch_no / row.branch               (Staff, Property)
 *  2. row.property_no?.branch_no               (Lease, Advertisement via nested property)
 *  3. row.property?.branch_no                  (alternate key)
 *  4. row.lease?.property_no?.branch_no         (Payment → Lease → Property)
 *  5. row.registered_branch                     (Client)
 *
 * Each value can be a plain string (FK id) or a nested object.
 */
function resolveBranch(row) {
    if (!row) return null;

    // Helper: extract branch_no string from a value that may be object or string
    const extract = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return val.branch_no || val.id || null;
        return null;
    };

    // Direct branch field (Staff, Property)
    const directBranch = extract(row.branch_no) || extract(row.branch);
    if (directBranch) return directBranch;

    // Through property (Lease, Advertisement)
    const propObj = row.property_no || row.property;
    if (propObj && typeof propObj === 'object') {
        const propBranch = extract(propObj.branch_no) || extract(propObj.branch);
        if (propBranch) return propBranch;
    }

    // Through lease → property (Payment)
    const leaseObj = row.lease;
    if (leaseObj && typeof leaseObj === 'object') {
        const leaseProp = leaseObj.property_no || leaseObj.property;
        if (leaseProp && typeof leaseProp === 'object') {
            const lpBranch = extract(leaseProp.branch_no) || extract(leaseProp.branch);
            if (lpBranch) return lpBranch;
        }
    }

    // Client registered_branch
    const regBranch = extract(row.registered_branch);
    if (regBranch) return regBranch;

    return null;
}

/**
 * useRBAC() — returns permission flags + a data filter for branch scoping.
 *
 * Usage:
 *   const rbac = useRBAC();
 *   const filtered = rbac.filterByBranch(dataList);
 *   if (rbac.canCreate) { ... }
 */
export function useRBAC() {
    const { role, branchCode } = useAuth();

    return useMemo(() => {
        const r = rank(role);
        const isAdmin = role === 'ADMIN';
        const isManager = role === 'Manager';
        const isSupervisor = role === 'Supervisor';
        const isStaffOrSecretary = role === 'Staff' || role === 'Secretary';

        return {
            role,
            branchCode,

            // ── Capability flags ──────────────────────────────────────
            /** Can add new records? Admin + Manager + Supervisor */
            canCreate: isAdmin || isManager || isSupervisor,

            /** Can edit existing records? All staff (scoped to their branch) */
            canEdit: isAdmin || isManager || isSupervisor || isStaffOrSecretary,

            /** Can delete records? Admin only */
            canDelete: isAdmin,

            /** Pure read-only? (No one is purely read-only anymore, staff needs to update things) */
            isReadOnly: false,

            /** Is ADMIN? */
            isAdmin,

            /** Is at least Manager rank? */
            isManagerUp: r >= 2,

            // ── Branch Operations: View-only for non-admins ───────────
            /** Can create/edit/delete branches? Admin only */
            canMutateBranches: isAdmin,

            // ── Data Scoping ──────────────────────────────────────────
            /**
             * Filter an array of data rows to only those belonging to
             * the user's branch.  ADMIN sees everything.
             *
             * @param {Array} data — raw data from the API
             * @returns {Array}
             */
            filterByBranch: (data) => {
                if (!Array.isArray(data)) return [];
                if (isAdmin) return data;
                if (!branchCode) return data;   // safety: if no branch, show all

                return data.filter((row) => {
                    const rowBranch = resolveBranch(row);
                    // Hide data that has no branch assigned from branch-specific users.
                    // Only ADMINs can see unregistered data now.
                    if (!rowBranch) return false;
                    return rowBranch === branchCode;
                });
            },

            /**
             * Check if a specific row belongs to the user's branch.
             */
            isOwnBranch: (row) => {
                if (isAdmin) return true;
                if (!branchCode) return true;
                const rowBranch = resolveBranch(row);
                if (!rowBranch) return true;
                return rowBranch === branchCode;
            },
        };
    }, [role, branchCode]);
}
