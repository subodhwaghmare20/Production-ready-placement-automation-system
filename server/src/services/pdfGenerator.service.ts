/**
 * Pure Node.js Vector PDF Generator
 * Generates standard-compliant, professional PDF documents (PDF-1.4)
 * with multi-page table formatting, KPI summary boxes, and disclaimers.
 * No external native dependencies required.
 */

export interface PdfColumn {
  header: string;
  key: string;
  width: number; // percentage of table width (summing to 100) or pt
  align?: 'left' | 'center' | 'right';
}

export interface PdfSummaryBox {
  label: string;
  value: string | number;
  subtext?: string;
}

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  generatedBy?: string;
  summaryBoxes?: PdfSummaryBox[];
  columns: PdfColumn[];
  rows: Record<string, unknown>[];
  disclaimer?: string;
}

function escapePdfText(text: string | number | undefined | null): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  // Strip control chars, escape backslash and parentheses
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
}

export class PdfGeneratorService {
  /**
   * Generates a standard PDF Buffer
   */
  generateReport(options: PdfReportOptions): Buffer {
    const pageWidth = 612; // Standard Letter Width in pt
    const pageHeight = 792; // Standard Letter Height in pt
    const margin = 36;
    const contentWidth = pageWidth - margin * 2; // 540 pt

    // Calculate column widths in pt
    const totalColUnits = options.columns.reduce((sum, col) => sum + (col.width || 20), 0);
    const colWidths = options.columns.map((col) => (col.width / totalColUnits) * contentWidth);

    const rowsPerPage = 22;
    const totalPages = Math.max(1, Math.ceil(options.rows.length / rowsPerPage));

    const pagesStreamData: string[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      let stream = '';
      let currentY = pageHeight - margin;

      // Header on Page 1
      if (pageNum === 1) {
        // Document Title
        stream += 'BT\n';
        stream += '/F2 16 Tf\n';
        stream += '0.08 0.11 0.17 rg\n'; // #141c2b
        stream += `${margin} ${currentY - 16} Td\n`;
        stream += `(${escapePdfText(options.title)}) Tj\n`;
        stream += 'ET\n';
        currentY -= 24;

        // Subtitle & Generated Info
        stream += 'BT\n';
        stream += '/F1 8 Tf\n';
        stream += '0.39 0.45 0.55 rg\n'; // #64748b
        const sub = options.subtitle || 'Placement Candidate Management System • Confidential Report';
        const dateStr = `Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`;
        const genBy = options.generatedBy ? ` | By: ${options.generatedBy}` : '';
        stream += `${margin} ${currentY - 8} Td\n`;
        stream += `(${escapePdfText(`${sub} | ${dateStr}${genBy}`)}) Tj\n`;
        stream += 'ET\n';
        currentY -= 16;

        // Personal WhatsApp Assisted Mode Note Banner
        stream += '0.99 0.95 0.88 rg\n'; // Light amber background #fef3c7
        stream += `${margin} ${currentY - 20} ${contentWidth} 20 re\n`;
        stream += 'f\n';
        stream += '0.85 0.65 0.13 RG\n'; // Amber border
        stream += '0.5 w\n';
        stream += `${margin} ${currentY - 20} ${contentWidth} 20 re\n`;
        stream += 'S\n';

        const disclaimerText =
          options.disclaimer ||
          'Notice: WhatsApp delivery and read status cannot be independently verified in personal assisted mode.';
        stream += 'BT\n';
        stream += '/F2 7.5 Tf\n';
        stream += '0.57 0.35 0.04 rg\n'; // Dark amber text #92400e
        stream += `${margin + 8} ${currentY - 14} Td\n`;
        stream += `(${escapePdfText(disclaimerText)}) Tj\n`;
        stream += 'ET\n';
        currentY -= 28;

        // Summary Boxes if provided (up to 4 boxes)
        if (options.summaryBoxes && options.summaryBoxes.length > 0) {
          const boxes = options.summaryBoxes.slice(0, 5);
          const boxWidth = (contentWidth - (boxes.length - 1) * 8) / boxes.length;
          const boxHeight = 36;

          boxes.forEach((box, i) => {
            const boxX = margin + i * (boxWidth + 8);
            const boxY = currentY - boxHeight;

            // Box Background
            stream += '0.96 0.97 0.98 rg\n'; // #f1f5f9
            stream += `${boxX} ${boxY} ${boxWidth} ${boxHeight} re\n`;
            stream += 'f\n';
            // Border
            stream += '0.89 0.91 0.94 RG\n'; // #e2e8f0
            stream += '0.5 w\n';
            stream += `${boxX} ${boxY} ${boxWidth} ${boxHeight} re\n`;
            stream += 'S\n';

            // Value
            stream += 'BT\n';
            stream += '/F2 12 Tf\n';
            stream += '0.08 0.11 0.17 rg\n';
            stream += `${boxX + 6} ${boxY + 18} Td\n`;
            stream += `(${escapePdfText(box.value)}) Tj\n`;
            stream += 'ET\n';

            // Label
            stream += 'BT\n';
            stream += '/F1 6.5 Tf\n';
            stream += '0.39 0.45 0.55 rg\n';
            stream += `${boxX + 6} ${boxY + 6} Td\n`;
            stream += `(${escapePdfText(box.label.toUpperCase())}) Tj\n`;
            stream += 'ET\n';
          });

          currentY -= boxHeight + 14;
        }
      } else {
        // Subsequent page top margin
        currentY -= 10;
        // Running Header
        stream += 'BT\n';
        stream += '/F2 8 Tf\n';
        stream += '0.39 0.45 0.55 rg\n';
        stream += `${margin} ${currentY} Td\n`;
        stream += `(${escapePdfText(options.title)} - Continued) Tj\n`;
        stream += 'ET\n';
        currentY -= 16;
      }

      // Table Header Row
      const headerHeight = 18;
      stream += '0.12 0.16 0.23 rg\n'; // Slate-900 #1e293b
      stream += `${margin} ${currentY - headerHeight} ${contentWidth} ${headerHeight} re\n`;
      stream += 'f\n';

      // Header Text
      let headerX = margin;
      options.columns.forEach((col, idx) => {
        const colW = colWidths[idx];
        stream += 'BT\n';
        stream += '/F2 7.5 Tf\n';
        stream += '1 1 1 rg\n'; // White
        stream += `${headerX + 4} ${currentY - 12} Td\n`;
        stream += `(${escapePdfText(col.header.toUpperCase())}) Tj\n`;
        stream += 'ET\n';
        headerX += colW;
      });

      currentY -= headerHeight;

      // Table Data Rows
      const startIdx = (pageNum - 1) * rowsPerPage;
      const endIdx = Math.min(options.rows.length, pageNum * rowsPerPage);
      const pageRows = options.rows.slice(startIdx, endIdx);
      const rowHeight = 17;

      pageRows.forEach((row, rowIdx) => {
        const rowY = currentY - rowHeight;

        // Alternating Zebra Fill
        if (rowIdx % 2 === 1) {
          stream += '0.97 0.98 0.99 rg\n'; // #f8fafc
          stream += `${margin} ${rowY} ${contentWidth} ${rowHeight} re\n`;
          stream += 'f\n';
        }

        // Horizontal Grid Border
        stream += '0.91 0.93 0.95 RG\n'; // #e2e8f0
        stream += '0.4 w\n';
        stream += `${margin} ${rowY} m ${margin + contentWidth} ${rowY} l S\n`;

        // Cell Values
        let cellX = margin;
        options.columns.forEach((col, cIdx) => {
          const colW = colWidths[cIdx];
          const rawVal = row[col.key];
          let displayVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '-';

          // Truncate if too long to prevent overflowing cell
          const maxChars = Math.max(6, Math.floor(colW / 4.8));
          if (displayVal.length > maxChars) {
            displayVal = displayVal.substring(0, maxChars - 2) + '..';
          }

          stream += 'BT\n';
          stream += '/F1 7 Tf\n';
          stream += '0.15 0.20 0.28 rg\n'; // #243347
          stream += `${cellX + 4} ${rowY + 5} Td\n`;
          stream += `(${escapePdfText(displayVal)}) Tj\n`;
          stream += 'ET\n';

          cellX += colW;
        });

        currentY -= rowHeight;
      });

      // Bottom border for table
      stream += '0.80 0.84 0.88 RG\n';
      stream += '0.5 w\n';
      stream += `${margin} ${currentY} m ${margin + contentWidth} ${currentY} l S\n`;

      // Page Footer
      const footerY = 24;
      stream += '0.89 0.91 0.94 RG\n';
      stream += '0.5 w\n';
      stream += `${margin} ${footerY + 12} m ${margin + contentWidth} ${footerY + 12} l S\n`;

      // Footer text Left
      stream += 'BT\n';
      stream += '/F1 6.5 Tf\n';
      stream += '0.45 0.50 0.58 rg\n';
      stream += `${margin} ${footerY + 2} Td\n`;
      stream += `(${escapePdfText('Placement Automation System • Official Audit Report • Confidential')}) Tj\n`;
      stream += 'ET\n';

      // Footer text Right (Page X of Y)
      stream += 'BT\n';
      stream += '/F1 6.5 Tf\n';
      stream += '0.45 0.50 0.58 rg\n';
      stream += `${pageWidth - margin - 50} ${footerY + 2} Td\n`;
      stream += `(${escapePdfText(`Page ${pageNum} of ${totalPages}`)}) Tj\n`;
      stream += 'ET\n';

      pagesStreamData.push(stream);
    }

    // Assemble PDF-1.4 binary structure
    return this.buildPdfDocument(pagesStreamData, pageWidth, pageHeight);
  }

