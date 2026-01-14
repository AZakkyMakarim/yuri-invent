export interface AuthUser {
    id: string;
    supabaseId: string;
    email: string;
    name: string | null;
    roleId: string | null;
    role: {
        id: string;
        name: string;
        permissions: {
            id: string;
            name: string;
            module: string;
            action: string;
        }[];
    } | null;
    isActive: boolean;
}
