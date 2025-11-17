document.addEventListener('DOMContentLoaded', () => {
  const { jsPDF } = window.jspdf;
  const downloadBtn = document.getElementById('downloadBtn');

  const ICD_DESCRIPTIONS = {
    'F84.0': 'Autism Spectrum Disorder',
    'F82.0': 'Specific developmental disorder of motor function',
    'R27.9': 'Unspecified lack of coordination',
    'Z74.1': 'Need for assistance with personal care',
    'Z73.4': 'Inadequate social skills',
  };

  const CPT_DESCRIPTIONS = {
    97530: 'Therapeutic Activities',
    97535: 'Self-care training',
    97112: 'Neuromuscular re-education',
    97110: 'Therapeutic Exercises',
    97130: 'Cognitive Function Interventions',
  };

  function addPageIfNeeded(doc, y, margin, lineHeight = 14) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  }

  downloadBtn.addEventListener('click', async () => {
    // Prompt for patient name
    const patientName =
      prompt('Enter patient name for PDF (not stored online):', '')?.trim() ||
      'No Name';

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 40;
    let y = margin;
    const lineHeight = 14;
    const sectionSpacing = 10; // extra space between sections
    const usableWidth = doc.internal.pageSize.getWidth() - margin * 2;

    // Allows wrapped text to continue onto new pages automatically
    function writeWrapped(doc, textArray, x, y, margin, lineHeight) {
      textArray.forEach((line) => {
        y = addPageIfNeeded(doc, y, margin, lineHeight);
        doc.text(line, x, y);
        y += lineHeight;
      });
      return y;
    }

    // Collect form values
    const dob = document.getElementById('dob')?.value || '';
    const age = document.getElementById('age')?.value || '';
    const diagnosis = document.getElementById('diagnosis')?.value || '';
    const dateService = document.getElementById('dateService')?.value || '';
    const provider = document.getElementById('provider')?.value || '';
    const credentials = document.getElementById('credentials')?.value || '';
    const sessionDuration =
      document.getElementById('sessionDuration')?.value || '';
    const location = document.getElementById('location')?.value || '';
    const subjective = document.getElementById('subjective')?.value || '';
    const assessment = document.getElementById('assessment')?.value || '';
    const plan = document.getElementById('plan')?.value || '';
    const totalTime = document.getElementById('totalTime')?.value || '';
    const signature = document.getElementById('signature')?.value || '';
    const signDate = document.getElementById('signDate')?.value || '';

    // ICD Codes
    const icdSelects = document.querySelectorAll('.icdSelect');
    const icdCodes = Array.from(icdSelects)
      .map((s) => s.value)
      .filter((v) => v);

    // CPT from Objectives
    const objectiveRows = document.querySelectorAll('.objective-row');
    const objectives = Array.from(objectiveRows).map((row) => ({
      cpt: row.querySelector('.cptSelect')?.value || '',
      notes: row.querySelector('.objNotes')?.value || '',
    }));

    // --- HEADER ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Sensabilities Occupational Therapy', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('OT Session Note', margin, y + 14);
    y += 36;

    // --- PATIENT INFO ---
    const infoPairs = [
      ['Patient:', patientName],
      ['DOB:', dob],
      ['Age:', age],
      ['Diagnosis:', diagnosis],
      ['Date of Service:', dateService],
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

    // --- SUBJECTIVE ---
    doc.setFont('helvetica', 'bold');
    doc.text('SUBJECTIVE', margin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    const subjWrapped = doc.splitTextToSize(
      subjective || '(none)',
      usableWidth
    );
    y = writeWrapped(doc, subjWrapped, margin, y, margin, lineHeight);
    y += sectionSpacing;

    // --- OBJECTIVE ---
    doc.setFont('helvetica', 'bold');
    doc.text('OBJECTIVE', margin, y);
    y += lineHeight;
    const colors = ['#dbeafe', '#fde68a', '#bbf7d0', '#fee2e2'];

    objectives.forEach((row, i) => {
      if (!row.cpt && !row.notes) return;

      // colored box for visual separation
      doc.setFillColor(colors[i % colors.length]);
      doc.rect(margin - 5, y - 10, usableWidth + 10, 18, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const cptKey = Number(row.cpt);
      const cptDesc = CPT_DESCRIPTIONS[cptKey] || '(desc not found)';
      doc.text(row.cpt ? `${row.cpt}: ${cptDesc}` : '(no CPT)', margin + 10, y);
      y += lineHeight;

      const notesWrapped = doc.splitTextToSize(
        row.notes || '(no notes)',
        usableWidth - 20
      );
      y = writeWrapped(doc, notesWrapped, margin + 10, y, margin, lineHeight);
      y += sectionSpacing;
    });

    // --- ASSESSMENT ---
    doc.setFont('helvetica', 'bold');
    doc.text('ASSESSMENT', margin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    const assessWrapped = doc.splitTextToSize(
      assessment || '(none)',
      usableWidth
    );
    y = writeWrapped(doc, assessWrapped, margin, y, margin, lineHeight);
    y += sectionSpacing;

    // --- PLAN ---
    doc.setFont('helvetica', 'bold');
    doc.text('PLAN', margin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    const planWrapped = doc.splitTextToSize(plan || '(none)', usableWidth);
    y = writeWrapped(doc, planWrapped, margin, y, margin, lineHeight);
    y += sectionSpacing;

    // --- ICD CODES ---
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

    // --- CPT CODES ---
    doc.setFont('helvetica', 'bold');
    doc.text('CPT CODES:', margin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    if (objectives.some((o) => o.cpt)) {
      objectives.forEach((row) => {
        if (!row.cpt) return;
        const cptKey = Number(row.cpt);
        const desc = CPT_DESCRIPTIONS[cptKey] || '(desc not found)';
        const unitsText = row.unit ? `x${row.unit} unit(s)` : '(no units)';

        const line = `- ${row.cpt}: ${desc} | ${unitsText}`;
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

    // --- TOTAL & SIGNATURE ---
    doc.setFont('helvetica', 'bold');
    doc.text('Total treatment time:', margin, y);
    doc.setFont('helvetica', 'normal');
    // Place the value closer to the label
    doc.text(totalTime || '(not set)', margin + 95, y);
    y += lineHeight + 8; // small vertical space before signature

    // Provider signature and date in bold
    doc.setFont('helvetica', 'bold');
    doc.text('Provider signature:', margin, y);
    doc.text('Date:', margin + 300, y);

    // Signature values in normal font, placed close to labels
    doc.setFont('helvetica', 'normal');
    doc.text(signature || '', margin + 95, y);
    doc.text(signDate || '', margin + 330, y);

    // --- SAVE PDF ---
    const safeName = patientName.replace(/[^a-z0-9_\-]/gi, '_');
    const fileName = `OT_session_${safeName}_${
      new Date().toISOString().split('T')[0]
    }.pdf`;
    doc.save(fileName);
  });
});
