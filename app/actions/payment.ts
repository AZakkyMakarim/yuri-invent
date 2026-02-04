"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type PaymentRealizationResult = {
    success: boolean;
    error?: string;
    data?: any;
};

export async function submitPaymentRealization(
    prId: string,
    amount: number,
    proofUrl: string | null,
    notes: string | null,
    paymentDate: Date
): Promise<PaymentRealizationResult> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // 1. Validate PR exists and is in correct status
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: prId },
            include: { vendor: true }
        });

        if (!pr) {
            return { success: false, error: "Purchase Request not found" };
        }

        if (pr.status !== "WAITING_PAYMENT") {
            return { success: false, error: `Invalid status for payment: ${pr.status}` };
        }

        // 2. Update PR with payment info
        const updatedPR = await prisma.purchaseRequest.update({
            where: { id: prId },
            data: {
                paymentAmount: amount,
                paymentProofImage: proofUrl,
                financeNotes: notes,
                paymentDate: paymentDate,
                paymentRealizedById: user.id,
                status: "PAYMENT_RELEASED", // Ready for final purchasing verification (PO generation)
                updatedAt: new Date()
            }
        });

        revalidatePath("/purchase");
        revalidatePath(`/purchase/po/${prId}/print`);

        return { success: true, data: updatedPR };

    } catch (error: any) {
        console.error("Error submitting payment realization:", error);
        return { success: false, error: error.message || "Failed to submit payment" };
    }
}
