
export type BlockRole = 
  | 'agency_header' // Tên cơ quan, số ký hiệu
  | 'national_emblem' // Quốc hiệu, tiêu ngữ
  | 'date_place' // Địa danh, ngày tháng
  | 'doc_type_subject' // Tên loại và trích yếu
  | 'address_block' // Phần Kính gửi
  | 'body' // Nội dung chính
  | 'signature_block' // Quyền hạn, chức vụ, chữ ký
  | 'recipients' // Nơi nhận
  | 'other';

export interface TextBlock {
  text: string;
  isBold: boolean;
  isItalic?: boolean;
  alignment: 'left' | 'center' | 'right' | 'both';
  type: 'paragraph' | 'heading' | 'list-item';
  role: BlockRole;
  fontSize?: number; // pt
}

export interface OCRResult {
  originalText: string;
  processedText: string;
  uncertainWords: string[]; 
  confidenceScore: number;
  blocks: TextBlock[];
}

export interface PageProcessResult {
  pageNumber: number;
  data: OCRResult;
  imageUrl: string;
}

export interface AppState {
  isProcessing: boolean;
  progress: number;
  results: PageProcessResult[];
  fileName: string | null;
}