  /**
   * Internal PDF assembly
   */
  private buildPdfDocument(
    pagesStreams: string[],
    pageWidth: number,
    pageHeight: number
  ): Buffer {
    const numPages = pagesStreams.length;
    // Objects:
    // 1: Catalog
    // 2: Pages root
    // 3: Font Helvetica (F1)
    // 4: Font Helvetica-Bold (F2)
    // 5 .. (4 + numPages): Page objects
    // (5 + numPages) .. (4 + 2*numPages): Stream objects
    const f1Obj = 3;
    const f2Obj = 4;
    const firstPageObj = 5;
    const firstStreamObj = 5 + numPages;
    const totalObjects = 4 + 2 * numPages;

    const objects: string[] = [];
    const offsets: number[] = [];

    let body = '%PDF-1.4\n%âãÏÓ\n';

    // Helper to add object
    const addObject = (objNum: number, content: string) => {
      offsets[objNum] = Buffer.byteLength(body, 'latin1');
      body += `${objNum} 0 obj\n${content}\nendobj\n`;
    };

    // 1 0 obj: Catalog
    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');

    // 2 0 obj: Pages
    const kids = Array.from({ length: numPages }, (_, i) => `${firstPageObj + i} 0 R`).join(' ');
    addObject(2, `<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>`);

    // 3 0 obj: F1 Helvetica
    addObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

    // 4 0 obj: F2 Helvetica-Bold
    addObject(
      4,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
    );

    // Page objects & Stream objects
    for (let i = 0; i < numPages; i++) {
      const pageObjNum = firstPageObj + i;
      const streamObjNum = firstStreamObj + i;
      const streamContent = pagesStreams[i];
      const streamLength = Buffer.byteLength(streamContent, 'latin1');

      // Page object
      addObject(
        pageObjNum,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamObjNum} 0 R /Resources << /Font << /F1 ${f1Obj} 0 R /F2 ${f2Obj} 0 R >> >> >>`
      );
    }

    for (let i = 0; i < numPages; i++) {
      const streamObjNum = firstStreamObj + i;
      const streamContent = pagesStreams[i];
      const streamLength = Buffer.byteLength(streamContent, 'latin1');

      // Stream object
      addObject(streamObjNum, `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`);
    }

    // Cross-Reference Table
    const xrefOffset = Buffer.byteLength(body, 'latin1');
    let xref = 'xref\n';
    xref += `0 ${totalObjects + 1}\n`;
    xref += '0000000000 65535 f \n';

    for (let i = 1; i <= totalObjects; i++) {
      const off = offsets[i] || 0;
      xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    }

    xref += 'trailer\n';
    xref += `<< /Size ${totalObjects + 1} /Root 1 0 R >>\n`;
    xref += 'startxref\n';
    xref += `${xrefOffset}\n`;
    xref += '%%EOF\n';

    body += xref;

    return Buffer.from(body, 'latin1');
  }
}

export const pdfGeneratorService = new PdfGeneratorService();
