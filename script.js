document.addEventListener('DOMContentLoaded', () => {
  const { jsPDF } = window.jspdf;
  const downloadBtn = document.getElementById('downloadBtn');

  const ICD_DESCRIPTIONS = {
    'F84.0': 'Autism Spectrum Disorder',
    'F82.0': 'Specific developmental disorder of motor function',
    'R27.9': 'Unspecified lack of coordination',
    'R41.840': 'Attention and Concentration Deficit',
    'F88.0': 'Developmental Disorder',
    'M62.89': 'Generalized Hypotonia',
    'M62.830': 'Low Muscle Tone',
    'Z74.1': 'Need for assistance with personal care',
    'Z73.4': 'Inadequate social skills',
    'R41.843': 'Perceptual Motor Deficit',
  };

  const CPT_DESCRIPTIONS = {
    97530: 'Therapeutic Activities',
    97535: 'Self-care training',
    97112: 'Neuromuscular re-education',
    97110: 'Therapeutic Exercises',
    97129: 'Cognitive Function Interventions',
  };

  function addPageIfNeeded(doc, y, margin, lineHeight = 14) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  }

  /* ---------------------------------------------------------
     DYNAMIC CPT BILLING SECTION (BASED ON OBJECTIVE CPTs)
  --------------------------------------------------------- */

  function updateCptBillingSection() {
    const objectiveRows = document.querySelectorAll('.objective-row');
    const usedCptCodes = new Set();

    // Collect selected CPTs from objectives
    objectiveRows.forEach((row) => {
      const cpt = row.querySelector('.cptSelect')?.value;
      if (cpt) usedCptCodes.add(cpt);
    });

    const sectionDiv = document.getElementById('autoCptSection');
    sectionDiv.innerHTML = ''; // clear old

    if (usedCptCodes.size === 0) {
      sectionDiv.innerHTML = `<div class="muted">(no CPT codes selected above)</div>`;
      return;
    }

    usedCptCodes.forEach((cpt) => {
      const desc = CPT_DESCRIPTIONS[cpt] || '(desc not found)';

      const html = `
        <div class="cpt-row">
          <label>${cpt} — ${desc}</label>

          <select class="unitSelect">
            <option value="">-- units --</option>
            <option value="1">1 unit</option>
            <option value="2">2 units</option>
            <option value="3">3 units</option>
            <option value="4">4 units</option>
          </select>

          <span class="unitMinutes">= 0 minutes</span>
        </div>
      `;

      sectionDiv.insertAdjacentHTML('beforeend', html);
    });

    // Add listeners for unit → minutes auto calculation
    sectionDiv.querySelectorAll('.unitSelect').forEach((select) => {
      select.addEventListener('change', (e) => {
        const units = Number(e.target.value);
        const minutes = units ? units * 15 : 0;

        const minutesSpan = e.target
          .closest('.cpt-row')
          .querySelector('.unitMinutes');
        minutesSpan.textContent = `= ${minutes} minutes`;
      });
    });
  }

  // Trigger update whenever Objective CPT changes
  document
    .querySelectorAll('.objective-row .cptSelect')
    .forEach((sel) => sel.addEventListener('change', updateCptBillingSection));

  updateCptBillingSection(); // initial load

  /* ---------------------------------------------------------
     PDF GENERATION
  --------------------------------------------------------- */

  downloadBtn.addEventListener('click', async () => {
    const patientName =
      prompt('Enter patient name for PDF (not stored online):', '')?.trim() ||
      'No Name';

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 40;
    let y = margin;
    const lineHeight = 14;
    const sectionSpacing = 10;
    const usableWidth = doc.internal.pageSize.getWidth() - margin * 2;

    function writeWrapped(doc, textArray, x, y, margin, lineHeight) {
      textArray.forEach((line) => {
        y = addPageIfNeeded(doc, y, margin, lineHeight);
        doc.text(line, x, y);
        y += lineHeight;
      });
      return y;
    }

    // Collect form fields
    const dob = document.getElementById('dob')?.value || '';
    const age = document.getElementById('age')?.value || '';
    const diagnosis = document.getElementById('diagnosis')?.value || '';
    const dateService = document.getElementById('dateService')?.value || '';
    const provider = document.getElementById('provider')?.value || '';
    const credentials = document.getElementById('credentials')?.value || '';
    const sessionDuration =
      document.getElementById('sessionDuration')?.value || '';
    const location = document.getElementById('location')?.value || '';
    const startTime = document.getElementById('startTime')?.value || '';
    const endTime = document.getElementById('endTime')?.value || '';

    const subjective = document.getElementById('subjective')?.value || '';
    const assessment = document.getElementById('assessment')?.value || '';
    const plan = document.getElementById('plan')?.value || '';
    const totalTime = document.getElementById('totalTime')?.value || '';
    const signature = document.getElementById('signature')?.value || '';
    const signDate = document.getElementById('signDate')?.value || '';

    // ICD codes
    const icdSelects = document.querySelectorAll('.icdSelect');
    const icdCodes = Array.from(icdSelects)
      .map((s) => s.value)
      .filter((v) => v);

    // Objective CPTs
    const objectiveRows = document.querySelectorAll('.objective-row');
    const objectives = Array.from(objectiveRows).map((row) => ({
      cpt: row.querySelector('.cptSelect')?.value || '',
      notes: row.querySelector('.objNotes')?.value || '',
    }));

    /* ---------- HEADER ---------- */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Sensabilities Occupational Therapy', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('OT Session Note', margin, y + 14);
    y += 36;

    /* ---------- PATIENT INFO ---------- */
    const infoPairs = [
      ['Patient:', patientName],
      ['DOB:', dob],
      ['Age:', age],
      ['Diagnosis:', diagnosis],
      ['Date of Service:', dateService],
      ['Start Time:', startTime],
      ['End Time:', endTime],
      ['Session Duration:', sessionDuration],
      ['Provider:', provider],
      ['Credentials:', credentials],
      ['Location:', location],
    ];

    infoPairs.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      const labelWidth = doc.getTextWidth(label + ' ');
      doc.setFont('helvetica', 'normal');
      doc.text(value || '(none)', margin + labelWidth, y);
      y += lineHeight;
    });
    y += sectionSpacing;

    /* ---------- SUBJECTIVE ---------- */
    doc.setFont('helvetica', 'bold');
    doc.text('SUBJECTIVE', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    y = writeWrapped(
      doc,
      doc.splitTextToSize(subjective || '(none)', usableWidth),
      margin,
      y,
      margin,
      lineHeight
    );
    y += sectionSpacing;

    /* ---------- OBJECTIVE ---------- */
    doc.setFont('helvetica', 'bold');
    doc.text('OBJECTIVE', margin, y);
    y += lineHeight;

    const colors = ['#dbeafe', '#fde68a', '#bbf7d0', '#fee2e2'];

    objectives.forEach((row, i) => {
      if (!row.cpt && !row.notes) return;

      doc.setFillColor(colors[i % colors.length]);
      doc.rect(margin - 5, y - 10, usableWidth + 10, 18, 'F');

      const cptKey = Number(row.cpt);
      const cptDesc = CPT_DESCRIPTIONS[cptKey] || '(desc not found)';

      // CPT line stays bold
      doc.setFont('helvetica', 'bold');
      doc.text(row.cpt ? `${row.cpt}: ${cptDesc}` : '(no CPT)', margin + 10, y);
      y += lineHeight;

      // FIX: set notes to normal weight before wrapping text
      doc.setFont('helvetica', 'normal');

      y = writeWrapped(
        doc,
        doc.splitTextToSize(row.notes || '(no notes)', usableWidth - 20),
        margin + 10,
        y,
        margin,
        lineHeight
      );
      y += sectionSpacing;
    });

    /* ---------- ASSESSMENT ---------- */
    doc.setFont('helvetica', 'bold');
    doc.text('ASSESSMENT', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    y = writeWrapped(
      doc,
      doc.splitTextToSize(assessment || '(none)', usableWidth),
      margin,
      y,
      margin,
      lineHeight
    );
    y += sectionSpacing;

    /* ---------- PLAN ---------- */
    doc.setFont('helvetica', 'bold');
    doc.text('PLAN', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    y = writeWrapped(
      doc,
      doc.splitTextToSize(plan || '(none)', usableWidth),
      margin,
      y,
      margin,
      lineHeight
    );
    y += sectionSpacing;

    /* ---------- ICD CODES ---------- */
    doc.setFont('helvetica', 'bold');
    doc.text('ICD CODES:', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    if (icdCodes.length) {
      icdCodes.forEach((code) => {
        const desc = ICD_DESCRIPTIONS[code] || '(desc not found)';
        y = writeWrapped(
          doc,
          [`- ${code}: ${desc}`],
          margin + 10,
          y,
          margin,
          lineHeight
        );
      });
    } else {
      y = writeWrapped(
        doc,
        ['(none selected)'],
        margin + 10,
        y,
        margin,
        lineHeight
      );
    }
    y += sectionSpacing;

    /* ---------- CPT BILLING (DYNAMIC) ---------- */
    doc.setFont('helvetica', 'bold');
    doc.text('CPT CODES:', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');

    const billingRows = document.querySelectorAll('#autoCptSection .cpt-row');

    if (billingRows.length) {
      billingRows.forEach((row) => {
        const labelText = row.querySelector('label').textContent;
        const cptValue = labelText.split(' ')[0];
        const unitsValue = row.querySelector('.unitSelect')?.value;

        const cptKey = Number(cptValue);
        const desc = CPT_DESCRIPTIONS[cptKey] || '(desc not found)';

        const minutes = unitsValue ? unitsValue * 15 : 0;
        const unitsText = unitsValue
          ? `x ${unitsValue} unit(s) = ${minutes} min`
          : '(no units selected)';

        const line = `- ${cptKey}: ${desc} | ${unitsText}`;
        y = writeWrapped(doc, [line], margin + 10, y, margin, lineHeight);
      });
    } else {
      y = writeWrapped(
        doc,
        ['(none selected)'],
        margin + 10,
        y,
        margin,
        lineHeight
      );
    }

    y += sectionSpacing;

    /* ---------- SIGNATURE ---------- */
    doc.setFont('helvetica', 'bold');
    doc.text('Total treatment time:', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.text(totalTime || '(not set)', margin + 95, y);
    y += lineHeight + 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Provider signature:', margin, y);
    doc.text('Date:', margin + 280, y);

    doc.setFont('helvetica', 'normal');
    doc.text(signature || '', margin + 90, y);
    doc.text(signDate || '', margin + 310, y);

    /* ---------- SAVE PDF ---------- */
    const safeName = patientName.replace(/[^a-z0-9_\-]/gi, '_');
    const fileName = `OT_session_${safeName}_${
      new Date().toISOString().split('T')[0]
    }.pdf`;

    doc.save(fileName);
  });
});
