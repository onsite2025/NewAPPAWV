import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { IVisit } from '@/models/Visit';
import { IPatient } from '@/models/Patient';
import { ITemplateResponse } from '@/models/Template';

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

interface GeneratePdfParams {
  visit: IVisit;
  patient: IPatient;
  template: ITemplateResponse;
  provider: {
    name: string;
    email: string;
  };
}

/**
 * Generate a PDF for a completed Annual Wellness Visit
 */
export async function generateVisitPdf({ visit, patient, template, provider }: GeneratePdfParams): Promise<Blob> {
  // Define document content
  const docDefinition: TDocumentDefinitions = {
    info: {
      title: `Annual Wellness Visit - ${patient.firstName} ${patient.lastName}`,
      author: provider.name,
      subject: 'Annual Wellness Visit Report',
      keywords: 'AWV, wellness, healthcare',
    },
    header: {
      text: 'Annual Wellness Visit Report',
      alignment: 'center',
      margin: [0, 10, 0, 20],
      fontSize: 16,
      bold: true,
    },
    footer: function(currentPage: number, pageCount: number) {
      return {
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: 'center',
        margin: [0, 10, 0, 10],
      };
    },
    content: [
      {
        text: 'Patient Information',
        style: 'sectionHeader',
      },
      {
        columns: [
          {
            width: '50%',
            text: [
              { text: 'Name: ', bold: true },
              `${patient.firstName} ${patient.lastName}\n`,
              { text: 'Date of Birth: ', bold: true },
              `${new Date(patient.dateOfBirth).toLocaleDateString()}\n`,
              { text: 'Gender: ', bold: true },
              `${patient.gender}\n`,
            ],
          },
          {
            width: '50%',
            text: [
              { text: 'Medical Record #: ', bold: true },
              `${patient.medicalRecordNumber || 'N/A'}\n`,
              { text: 'Phone: ', bold: true },
              `${patient.phone || 'N/A'}\n`,
              { text: 'Email: ', bold: true },
              `${patient.email || 'N/A'}\n`,
            ],
          },
        ],
        margin: [0, 5, 0, 15],
      },
      {
        text: 'Visit Information',
        style: 'sectionHeader',
      },
      {
        columns: [
          {
            width: '50%',
            text: [
              { text: 'Visit Date: ', bold: true },
              `${new Date(visit.scheduledDate).toLocaleDateString()}\n`,
              { text: 'Provider: ', bold: true },
              `${provider.name}\n`,
            ],
          },
          {
            width: '50%',
            text: [
              { text: 'Status: ', bold: true },
              `${visit.status}\n`,
              { text: 'Completed Date: ', bold: true },
              `${visit.completedAt ? new Date(visit.completedAt).toLocaleDateString() : 'N/A'}\n`,
            ],
          },
        ],
        margin: [0, 5, 0, 15],
      },
      {
        text: 'Assessment Results',
        style: 'sectionHeader',
      },
    ],
    styles: {
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 15, 0, 10],
        decoration: 'underline',
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: 'black',
        fillColor: '#f2f2f2',
      },
    },
  };

  // Add assessment results
  const assessmentContent: Content[] = [];
  
  if (visit.responses && visit.responses.length > 0) {
    template.sections.forEach((section) => {
      const sectionResponse = visit.responses.find(r => r.sectionId === section.id);
      
      if (sectionResponse) {
        // Add section title
        assessmentContent.push({
          text: section.title,
          style: { fontSize: 13, bold: true, margin: [0, 10, 0, 5] },
        });
        
        if (section.description) {
          assessmentContent.push({
            text: section.description,
            style: { fontSize: 11, italic: true, margin: [0, 0, 0, 5] },
          });
        }
        
        // Create a table for the questions and answers
        const tableBody: any[] = [
          [
            { text: 'Question', style: 'tableHeader' },
            { text: 'Response', style: 'tableHeader' },
          ],
        ];
        
        section.questions.forEach((question) => {
          const answer = sectionResponse.answers.find(a => a.questionId === question.id);
          if (answer) {
            let displayValue = '';
            
            // Format the answer value based on the question type
            if (question.type === 'multipleChoice' && question.options) {
              const option = question.options.find(o => o.value === answer.value);
              displayValue = option ? option.label : String(answer.value);
            } else if (question.type === 'boolean') {
              displayValue = answer.value === true ? 'Yes' : 'No';
            } else if (question.type === 'date' && answer.value) {
              displayValue = new Date(answer.value as string).toLocaleDateString();
            } else {
              displayValue = String(answer.value);
            }
            
            tableBody.push([
              { text: question.text, style: { fontSize: 11 } },
              { text: displayValue, style: { fontSize: 11 } },
            ]);
          }
        });
        
        // Add the table to the content
        if (tableBody.length > 1) {
          assessmentContent.push({
            table: {
              headerRows: 1,
              widths: ['60%', '40%'],
              body: tableBody,
            },
            layout: {
              fillColor: function(rowIndex: number) {
                return rowIndex === 0 ? '#f2f2f2' : null;
              },
            },
            margin: [0, 5, 0, 15],
          });
        } else {
          assessmentContent.push({
            text: 'No responses recorded for this section.',
            style: { fontSize: 11, italic: true },
            margin: [0, 0, 0, 10],
          });
        }
      }
    });
  } else {
    assessmentContent.push({
      text: 'No assessment responses recorded.',
      style: { fontSize: 11, italic: true },
    });
  }
  
  // Add the assessment content to the document
  docDefinition.content = [...docDefinition.content as Content[], ...assessmentContent];
  
  // Add health plan if available
  if (visit.healthPlan && visit.healthPlan.recommendations.length > 0) {
    docDefinition.content.push({
      text: 'Health Plan Recommendations',
      style: 'sectionHeader',
    });
    
    const healthPlanContent: Content[] = [];
    
    // Group recommendations by domain
    const domainGroups: { [key: string]: typeof visit.healthPlan.recommendations } = {};
    
    visit.healthPlan.recommendations.forEach((rec) => {
      if (!domainGroups[rec.domain]) {
        domainGroups[rec.domain] = [];
      }
      domainGroups[rec.domain].push(rec);
    });
    
    // Add each domain and its recommendations
    Object.keys(domainGroups).forEach((domain) => {
      healthPlanContent.push({
        text: domain,
        style: { fontSize: 13, bold: true, margin: [0, 10, 0, 5] },
      });
      
      const items = domainGroups[domain].map(rec => ({
        text: rec.text,
        style: { fontSize: 11 },
        margin: [0, 2, 0, 2],
      }));
      
      healthPlanContent.push({
        ul: items,
        margin: [10, 0, 0, 10],
      });
    });
    
    // Add summary if available
    if (visit.healthPlan.summary) {
      healthPlanContent.push({
        text: 'Summary',
        style: { fontSize: 13, bold: true, margin: [0, 10, 0, 5] },
      });
      
      healthPlanContent.push({
        text: visit.healthPlan.summary,
        style: { fontSize: 11 },
        margin: [0, 0, 0, 10],
      });
    }
    
    // Add health plan content to the document
    docDefinition.content = [...docDefinition.content as Content[], ...healthPlanContent];
  }
  
  // Add provider notes if available
  if (visit.notes) {
    docDefinition.content.push({
      text: 'Provider Notes',
      style: 'sectionHeader',
    });
    
    docDefinition.content.push({
      text: visit.notes,
      style: { fontSize: 11 },
      margin: [0, 5, 0, 15],
    });
  }
  
  // Generate the PDF as a blob
  return new Promise((resolve) => {
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.getBlob((blob: Blob) => {
      resolve(blob);
    });
  });
} 