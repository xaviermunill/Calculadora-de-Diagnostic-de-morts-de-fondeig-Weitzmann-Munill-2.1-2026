import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { MortEvaluationRecord } from '../types';

export interface MapPdfExportOptions {
  mapElement: HTMLElement | null;
  records: MortEvaluationRecord[];
  sectorName: string;
  stats: {
    total: number;
    conservation: number;
    low: number;
    medium: number;
    high: number;
    notFound: number;
    totalWeightTonnes: number;
  };
}

export async function exportMapAndTableToPdf({
  mapElement,
  records,
  sectorName,
  stats,
}: MapPdfExportOptions): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  const todayStr = new Date().toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // PAGE 1: Official Header, Summary, Map Snapshot
  // Header bar
  doc.setFillColor(19, 78, 74); // #134E4A
  doc.rect(margin, margin, contentWidth, 1.5, 'F');

  // Subtitle / Protocol
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(61, 90, 69);
  doc.text(
    'PROTOCOL OFICIAL DE DIAGNOSI • RESTAURACIÓ D’HÀBITATS MARINS (v3.6)',
    margin,
    margin + 6
  );

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 107);
  doc.text('CONSERVACIÓ D’HÀBITATS SUBMARINS I PRADERIES DE POSIDONIA OCEANICA', margin, margin + 9.5);

  // Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(19, 78, 74);
  doc.text('PLÀNOL GEOREFERENCIAT I TAULA DE COORDENADES', margin, margin + 16);

  // Sector and date metadata badge
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 50, 45);
  doc.text(
    `Sector: ${sectorName.toUpperCase()} | Punts Fondeig: ${records.length} unitats | Formigó total: ${stats.totalWeightTonnes} t | Data: ${todayStr}`,
    margin,
    margin + 21
  );

  let currentY = margin + 25;

  // Capture Map element using html2canvas
  if (mapElement) {
    try {
      // Find and hide any floating cards temporarily or use ignoreElements
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: '#E9E9E0',
        ignoreElements: (el) => {
          return (
            el.classList.contains('leaflet-control-container') ||
            el.classList.contains('print:hidden') ||
            el.tagName.toLowerCase() === 'button'
          );
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgHeight = 110; // 110mm height for map on Page 1
      
      // Draw border box for map
      doc.setDrawColor(209, 209, 199);
      doc.setLineWidth(0.3);
      doc.rect(margin, currentY, contentWidth, imgHeight);

      // Add image
      doc.addImage(imgData, 'JPEG', margin, currentY, contentWidth, imgHeight);

      // Map attribution watermark
      doc.setFillColor(255, 255, 255);
      doc.rect(margin + 2, currentY + imgHeight - 6, 85, 4.5, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Sistema de Coordenades: WGS84 • Ortofotografia / Cartografia Marina', margin + 3.5, currentY + imgHeight - 3);

      currentY += imgHeight + 4;
    } catch (err) {
      console.error('Error capturing map snapshot:', err);
      // Draw a fallback box
      doc.setFillColor(245, 245, 240);
      doc.rect(margin, currentY, contentWidth, 30, 'F');
      doc.setFontSize(9);
      doc.setTextColor(19, 78, 74);
      doc.text('Mapa georeferenciat disponible en el visor interactiu.', margin + 10, currentY + 15);
      currentY += 34;
    }
  }

  // Summary Metrics Bar
  doc.setFillColor(245, 245, 240);
  doc.setDrawColor(209, 209, 199);
  doc.rect(margin, currentY, contentWidth, 14, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 78, 74);
  doc.text('RESUM DE CLASSIFICACIÓ I PRIORITATS:', margin + 3, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  
  // Legend boxes with colors
  let legendX = margin + 3;
  const legendY = currentY + 9.5;

  // Green: Conservar
  doc.setFillColor(21, 128, 61);
  doc.circle(legendX + 1.5, legendY - 1, 1.5, 'F');
  doc.setTextColor(20, 20, 20);
  doc.text(`Conservar: ${stats.conservation}`, legendX + 4.5, legendY);
  legendX += 34;

  // Blue: Baixa
  doc.setFillColor(2, 132, 199);
  doc.circle(legendX + 1.5, legendY - 1, 1.5, 'F');
  doc.text(`P. Baixa: ${stats.low}`, legendX + 4.5, legendY);
  legendX += 32;

  // Yellow: Mitjana
  doc.setFillColor(202, 138, 4);
  doc.circle(legendX + 1.5, legendY - 1, 1.5, 'F');
  doc.text(`P. Mitjana: ${stats.medium}`, legendX + 4.5, legendY);
  legendX += 34;

  // Red: Alta
  doc.setFillColor(220, 38, 38);
  doc.circle(legendX + 1.5, legendY - 1, 1.5, 'F');
  doc.text(`P. Alta: ${stats.high}`, legendX + 4.5, legendY);
  legendX += 30;

  // Orange: No localitzat
  if (stats.notFound > 0) {
    doc.setFillColor(217, 119, 6);
    doc.circle(legendX + 1.5, legendY - 1, 1.5, 'F');
    doc.text(`No Loc.: ${stats.notFound}`, legendX + 4.5, legendY);
  }

  currentY += 18;

  // Short guidance note on page 1
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 107);
  doc.text(
    'Aquest document inclou el plànol de situació i la taula detallada de coordenades per a les tasques de camp, dragatge i marcatge.',
    margin,
    currentY
  );

  // PAGE 2: Full Detailed Georeferenced Coordinates Table
  doc.addPage('a4', 'portrait');

  // Page 2 Header
  doc.setFillColor(19, 78, 74);
  doc.rect(margin, margin, contentWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(61, 90, 69);
  doc.text('PROTOCOL OFICIAL DE DIAGNOSI • INVENTARI DE MORTS I FONDEJOS (v3.6)', margin, margin + 6);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 78, 74);
  doc.text(`TAULA DE COORDENADES I ACTUACIONS - SECTOR: ${sectorName.toUpperCase()}`, margin, margin + 13);

  // Prepare table data
  const tableRows = records.map((r) => {
    const latStr = r.latitude ? r.latitude.toFixed(5) : 'N/D';
    const lngStr = r.longitude ? r.longitude.toFixed(5) : 'N/D';
    const coords = `${latStr}\n${lngStr}`;
    const depthStr = `-${r.depthM} m`;
    const weightStr = `${r.hydrodynamics?.weightAirKg || 0} kg\n(sub: ${r.hydrodynamics?.submergedWeightKg || 0} kg)`;
    const scoreStr = r.presenceStatus === 'not_found' ? 'Ø' : `${r.result.totalScore} pts`;
    const actionStr = r.result.recommendedAction.toUpperCase();
    const notes = r.result.mitigationAction || r.result.operationalRecommendation || '-';

    return [
      r.code,
      r.locationName,
      coords,
      depthStr,
      weightStr,
      scoreStr,
      actionStr,
      notes,
    ];
  });

  autoTable(doc, {
    startY: margin + 17,
    head: [[
      'Codi',
      'Localització',
      'Coordenades GPS',
      'Fondària',
      'Pes Aire (Subm.)',
      'Punts',
      'Dictamen',
      'Mesura Operativa / Mitigació',
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [19, 78, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 40, 35],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [247, 247, 244],
    },
    columnStyles: {
      0: { cellWidth: 15, fontStyle: 'bold' }, // Codi
      1: { cellWidth: 26 }, // Localitzacio
      2: { cellWidth: 26, font: 'courier' }, // Coords
      3: { cellWidth: 16, halign: 'center' }, // Fondaria
      4: { cellWidth: 24, halign: 'center' }, // Pes
      5: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }, // Punts
      6: { cellWidth: 25, fontStyle: 'bold' }, // Dictamen
      7: { cellWidth: 'auto' }, // Mesura
    },
    didParseCell: (data) => {
      // Color-code the Dictamen column
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw).toLowerCase();
        if (text.includes('conservar')) {
          data.cell.styles.textColor = [21, 128, 61]; // green
        } else if (text.includes('baixa')) {
          data.cell.styles.textColor = [2, 132, 199]; // blue
        } else if (text.includes('mitjana')) {
          data.cell.styles.textColor = [161, 98, 7]; // yellow/amber
        } else if (text.includes('alta') || text.includes('urgent')) {
          data.cell.styles.textColor = [220, 38, 38]; // red
        } else if (text.includes('no localitzat') || text.includes('soterrat')) {
          data.cell.styles.textColor = [217, 119, 6]; // orange
        }
      }
    },
    margin: { left: margin, right: margin, bottom: 28 },
  });

  // Add Official Signatures at the end of table
  // @ts-expect-error lastAutoTable is injected by jspdf-autotable
  const finalY = doc.lastAutoTable.finalY || 220;
  
  // Check if we need another page for signatures
  let signY = finalY + 10;
  if (signY > pageHeight - 35) {
    doc.addPage('a4', 'portrait');
    signY = margin + 15;
  }

  doc.setDrawColor(209, 209, 199);
  doc.setLineWidth(0.3);
  doc.line(margin, signY, pageWidth - margin, signY);

  signY += 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 78, 74);
  doc.text('CAP DE MISSIÓ / CARTÒGRAF RESPONSABLE', margin, signY);
  doc.text('VALIDACIÓ AUTORITAT DE RESERVES MARINES', margin + 95, signY);

  signY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Signatura i Segell d\'Inspecció:', margin, signY);
  doc.text('Segell Oficial de Validació:', margin + 95, signY);

  // Add Page numbering to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Pàgina ${i} de ${totalPages} • Plànol Oficial de Diagnosi de Morts • Sector: ${sectorName}`,
      margin,
      pageHeight - 8
    );
    doc.text(`Emès: ${todayStr}`, pageWidth - margin - 22, pageHeight - 8);
  }

  // Save the PDF
  const sanitizedSector = sectorName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const filename = `Planol_Diagnosi_Morts_${sanitizedSector}_${todayStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
