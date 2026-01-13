import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
    const variants: Record<BadgeVariant, string> = {
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        info: 'badge-info',
        neutral: 'badge-neutral',
    };

    return (
        <span className={cn('badge', variants[variant], className)}>{children}</span>
    );
}

// Status-specific badges for common use cases
export function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
        DRAFT: { label: 'Draft', variant: 'neutral' },
        PENDING: { label: 'Pending', variant: 'warning' },
        PENDING_MANAGER_APPROVAL: { label: 'Pending Manager', variant: 'warning' },
        PENDING_PURCHASING_APPROVAL: { label: 'Pending Purchasing', variant: 'warning' },
        PENDING_VERIFICATION: { label: 'Pending Verification', variant: 'warning' },
        APPROVED: { label: 'Approved', variant: 'success' },
        VERIFIED: { label: 'Verified', variant: 'success' },
        REJECTED: { label: 'Rejected', variant: 'danger' },
        COMPLETED: { label: 'Completed', variant: 'success' },
        CANCELLED: { label: 'Cancelled', variant: 'danger' },
        PARTIALLY_RECEIVED: { label: 'Partially Received', variant: 'info' },
        FULLY_RECEIVED: { label: 'Fully Received', variant: 'success' },
        SENT_TO_VENDOR: { label: 'Sent to Vendor', variant: 'info' },
    };

    const config = statusConfig[status] || { label: status, variant: 'neutral' as BadgeVariant };

    return <Badge variant={config.variant}>{config.label}</Badge>;
}
