export const isAdmin = (profile: any) => ['admin', 'manager', 'supervisor'].includes(profile?.role);
export const isSupplier = (profile: any) => profile?.role === 'supplier';
export const isCustomer = (profile: any) => profile?.role === 'customer';
