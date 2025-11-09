// script.js - handles form behavior and PDF export
const { jsPDF } = window.jspdf;
const STORAGE_KEY = 'ot_session_patient_name';

// Elements
const patientHidden = document.getElementById('patientNameHidden');
const setNameBtn = document.getElementById('setNameBtn');
const clearNameBtn = document.getElementById('clearNameBtn');
const downloadBtn = document.getElementById('downloadBtn');
const previewBtn = document.getElementById('previewBtn');

// CPT & ICD descriptions
const CPT_DESCRIPTIONS = {
  97530: 'Therapeutic Activities',
  97535: 'Self-care training',
  97112: 'Neuromuscular re-education',
  97110: 'Therapeutic Exercises',
  // add more CPT codes as needed
};

const ICD_DESCRIPTIONS = {
  'F84.0': 'Autism Spectrum Disorder',
  'F82.0': 'Specific developmental disorder for motor function',
  'R27.9': 'Unspecified lack of coordination',
  'Z74.1': 'Need for assistance with personal care',
  'Z73.4': 'Inadequate social skills',
  // add more ICD codes as needed
};

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
  const objRows = Array.from(document.querySelectorAll('.objective-row'));
  const objectives = objRows.map((row) => {
    const cpt = row.querySelector('.cptSelect').value || '';
    const unit = row.querySelector('.unitSelect').value || '';
    const notes = row.querySelector('.objNotes').value || '';
    return { cpt, unit, notes };
  });

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

// Load image as data URL
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

// Page break helper
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

  // Load logo
  let logoData = null;
  try {
    logoData = await loadImageAsDataURL('logo.png');
  } catch (e) {
    console.warn('Could not load logo.png', e);
  }

  // Header
  if (logoData) {
    const img = new Image();
    img.src = logoData;
    await new Promise((res) => (img.onload = res));
    const logoW = 80;
    const logoH = (img.naturalHeight / img.naturalWidth) * logoW;
    doc.addImage(logoData, 'PNG', margin, y, logoW, logoH);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Sensabilities Occupational Therapy', margin + logoW + 16, y + 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Occupational Therapy Services', margin + logoW + 16, y + 34);
    y += logoH + 10;
  } else {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Sensabilities Occupational Therapy', margin, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Occupational Therapy Services', margin, y + 16);
    y += 40;
  }

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

  // OBJECTIVE
  doc.setFont('helvetica', 'bold');
  doc.text('OBJECTIVE', margin, y);
  y += lineHeight;

  for (let i = 0; i < data.objectives.length; i++) {
    const row = data.objectives[i];
    if (!row.cpt && !row.notes) continue;

    // mini-header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 6, usableW, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(`Objective ${i + 1}`, margin + 4, y + 6);
    y += 20;

    // CPT + description + units side by side
    doc.setFont('helvetica', 'bold');
    doc.text('CPT:', margin, y);
    const cptDesc = row.cpt
      ? CPT_DESCRIPTIONS[row.cpt] || '(desc not found)'
      : '';
    doc.setFont('helvetica', 'normal');
    doc.text(`${row.cpt || '( )'} - ${cptDesc}`, margin + 30, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Units:', margin + 350, y);
    doc.setFont('helvetica', 'normal');
    doc.text(row.unit ? `x ${row.unit} unit(s)` : '( )', margin + 400, y);
    y += lineHeight;

    // Notes
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
  if (data.icdCodes && data.icdCodes.length) {
    data.icdCodes.forEach((code) => {
      const desc = ICD_DESCRIPTIONS[code] || '(desc not found)';
      doc.text(`- ${code}: ${desc}`, margin + 10, y);
      y += lineHeight;
      y = addPageIfNeeded(doc, y, margin);
    });
  } else {
    doc.text('(none selected)', margin + 10, y);
    y += lineHeight;
  }
  y += 6;

  // Total time & signature
  doc.setFont('helvetica', 'bold');
  doc.text('Total treatment time:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.totalTime || '(not set)', margin + 130, y);
  y += lineHeight + 6;
  doc.text(`Provider signature: ${data.signature || ''}`, margin, y);
  doc.text(`Date: ${data.signDate || ''}`, margin + 300, y);
  y += lineHeight;

  // Page number optional
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

// Preview button
previewBtn.addEventListener('click', () => {
  const d = collectData();
  const masked = d.patientName
    ? d.patientName.replace(/.(?=.{1,}$)/g, '*')
    : '(not set)';
  console.log('Preview (patient name masked):', masked, d);
  alert('Preview printed to console (open devtools).');
});
