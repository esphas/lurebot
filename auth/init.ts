export default {
    roles: ['admin', 'moderator', 'trusted', 'user'],
    permissions: ['root', 'moderate', 'fetch', 'chat'],
    role_permissions: [
        { role: 'admin', permissions: ['root', 'moderate', 'fetch', 'chat'] },
        { role: 'moderator', permissions: ['moderate', 'fetch', 'chat'] },
        { role: 'trusted', permissions: ['fetch', 'chat'] },
        { role: 'user', permissions: ['chat'] },
    ],
} as const
