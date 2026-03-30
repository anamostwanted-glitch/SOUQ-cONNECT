export const isAdmin = (profile: any) => profile?.role === 'admin';
export const isSupplier = (profile: any) => profile?.role === 'supplier';
export const isCustomer = (profile: any) => profile?.role === 'customer';
