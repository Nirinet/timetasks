import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

/**
 * Export data to PDF with Hebrew support
 */
export function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string = 'report'
) {
  const doc = new jsPDF({ putOnlyUsedFonts: true })

  // Title
  doc.setFontSize(16)
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' })

  // Table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: {
      font: 'helvetica',
      fontSize: 10,
      halign: 'right',
    },
    headStyles: {
      fillColor: [33, 150, 243], // #2196F3
      halign: 'right',
    },
    theme: 'grid',
  })

  doc.save(`${filename}.pdf`)
}

/**
 * Export data to Excel (.xlsx)
 */
export function exportToExcel(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string = 'report'
) {
  const worksheetData = [headers, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Set RTL
  if (!worksheet['!cols']) worksheet['!cols'] = []
  headers.forEach((_, i) => {
    if (!worksheet['!cols']![i]) worksheet['!cols']![i] = {}
    worksheet['!cols']![i].wch = 20
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, title.substring(0, 31))
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Export data to CSV with BOM for Hebrew support
 */
export function exportToCSV(
  headers: string[],
  rows: (string | number)[][],
  filename: string = 'report'
) {
  const BOM = '\uFEFF' // UTF-8 BOM for Excel Hebrew support
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const str = String(cell)
        // Escape commas and quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
