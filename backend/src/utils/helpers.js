import { query } from '../database/config/database.js';

export const generateHandle = async (name) => {
    // clean name → handle e.g. "John Doe" → "johndoe"
    let base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    if (!base) base = 'user';

    // check if handle exists, append number if it does
    let handle = base;
    let counter = 11;

    while (true) {
        const existing = await query(
            'SELECT id FROM users WHERE user_id = $1', [handle]
        );
        if (!existing.rows[0]) break;
        handle = `${base}${counter}`;
        counter++;
    }

    return handle;
};