
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { PageProcessResult, TextBlock } from '../types';

const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;

function createFormattedParagraph(block: TextBlock, uncertainWords: string[], options: { isBody?: boolean, customSize?: number, forceItalic?: boolean, forceIndent?: boolean, alignment?: AlignmentType, spacingBefore?: number, spacingAfter?: number } = {}) {
  const words = block.text.split(/(\s+)/);
  const children = words.map((word) => {
    const isUncertain = uncertainWords.some(uw => 
      word.toLowerCase().includes(uw.toLowerCase()) || 
      uw.toLowerCase().includes(word.toLowerCase())
    );

    return new TextRun({
      text: word,
      color: isUncertain ? "FF0000" : undefined,
      bold: block.isBold || isUncertain,
      italics: block.isItalic || options.forceItalic,
      size: options.customSize || (block.fontSize ? block.fontSize * 2 : 28), // Mặc định 14pt (28 half-points)
      font: "Times New Roman"
    });
  });

  let alignment = options.alignment || AlignmentType.LEFT;
  if (block.alignment === 'center') alignment = AlignmentType.CENTER;
  if (block.alignment === 'right') alignment = AlignmentType.RIGHT;
  if (block.alignment === 'both' || options.isBody) alignment = AlignmentType.JUSTIFIED;

  return new Paragraph({
    children,
    alignment,
    indent: options.forceIndent ? { firstLine: 708 } : undefined, // Thụt lề 1.27cm
    spacing: {
      line: 360, // 1.5 lines (240 is single, 360 is 1.5)
      before: options.spacingBefore || 0,
      after: options.spacingAfter || (options.isBody ? 120 : 0), // 120 twips = 6pt
    },
  });
}

export async function exportToWord(results: PageProcessResult[], fileName: string) {
  const sections = results.map((page) => {
    const blocks = page.data.blocks;
    const uncertain = page.data.uncertainWords;

    const headerRoles = ['agency_header', 'national_emblem', 'date_place'];
    const footerRoles = ['signature_block', 'recipients'];
    
    const agencyPart = blocks.filter(b => b.role === 'agency_header');
    const subjectPart = blocks.filter(b => b.role === 'doc_type_subject' && b.text.toLowerCase().startsWith('v/v'));
    const nationalPart = blocks.filter(b => b.role === 'national_emblem');
    const datePart = blocks.filter(b => b.role === 'date_place');

    const middleBlocks = blocks.filter(b => 
      !headerRoles.includes(b.role) && 
      !footerRoles.includes(b.role) && 
      !(b.role === 'doc_type_subject' && b.text.toLowerCase().startsWith('v/v'))
    );
    const footerBlocks = blocks.filter(b => footerRoles.includes(b.role));

    const content: any[] = [];

    // 1. Header Table (Tỷ lệ 40-60 chuẩn)
    content.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                ...agencyPart.map(b => createFormattedParagraph(b, uncertain, { customSize: 26, alignment: AlignmentType.CENTER })),
                ...subjectPart.map(b => createFormattedParagraph(b, uncertain, { customSize: 24, forceItalic: true, alignment: AlignmentType.CENTER }))
              ],
            }),
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              children: [
                ...nationalPart.map(b => createFormattedParagraph(b, uncertain, { customSize: 26, alignment: AlignmentType.CENTER })),
                ...datePart.map(b => createFormattedParagraph(b, uncertain, { customSize: 28, forceItalic: true, alignment: AlignmentType.CENTER }))
              ],
            }),
          ],
        }),
      ],
    }));

    // Khoảng cách tiêu chuẩn sau Header
    content.push(new Paragraph({ spacing: { before: 240 } }));

    // 2. Middle Content
    middleBlocks.forEach((block) => {
      // Xử lý Kính gửi
      if (block.role === 'address_block' || block.text.toLowerCase().includes('kính gửi')) {
        // Tách nhãn và nội dung
        const cleanText = block.text.replace(/^.*?kính\s+gửi:?\s*/i, '').trim();

        content.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ 
                    children: [new TextRun({ text: "Kính gửi:", font: "Times New Roman", size: 28, bold: true })],
                    indent: { left: 708 } 
                  })],
                }),
                new TableCell({
                  width: { size: 85, type: WidthType.PERCENTAGE },
                  children: cleanText.split('\n').map(line => new Paragraph({
                    children: [new TextRun({ text: line.trim(), font: "Times New Roman", size: 28 })],
                    alignment: AlignmentType.LEFT,
                    spacing: { line: 360, after: 60 }
                  })),
                }),
              ],
            }),
          ],
        }));
      } 
      else {
        const isBody = block.role === 'body';
        const isHeading = block.role === 'doc_type_subject';
        
        content.push(createFormattedParagraph(block, uncertain, { 
          isBody: isBody, 
          forceIndent: isBody,
          customSize: isHeading ? 30 : 28,
        }));
      }
    });

    // 3. Footer Table
    if (footerBlocks.length > 0) {
      const recPart = footerBlocks.filter(b => b.role === 'recipients');
      const sigPart = footerBlocks.filter(b => b.role === 'signature_block');

      content.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                children: recPart.map(b => createFormattedParagraph(b, uncertain, { customSize: 22 })),
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                children: sigPart.map(b => createFormattedParagraph(b, uncertain, { customSize: 28, alignment: AlignmentType.CENTER })),
              }),
            ],
          }),
        ],
      }));
    }

    return {
      properties: {
        page: {
          size: { width: A4_WIDTH, height: A4_HEIGHT },
          margin: { top: "0.79in", bottom: "0.79in", left: "1.18in", right: "0.59in" },
        },
      },
      children: content,
    };
  });

  const doc = new Document({
    sections,
    styles: {
      default: { document: { run: { font: "Times New Roman" } } },
    },
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.replace('.pdf', '')}_HanhChinh_Chuan.docx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
