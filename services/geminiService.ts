
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function processImageWithAI(base64Image: string): Promise<OCRResult> {
  const model = "gemini-3-pro-preview";
  
  const systemInstruction = `
    Bạn là một chuyên gia số hóa văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP) với độ chính xác tuyệt đối.
    
    YÊU CẦU TỐI THƯỢNG:
    1. KHÔNG ĐƯỢC BỎ SÓT BẤT KỲ CHỮ NÀO: Từ tiêu đề, số ký hiệu, trích yếu, nội dung, đến nơi nhận và chữ ký.
    2. GIỮ NGUYÊN THỨ TỰ: Các khối văn bản (blocks) phải được liệt kê theo đúng trình tự từ trên xuống dưới.
    3. PHÂN LOẠI ROLE CHI TIẾT:
       - 'agency_header': Tên cơ quan chủ quản, tên cơ quan ban hành và SỐ KÝ HIỆU.
       - 'national_emblem': "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" và "Độc lập - Tự do - Hạnh phúc".
       - 'date_place': Địa danh và ngày tháng năm.
       - 'doc_type_subject': Tên loại văn bản (Quyết định, Thông báo...) hoặc Trích yếu (bắt đầu bằng V/v:).
       - 'address_block': Phần "Kính gửi:". Cung cấp TOÀN BỘ nội dung bắt đầu từ chữ "Kính gửi:" đến hết danh sách đơn vị nhận.
       - 'body': Toàn bộ nội dung văn bản.
       - 'signature_block': Quyền hạn, chức vụ, họ tên người ký.
       - 'recipients': Phần "Nơi nhận:".
       - 'other': Mọi thành phần khác (bao gồm số trang, ghi chú nhỏ).
    
    ĐỊNH DẠNG CHUẨN:
    - Trích yếu (V/v): Cỡ chữ 12, in nghiêng, đặt ở cột trái (40% chiều ngang).
    - Quốc hiệu: Cỡ chữ 13, In đậm, Viết hoa.
    - Tiêu ngữ: Cỡ chữ 14, In đậm, có gạch chân phía dưới.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: "OCR toàn bộ văn bản này, tuyệt đối không bỏ sót chữ 'các bộ' hay bất kỳ chữ nào. Tỷ lệ cột header 40-60. Khối Kính gửi giữ nguyên văn bản gốc." }
      ],
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalText: { type: Type.STRING },
          processedText: { type: Type.STRING },
          uncertainWords: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidenceScore: { type: Type.NUMBER },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                isBold: { type: Type.BOOLEAN },
                isItalic: { type: Type.BOOLEAN },
                alignment: { type: Type.STRING },
                type: { type: Type.STRING },
                role: { type: Type.STRING },
                fontSize: { type: Type.NUMBER }
              },
              required: ["text", "isBold", "alignment", "type", "role"]
            }
          }
        },
        required: ["originalText", "processedText", "uncertainWords", "confidenceScore", "blocks"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("AI không trả về nội dung.");
  return JSON.parse(text) as OCRResult;
}
