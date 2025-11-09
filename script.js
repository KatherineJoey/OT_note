// script.js - handles form behavior and PDF export
const { jsPDF } = window.jspdf;
const STORAGE_KEY = 'ot_session_patient_name';

// Elements
const patientHidden = document.getElementById('patientNameHidden');
const setNameBtn = document.getElementById('setNameBtn');
const clearNameBtn = document.getElementById('clearNameBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewBtn = document.getElementById('previewBtn');

// Name storage
(function loadName() {
  const v = sessionStorage.getItem(STORAGE_KEY);
  patientHidden.value = v || '';
})();

setNameBtn.addEventListener('click', () => {
  const cur = sessionStorage.getItem(STORAGE_KEY) || '';
  const name = prompt(
    "Enter patient's full name (private - stored in this browser session):",
    cur
  );
  if (name === null) return;
  const t = name.trim();
  if (t) {
    sessionStorage.setItem(STORAGE_KEY, t);
    patientHidden.value = t;
    alert('Patient name saved in this browser session.');
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
    patientHidden.value = '';
    alert('Patient name cleared.');
  }
});

clearNameBtn.addEventListener('click', () => {
  if (confirm('Clear stored patient name from this browser?')) {
    sessionStorage.removeItem(STORAGE_KEY);
    patientHidden.value = '';
    alert('Cleared.');
  }
});

// Collect form data
function collectData() {
  // objective rows
  const objRows = Array.from(document.querySelectorAll('.objective-row'));
  const objectives = objRows.map((row) => {
    const cpt = row.querySelector('.cptSelect').value || '';
    const unit = row.querySelector('.unitSelect').value || '';
    const notes = row.querySelector('.objNotes').value || '';
    return { cpt, unit, notes };
  });

  // ICD selections
  const icdSelects = Array.from(document.querySelectorAll('.icdSelect'))
    .map((s) => s.value)
    .filter((v) => v);

  return {
    patientName: patientHidden.value || '',
    dob: document.getElementById('dob').value,
    age: document.getElementById('age').value,
    diagnosis: document.getElementById('diagnosis').value,
    dateService: document.getElementById('dateService').value,
    provider: document.getElementById('provider').value,
    sessionDuration: document.getElementById('sessionDuration').value,
    credentials: document.getElementById('credentials').value,
    location: document.getElementById('location').value,
    subjective: document.getElementById('subjective').value,
    objectives: objectives,
    assessment: document.getElementById('assessment').value,
    plan: document.getElementById('plan').value,
    icdCodes: icdSelects,
    totalTime: document.getElementById('totalTime').value,
    signature: document.getElementById('signature').value,
    signDate: document.getElementById('signDate').value,
    pageNum: document.getElementById('pageNum').value,
  };
}

// small helper to load local image and convert to dataURL (returns Promise)
function loadImageAsDataURL(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Add page-break helper
function addPageIfNeeded(doc, y, margin) {
  if (y > doc.internal.pageSize.getHeight() - margin - 120) {
    doc.addPage();
    return margin;
  }
  return y;
}

// PDF generation
downloadBtn.addEventListener('click', async () => {
  const data = collectData();

  if (!data.patientName) {
    if (
      confirm(
        'Patient name not set. PDF will omit the name unless you set it now. Set it now?'
      )
    ) {
      const name = prompt("Enter patient's full name (private):", '');
      if (name === null) return;
      const t = name.trim();
      if (t) {
        sessionStorage.setItem(STORAGE_KEY, t);
        data.patientName = t;
      }
    }
  }

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 40;
  let y = margin;
  const lineHeight = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - margin * 2;

  // attempt to load logo (logo.png must be in same folder)
  let logoData = null;
  try {
    logoData = await loadImageAsDataURL('logo.png');
  } catch (e) {
    console.warn('Could not load logo.png for PDF header.', e);
  }

  // Header (logo + clinic name)
  if (logoData) {
    const tempImg = new Image();
    tempImg.src = logoData;
    const logoW = 80;
    const logoH =
      (80 * (tempImg.naturalHeight || 1)) / (tempImg.naturalWidth || 1);
    doc.addImage(logoData, 'PNG', margin, y, logoW, 50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Sensabilities Occupational Therapy', margin + 96, y + 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Occupational Therapy Services', margin + 96, y + 34);
  } else {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Sensabilities Occupational Therapy', margin, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Occupational Therapy Services', margin, y + 16);
  }
  y += 60;

  // Patient info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient: ', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.patientName || '(not provided)', margin + 48, y);
  y += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('DOB:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dob || '', margin + 34, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Age:', margin + 170, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.age || '', margin + 200, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Diagnosis:', margin + 300, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.diagnosis || '', margin + 360, y);

  y += lineHeight + 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Service:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateService || '', margin + 92, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Location:', margin + 220, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.location || '', margin + 280, y);

  y += lineHeight + 8;

  // SUBJECTIVE
  doc.setFont('helvetica', 'bold');
  doc.text('SUBJECTIVE', margin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  let wrapped = doc.splitTextToSize(data.subjective || '(none)', usableW);
  doc.text(wrapped, margin, y);
  y += wrapped.length * lineHeight + 8;
  y = addPageIfNeeded(doc, y, margin);

  // OBJECTIVE: each objective row with CPT + units + notes
  doc.setFont('helvetica', 'bold');
  doc.text('OBJECTIVE', margin, y);
  y += lineHeight;

  for (let i = 0; i < data.objectives.length; i++) {
    const row = data.objectives[i];
    if (!row.cpt && !row.notes) continue; // skip blank rows

    // colored mini-header for each objective
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 6, usableW, 18, 'F'); // light block as separator
    doc.setFont('helvetica', 'bold');
    doc.text(`Objective ${i + 1}`, margin + 4, y + 6);
    y += 20;

    // CPT and Units side by side
    doc.setFont('helvetica', 'bold');
    doc.text('CPT:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(row.cpt || '( )', margin + 30, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Units:', margin + 120, y);
    doc.setFont('helvetica', 'normal');
    doc.text(row.unit ? `x ${row.unit} unit(s)` : '( )', margin + 170, y);
    y += lineHeight;

    // notes below CPT + Units
    doc.setFont('helvetica', 'normal');
    const noteWrapped = doc.splitTextToSize(
      row.notes || '(no notes)',
      usableW - 12
    );
    doc.text(noteWrapped, margin + 6, y);
    y += noteWrapped.length * lineHeight + 8;

    y = addPageIfNeeded(doc, y, margin);
  }

  // ASSESSMENT
  doc.setFont('helvetica', 'bold');
  doc.text('ASSESSMENT', margin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  wrapped = doc.splitTextToSize(data.assessment || '(none)', usableW);
  doc.text(wrapped, margin, y);
  y += wrapped.length * lineHeight + 8;
  y = addPageIfNeeded(doc, y, margin);

  // PLAN
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN', margin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  wrapped = doc.splitTextToSize(data.plan || '(none)', usableW);
  doc.text(wrapped, margin, y);
  y += wrapped.length * lineHeight + 8;
  y = addPageIfNeeded(doc, y, margin);

  // ICD codes
  doc.setFont('helvetica', 'bold');
  doc.text('ICD Codes:', margin, y);
  y += lineHeight;
  doc.setFont('helvetica', 'normal');
  if (data.icdCodes.length) {
    data.icdCodes.forEach((code) => {
      doc.text('- ' + code, margin + 10, y);
      y += lineHeight;
      y = addPageIfNeeded(doc, y, margin);
    });
  } else {
    doc.text('(none selected)', margin + 10, y);
    y += lineHeight;
  }
  y += 6;

  // Total time and signature
  doc.setFont('helvetica', 'bold');
  doc.text('Total treatment time:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.totalTime || '(not set)', margin + 130, y);
  y += lineHeight + 6;
  doc.text(`Provider signature: ${data.signature || ''}`, margin, y);
  doc.text(`Date: ${data.signDate || ''}`, margin + 300, y);
  y += lineHeight;

  // page number
  if (data.pageNum) {
    doc.text(data.pageNum, margin, doc.internal.pageSize.getHeight() - margin);
  }

  // Save file
  const safe = (data.patientName || 'no_name').replace(/[^a-z0-9_\-]/gi, '_');
  const now = new Date();
  const fname = `OT_session_${safe}_${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;
  doc.save(fname);
});

// Preview button prints collected data (patient name masked)
previewBtn.addEventListener('click', () => {
  const d = collectData();
  const masked = d.patientName
    ? d.patientName.replace(/.(?=.{1,}$)/g, '*')
    : '(not set)';
  console.log('Preview (patient name masked):', masked, d);
  alert('Preview printed to console (open devtools).');
});
