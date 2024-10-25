
export function buildWherePrismaClientClause (filters: any) {

    const whereClause = {};
    
    // Iteramos sobre las claves del objeto
    for (const [key, value] of Object.entries(filters)) {

        // Filtramos aquellas que solo tienen un valor
        if (value !== undefined && value !== null && value !== '') {

            if (typeof value === 'object' && !Array.isArray(value)) {

                // Si el valor es un objeto, llamamos recursivamente
                whereClause[key] = buildWherePrismaClientClause(value);

            }else {
                whereClause[key] = value;
            }

        }

    }

    return whereClause;

}