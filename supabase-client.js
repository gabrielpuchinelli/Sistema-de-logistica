(function () {
    const config = window.RMS_SUPABASE_CONFIG || {};
    const configured = Boolean(config.url && config.anonKey
        && !config.url.startsWith("COLE_") && !config.anonKey.startsWith("COLE_"));
    const client = configured
        ? window.supabase.createClient(config.url, config.anonKey)
        : null;
    const tables = {
        drivers: "drivers",
        routes: "routes",
        entradasGalpao: "warehouse_entries",
        recebimentos: "receipts"
    };
    let settingsSnapshot = null;
    const recordSnapshots = {};
    const privateDriverSnapshots = new Map();
    let writeQueue = Promise.resolve();

    function publicDriver(record) {
        const { cpf, cnh, endereco, email, pixTipo, pixChave, ...publicData } = record;
        return publicData;
    }

    async function getProfile() {
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (authError) throw authError;
        if (!user) return null;

        const { data: profile, error } = await client
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        if (error) throw error;
        return { user, role: profile.role };
    }

    async function loadState(defaults) {
        const results = await Promise.all([
            ...Object.entries(tables).map(([key, table]) =>
                client.from(table).select("payload").then(({ data, error }) => {
                    if (error) throw error;
                    return [key, (data || []).map((row) => row.payload)];
                })),
            client.from("app_settings").select("payload").eq("id", "system").single()
                .then(({ data, error }) => {
                    if (error) throw error;
                    return ["settings", data.payload];
                })
        ]);
        const loaded = Object.fromEntries(results);
        for (const key of Object.keys(tables)) {
            recordSnapshots[key] = new Map(
                loaded[key].map((record) => [record.id, JSON.stringify(key === "drivers" ? publicDriver(record) : record)])
            );
        }
        if (defaults.role === "admin") {
            const { data, error } = await client.from("driver_private").select("id, payload");
            if (error) throw error;
            const privateById = new Map((data || []).map((row) => [row.id, row.payload]));
            privateDriverSnapshots.clear();
            for (const [id, payload] of privateById) {
                privateDriverSnapshots.set(id, JSON.stringify(payload));
            }
            loaded.drivers = loaded.drivers.map((driver) => ({
                ...driver,
                ...(privateById.get(driver.id) || {})
            }));
        }
        settingsSnapshot = JSON.stringify(loaded.settings);
        return { ...defaults, ...loaded };
    }

    function saveState(state, role) {
        writeQueue = writeQueue.catch(() => {}).then(async () => {
            for (const [key, table] of Object.entries(tables)) {
                if (role === "operador" && ["routes", "entradasGalpao"].includes(key)) continue;
                const records = state[key] || [];
                const rows = records
                    .map((record) => ({
                        id: record.id,
                        payload: key === "drivers" ? publicDriver(record) : record,
                        ...(key === "entradasGalpao" ? { route_id: record.routeId || null } : {})
                    }))
                    .filter((row) => recordSnapshots[key].get(row.id) !== JSON.stringify(row.payload));
                if (rows.length) {
                    const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
                    if (error) throw error;
                    for (const row of rows) recordSnapshots[key].set(row.id, JSON.stringify(row.payload));
                }
                if (key === "drivers" && role === "admin" && records.length) {
                    const privateRows = records.map((record) => ({
                        id: record.id,
                        payload: {
                            cpf: record.cpf || "",
                            cnh: record.cnh || "",
                            endereco: record.endereco || "",
                            email: record.email || "",
                            pixTipo: record.pixTipo || "",
                            pixChave: record.pixChave || ""
                        }
                    })).filter((row) => privateDriverSnapshots.get(row.id) !== JSON.stringify(row.payload));
                    if (privateRows.length) {
                        const { error } = await client.from("driver_private").upsert(privateRows, { onConflict: "id" });
                        if (error) throw error;
                        for (const row of privateRows) privateDriverSnapshots.set(row.id, JSON.stringify(row.payload));
                    }
                }
            }

            const nextSettings = JSON.stringify(state.settings);
            if (role === "admin" && nextSettings !== settingsSnapshot) {
                const { error } = await client.from("app_settings").upsert(
                    { id: "system", payload: state.settings },
                    { onConflict: "id" }
                );
                if (error) throw error;
                settingsSnapshot = nextSettings;
            }
        });
        return writeQueue;
    }

    async function createRoute(route) {
        const { data, error } = await client.rpc("create_route", { p_route: route });
        if (error) throw error;
        recordSnapshots.routes.set(data.id, JSON.stringify(data));
        return data;
    }

    async function closeRoute(routeId, returned, discount) {
        const { data, error } = await client.rpc("close_route", {
            p_route_id: routeId,
            p_returned: returned,
            p_discount: discount
        });
        if (error) throw error;
        recordSnapshots.routes.set(data.route.id, JSON.stringify(data.route));
        if (data.warehouse_entry) {
            recordSnapshots.entradasGalpao.set(
                data.warehouse_entry.id,
                JSON.stringify(data.warehouse_entry)
            );
        }
        return data;
    }

    async function registerWarehouseEntry(entry) {
        const { data, error } = await client.rpc("register_warehouse_entry", { p_entry: entry });
        if (error) throw error;
        recordSnapshots.entradasGalpao.set(data.id, JSON.stringify(data));
        return data;
    }

    async function clearBusinessData() {
        for (const table of Object.values(tables)) {
            const { error } = await client.from(table).delete().not("id", "is", null);
            if (error) throw error;
        }
    }

    window.rmsSupabase = {
        configured,
        getSession: () => client.auth.getSession(),
        getProfile,
        signIn: (email, password) => client.auth.signInWithPassword({ email, password }),
        signOut: () => client.auth.signOut(),
        loadState,
        saveState,
        createRoute,
        closeRoute,
        registerWarehouseEntry,
        clearBusinessData
    };
})();