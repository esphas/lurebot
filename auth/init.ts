export default {
    roles: ['admin', 'moderator', 'trusted', 'user'],
    permissions: ['root', 'moderate', 'fetch', 'user_command', 'chat'],
    role_permissions: [
        {
            role: 'admin',
            permissions: ['root', 'moderate', 'fetch', 'user_command', 'chat'],
        },
        {
            role: 'moderator',
            permissions: ['moderate', 'fetch', 'user_command', 'chat'],
        },
        { role: 'trusted', permissions: ['fetch', 'user_command', 'chat'] },
        { role: 'user', permissions: ['chat'] },
    ],
} as const
