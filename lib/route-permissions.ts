export const routePermissions: Record<string, string> = {
    // Inbound
    '/inbound': 'inbound_list',
    '/inbound/verification': 'inbound_verification',

    // Outbound
    '/outbound': 'outbound_list_request',
    '/outbound/verification': 'outbound_verification',

    // Stock
    '/stock/card': 'stock_card',
    '/stock/items': 'items',
    '/stock/items-stock': 'items_stock',

    // Purchase
    '/purchase': 'pr_list_input',
    '/purchase/manager-verification': 'pr_verification',
    '/purchase/purchasing-verification': 'po_verification',

    // Opname
    '/opname': 'opname_list',
    '/opname/schedule': 'opname_schedule',

    // Adjustment
    '/adjustment': 'adjustment_list_input',
    '/adjustment/verification': 'adjustment_verification',

    // Return
    '/return': 'return_list_input',
    '/return/verification': 'return_verification',

    // Billing
    '/billing': 'bill_list_input',
    '/billing/verification': 'bill_verification',
    '/billing/payment': 'payment_realization',
    '/billing/payment-validation': 'payment_validation',

    // Budget
    '/budget': 'rab_list',
    '/budget/input': 'rab_input',
    '/budget/verification': 'rab_verification',
    '/budget/realization': 'rab_realization',

    // Master
    '/master/category': 'categories_uom',
    '/master/items': 'items',
    '/master/vendor': 'vendors',
    '/master/mitra': 'partners_mitra_',
    '/master/users': 'users_roles',
};
