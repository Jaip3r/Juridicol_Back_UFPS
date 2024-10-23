import * as XLSX from 'xlsx';

export function generateExcelReport(data: object[], columnWidths: object[]) {

    // Agregamos una hoja de trabajo con los datos recibidos
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Asignamos los anchos predefinidos a la hoja de trabajo
    worksheet['!cols'] = columnWidths;

    // Creamos un nuevo libro de excel
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitantes');

    // Generamos el archivo Excel en formato binario o buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return excelBuffer;

}