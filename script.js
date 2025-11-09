// ICD and CPT descriptions
const ICD_DESCRIPTIONS = {
  'F84.0': 'Autism Spectrum Disorder',
  'F82.0': 'Specific developmental disorder for motor function',
  'R27.9': 'Unspecified lack of coordination',
  'Z74.1': 'Need for assistance with personal care',
  'Z73.4': 'Inadequate social skills',
  // Add more ICD codes here
};

const CPT_DESCRIPTIONS = {
  97530: 'Therapeutic Activities',
  97535: 'Self-care training',
  97112: 'Neuromuscular re-education',
  97110: 'Therapeutic Exercises',
  // Add more CPT codes here
};

// Ensure download button exists
const downloadBtn = document.getElementById('downloadBtn');
if (!downloadBtn)
  throw new Error(
    'Download button not found. Add an element with id="downloadBtn"'
  );

// Helper: Load image as DataURL
async function loadImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Helper: Add new page if needed
function addPageIfNeeded(doc, y, margin, lineHeight = 14) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + lineHeight > pageHeight - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

// Download PDF
downloadBtn.addEventListener('click', async () => {
  const data = collectData(); // Make sure this function returns expected fields

  // Prompt for patient name if not set
  if (!data.patientName) {
    if (confirm('Patient name not set. PDF will omit the name. Set now?')) {
      const name = prompt("Enter patient's full name:", '');
      if (name !== null && name.trim()) {
        sessionStorage.setItem('patientName', name.trim());
        data.patientName = name.trim();
      }
    }
  }

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 40;
  let y = margin;
  const lineHeight = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - margin * 2;

  // Load logo (optional)
  let logoData = null;
  try {
    logoData = await loadImageAsDataURL('logo.png');
  } catch (e) {
    console.warn('Logo not loaded:', e);
  }

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  if (logoData) {
    const img = new Image();
    img.src = logoData;
    await new Promise((res) => (img.onload = res));
    const logoWidth = 80;
    const logoHeight = (img.naturalHeight / img.naturalWidth) * logoWidth;
    doc.addImage(logoData, 'PNG', margin, y, logoWidth, logoHeight);

    doc.setFontSize(12);
    doc.text(
      'Sensabilities Occupational Therapy',
      margin + logoWidth + 16,
      y + logoHeight / 2
    );
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'OT Session Note',
      margin + logoWidth + 16,
      y + logoHeight / 2 + 14
    );
    y += logoHeight + 10;
  } else {
    doc.text('Sensabilities Occupational Therapy', margin, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('OT Session Note', margin, y + 16);
    y += 36;
  }

  // Patient info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const infoPairs = [
    ['Patient:', data.patientName || '(not provided)'],
    ['DOB:', data.dob || ''],
    ['Age:', data.age || ''],
    ['Diagnosis:', data.diagnosis || ''],
    ['Date of Service:', data.dateService || ''],
    ['Location:', data.location || ''],
  ];
  let xOffset = margin;
  for (let [label, value] of infoPairs) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, xOffset, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, xOffset + label.length * 6, y); // Rough spacing
    if (label === 'Diagnosis:') y += lineHeight; // New line after some fields
    if (label === 'Location:') y += lineHeight + 8;
  }

  // Sections: SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN
  const sections = ['subjective', 'objectives', 'assessment', 'plan'];
  for (let section of sections) {
    if (section !== 'objectives') {
      doc.setFont('helvetica', 'bold');
      doc.text(section.toUpperCase(), margin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      const text = data[section] || '(none)';
      const wrapped = doc.splitTextToSize(text, usableWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * lineHeight + 8;
      y = addPageIfNeeded(doc, y, margin);
    } else {
      // OBJECTIVES table
      doc.setFont('helvetica', 'bold');
      doc.text('OBJECTIVE', margin, y);
      y += lineHeight;
      if (data.objectives && data.objectives.length) {
        data.objectives.forEach((row, i) => {
          if (!row.cpt && !row.notes) return;
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, y - 6, usableWidth, 18, 'F');
          doc.text(`Objective ${i + 1}`, margin + 4, y + 6);
          y += 20;

          doc.setFont('helvetica', 'bold');
          doc.text('CPT:', margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(
            row.cpt ? `${row.cpt}: ${CPT_DESCRIPTIONS[row.cpt] || ''}` : '( )',
            margin + 34,
            y
          );

          doc.setFont('helvetica', 'bold');
          doc.text('Units:', margin + 300, y);
          doc.setFont('helvetica', 'normal');
          doc.text(row.unit ? `x ${row.unit} unit(s)` : '( )', margin + 340, y);
          y += lineHeight;

          const noteWrapped = doc.splitTextToSize(
            row.notes || '(no notes)',
            usableWidth - 12
          );
          doc.text(noteWrapped, margin + 6, y);
          y += noteWrapped.length * lineHeight + 8;
          y = addPageIfNeeded(doc, y, margin);
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text('(none)', margin, y);
        y += lineHeight;
      }
    }
  }

  // ICD Codes
  doc.setFont('helvetica', 'bold');
  doc.text('ICD Codes:', margin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  if (data.icdCodes && data.icdCodes.length) {
    data.icdCodes.forEach((code) => {
      doc.text(
        `- ${code}: ${ICD_DESCRIPTIONS[code] || '(desc not found)'}`,
        margin + 10,
        y
      );
      y += lineHeight;
      y = addPageIfNeeded(doc, y, margin);
    });
  } else {
    doc.text('(none selected)', margin + 10, y);
    y += lineHeight;
  }

  // CPT Codes summary
  doc.setFont('helvetica', 'bold');
  doc.text('CPT Codes:', margin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  if (data.objectives && data.objectives.length) {
    data.objectives.forEach((row) => {
      if (!row.cpt) return;
      const unitText = row.unit ? `x ${row.unit} unit(s)` : '( )';
      doc.text(
        `- ${row.cpt}: ${
          CPT_DESCRIPTIONS[row.cpt] || '(desc not found)'
        } | ${unitText}`,
        margin + 10,
        y
      );
      y += lineHeight;
      y = addPageIfNeeded(doc, y, margin);
    });
  } else {
    doc.text('(none)', margin + 10, y);
    y += lineHeight;
  }

  // Total time & signature
  doc.setFont('helvetica', 'bold');
  doc.text('Total treatment time:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.totalTime || '(not set)', margin + 130, y);
  y += lineHeight + 6;
  doc.text(`Provider signature: ${data.signature || ''}`, margin, y);
  doc.text(`Date: ${data.signDate || ''}`, margin + 300, y);
  y += lineHeight;

  // Page number
  if (data.pageNum) {
    doc.text(data.pageNum, margin, doc.internal.pageSize.getHeight() - margin);
  }

  // Save PDF
  const safeName = (data.patientName || 'no_name').replace(
    /[^a-z0-9_\-]/gi,
    '_'
  );
  const now = new Date();
  const fileName = `OT_session_${safeName}_${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;
  doc.save(fileName);
});
